// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// The half of USDC's EIP-3009 surface this contract uses. `receive` rather
/// than `transfer`: it requires msg.sender to be the payee, so a signed
/// authorization can only ever be spent by this contract, not raced to by a
/// third party.
interface IERC3009 {
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

/**
 * Fan-to-creator tips for Footy Reacts.
 *
 * Creators are keyed by keccak256 of their YouTube channel id and takes by
 * keccak256 of the video id — public, stable ids, so anyone can check a tip
 * against the video it was for without knowing our database.
 *
 * Most creators have never heard of the site, so a tip to one who has not
 * claimed is held here rather than sent anywhere. A creator claims by proving
 * channel ownership to our verifier, which signs an attestation; until then,
 * every tipper can take their own money back once REFUND_AFTER has passed.
 * Holding money in someone's name with no way out for the fan would not be
 * acceptable, so the refund is not optional.
 *
 * Tips arrive gasless: the fan signs a USDC ReceiveWithAuthorization and any
 * relayer submits it. The authorization's nonce is derived from the creator
 * and take, so the signature itself fixes where the money goes — a relayer
 * that changes either produces a nonce the fan never signed and USDC rejects it.
 */
contract TipJar is Ownable, EIP712 {
    using SafeERC20 for IERC20;

    uint256 public constant REFUND_AFTER = 90 days;

    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(bytes32 creatorKey,address payout,uint256 nonce,uint256 deadline)");

    IERC20 public immutable usdc;

    /// Signs claim attestations after the off-chain channel-ownership check.
    address public verifier;

    /// Zero until the creator claims; tips then go straight here.
    mapping(bytes32 creatorKey => address) public payoutOf;
    /// Held for an unclaimed creator, per tipper, so each can be refunded.
    mapping(bytes32 creatorKey => mapping(address tipper => uint256)) public pending;
    /// Sum of `pending` for a creator — what a claim sweeps in one transfer.
    mapping(bytes32 creatorKey => uint256) public pendingTotal;
    /// Refund clock, restarted by each new tip from the same fan.
    mapping(bytes32 creatorKey => mapping(address tipper => uint256)) public lastTipAt;
    /// Stops an old attestation being replayed to point payouts back somewhere.
    mapping(bytes32 creatorKey => uint256) public claimNonce;

    event Tipped(
        bytes32 indexed creatorKey, bytes32 indexed takeKey, address indexed from, uint256 value, bool held
    );
    event Claimed(bytes32 indexed creatorKey, address payout, uint256 swept);
    event Refunded(bytes32 indexed creatorKey, address indexed tipper, uint256 value);
    event VerifierChanged(address verifier);

    error ZeroAmount();
    error ZeroAddress();
    error AlreadyClaimed();
    error ClaimExpired();
    error BadAttestation();
    error NothingToRefund();
    error RefundNotYet(uint256 availableAt);

    constructor(IERC20 usdc_, address verifier_, address owner_) Ownable(owner_) EIP712("FootyReactsTipJar", "1") {
        if (address(usdc_) == address(0) || verifier_ == address(0)) revert ZeroAddress();
        usdc = usdc_;
        verifier = verifier_;
        emit VerifierChanged(verifier_);
    }

    // --- tipping ----------------------------------------------------------

    /// The nonce a fan must sign for a given tip. Exposed so clients build it
    /// exactly as the contract checks it.
    function tipNonce(bytes32 creatorKey, bytes32 takeKey, bytes32 salt) public pure returns (bytes32) {
        return keccak256(abi.encode(creatorKey, takeKey, salt));
    }

    /// Gasless path: `from` signed a USDC ReceiveWithAuthorization to this
    /// contract; whoever submits it pays the gas.
    function tipWithAuthorization(
        bytes32 creatorKey,
        bytes32 takeKey,
        address from,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 salt,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        if (value == 0) revert ZeroAmount();
        IERC3009(address(usdc)).receiveWithAuthorization(
            from, address(this), value, validAfter, validBefore, tipNonce(creatorKey, takeKey, salt), v, r, s
        );
        _settle(creatorKey, takeKey, from, value);
    }

    /// Direct path for a wallet that holds gas and has approved this contract.
    function tip(bytes32 creatorKey, bytes32 takeKey, uint256 value) external {
        if (value == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), value);
        _settle(creatorKey, takeKey, msg.sender, value);
    }

    function _settle(bytes32 creatorKey, bytes32 takeKey, address from, uint256 value) private {
        address payout = payoutOf[creatorKey];
        if (payout != address(0)) {
            usdc.safeTransfer(payout, value);
        } else {
            pending[creatorKey][from] += value;
            pendingTotal[creatorKey] += value;
            lastTipAt[creatorKey][from] = block.timestamp;
        }
        emit Tipped(creatorKey, takeKey, from, value, payout == address(0));
    }

    // --- claiming -----------------------------------------------------------

    /// Sets where a creator's tips go and sweeps everything held for them.
    /// Anyone may submit it; only the verifier's signature makes it valid.
    function claim(bytes32 creatorKey, address payout, uint256 deadline, bytes calldata signature) external {
        if (payout == address(0)) revert ZeroAddress();
        if (payoutOf[creatorKey] != address(0)) revert AlreadyClaimed();
        _consumeAttestation(creatorKey, payout, deadline, signature);
        payoutOf[creatorKey] = payout;

        // Per-tipper `pending` entries are left as they are: refunds require
        // an unclaimed creator, so after this they can never be drawn again.
        uint256 swept = pendingTotal[creatorKey];
        pendingTotal[creatorKey] = 0;
        if (swept > 0) usdc.safeTransfer(payout, swept);

        emit Claimed(creatorKey, payout, swept);
    }

    /// Owner correction for a payout address — e.g. a creator lost their
    /// wallet. Needs a fresh attestation, so the owner alone cannot redirect.
    function reassign(bytes32 creatorKey, address payout, uint256 deadline, bytes calldata signature)
        external
        onlyOwner
    {
        if (payout == address(0)) revert ZeroAddress();
        _consumeAttestation(creatorKey, payout, deadline, signature);
        payoutOf[creatorKey] = payout;
        emit Claimed(creatorKey, payout, 0);
    }

    function _consumeAttestation(bytes32 creatorKey, address payout, uint256 deadline, bytes calldata signature)
        private
    {
        if (block.timestamp > deadline) revert ClaimExpired();
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(CLAIM_TYPEHASH, creatorKey, payout, claimNonce[creatorKey], deadline))
        );
        if (ECDSA.recover(digest, signature) != verifier) revert BadAttestation();
        claimNonce[creatorKey] += 1;
    }

    // --- refunds ------------------------------------------------------------

    /// A fan takes back what they tipped a creator who never claimed.
    function refund(bytes32 creatorKey) external {
        if (payoutOf[creatorKey] != address(0)) revert AlreadyClaimed();
        uint256 amount = pending[creatorKey][msg.sender];
        if (amount == 0) revert NothingToRefund();
        uint256 availableAt = lastTipAt[creatorKey][msg.sender] + REFUND_AFTER;
        if (block.timestamp < availableAt) revert RefundNotYet(availableAt);

        pending[creatorKey][msg.sender] = 0;
        pendingTotal[creatorKey] -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit Refunded(creatorKey, msg.sender, amount);
    }

    // --- admin --------------------------------------------------------------

    function setVerifier(address verifier_) external onlyOwner {
        if (verifier_ == address(0)) revert ZeroAddress();
        verifier = verifier_;
        emit VerifierChanged(verifier_);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
