// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {TipJar} from "../src/TipJar.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract TipJarTest is Test {
    MockUSDC usdc;
    TipJar jar;

    uint256 fanKey = 0xF4;
    uint256 verifierKey = 0xBEEF;
    address fan;
    address verifierAddr;
    address owner = makeAddr("owner");
    address relayer = makeAddr("relayer");
    address creatorWallet = makeAddr("creatorWallet");

    bytes32 creatorKey = keccak256("UCpHumbIRd4VuwfRtc6YXGBQ");
    bytes32 otherCreator = keccak256("UCsomeoneElse");
    bytes32 takeKey = keccak256("dQw4w9WgXcQ");

    uint256 constant THREE_DOLLARS = 3_000_000;

    function setUp() public {
        vm.warp(1_760_000_000);
        fan = vm.addr(fanKey);
        verifierAddr = vm.addr(verifierKey);
        usdc = new MockUSDC();
        jar = new TipJar(IERC20(address(usdc)), verifierAddr, owner);
        usdc.mint(fan, 20_000_000);
    }

    // --- helpers -------------------------------------------------------------

    function _authSig(bytes32 ck, bytes32 tk, uint256 value, bytes32 salt)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        bytes32 structHash = keccak256(
            abi.encode(
                usdc.RECEIVE_WITH_AUTHORIZATION_TYPEHASH(),
                fan,
                address(jar),
                value,
                uint256(0),
                block.timestamp + 1 hours,
                jar.tipNonce(ck, tk, salt)
            )
        );
        return vm.sign(fanKey, keccak256(abi.encodePacked("\x19\x01", usdc.DOMAIN_SEPARATOR(), structHash)));
    }

    function _tip(bytes32 ck, uint256 value, bytes32 salt) internal {
        (uint8 v, bytes32 r, bytes32 s) = _authSig(ck, takeKey, value, salt);
        vm.prank(relayer);
        jar.tipWithAuthorization(ck, takeKey, fan, value, 0, block.timestamp + 1 hours, salt, v, r, s);
    }

    function _attest(uint256 signerKey, bytes32 ck, address payout, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Claim(bytes32 creatorKey,address payout,uint256 nonce,uint256 deadline)"),
                ck,
                payout,
                jar.claimNonce(ck),
                deadline
            )
        );
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(signerKey, keccak256(abi.encodePacked("\x19\x01", jar.domainSeparator(), structHash)));
        return abi.encodePacked(r, s, v);
    }

    function _claim() internal {
        uint256 deadline = block.timestamp + 1 days;
        jar.claim(creatorKey, creatorWallet, deadline, _attest(verifierKey, creatorKey, creatorWallet, deadline));
    }

    // --- tipping ---------------------------------------------------------------

    function test_tipToUnclaimedCreatorIsHeld() public {
        vm.expectEmit(address(jar));
        emit TipJar.Tipped(creatorKey, takeKey, fan, THREE_DOLLARS, true);
        _tip(creatorKey, THREE_DOLLARS, "a");

        assertEq(usdc.balanceOf(address(jar)), THREE_DOLLARS);
        assertEq(jar.pending(creatorKey, fan), THREE_DOLLARS);
        assertEq(jar.pendingTotal(creatorKey), THREE_DOLLARS);
        assertEq(usdc.balanceOf(relayer), 0, "relayer never touches funds");
    }

    function test_tipToClaimedCreatorGoesStraightThrough() public {
        _claim();
        vm.expectEmit(address(jar));
        emit TipJar.Tipped(creatorKey, takeKey, fan, THREE_DOLLARS, false);
        _tip(creatorKey, THREE_DOLLARS, "a");

        assertEq(usdc.balanceOf(creatorWallet), THREE_DOLLARS);
        assertEq(usdc.balanceOf(address(jar)), 0);
    }

    function test_relayerCannotRedirectTipToAnotherCreator() public {
        (uint8 v, bytes32 r, bytes32 s) = _authSig(creatorKey, takeKey, THREE_DOLLARS, "a");
        vm.prank(relayer);
        vm.expectRevert("FiatTokenV2: invalid signature");
        jar.tipWithAuthorization(otherCreator, takeKey, fan, THREE_DOLLARS, 0, block.timestamp + 1 hours, "a", v, r, s);
    }

    function test_relayerCannotChangeAmount() public {
        (uint8 v, bytes32 r, bytes32 s) = _authSig(creatorKey, takeKey, THREE_DOLLARS, "a");
        vm.prank(relayer);
        vm.expectRevert("FiatTokenV2: invalid signature");
        jar.tipWithAuthorization(creatorKey, takeKey, fan, 10_000_000, 0, block.timestamp + 1 hours, "a", v, r, s);
    }

    function test_signedTipCannotBeReplayed() public {
        (uint8 v, bytes32 r, bytes32 s) = _authSig(creatorKey, takeKey, THREE_DOLLARS, "a");
        jar.tipWithAuthorization(creatorKey, takeKey, fan, THREE_DOLLARS, 0, block.timestamp + 1 hours, "a", v, r, s);
        vm.expectRevert("FiatTokenV2: authorization is used or canceled");
        jar.tipWithAuthorization(creatorKey, takeKey, fan, THREE_DOLLARS, 0, block.timestamp + 1 hours, "a", v, r, s);
    }

    function test_zeroTipRejected() public {
        vm.expectRevert(TipJar.ZeroAmount.selector);
        jar.tip(creatorKey, takeKey, 0);
    }

    function test_directTipWithApproval() public {
        vm.startPrank(fan);
        usdc.approve(address(jar), THREE_DOLLARS);
        jar.tip(creatorKey, takeKey, THREE_DOLLARS);
        vm.stopPrank();
        assertEq(jar.pending(creatorKey, fan), THREE_DOLLARS);
    }

    // --- claiming --------------------------------------------------------------

    function test_claimSweepsEverythingHeld() public {
        _tip(creatorKey, THREE_DOLLARS, "a");
        _tip(creatorKey, 1_000_000, "b");

        vm.expectEmit(address(jar));
        emit TipJar.Claimed(creatorKey, creatorWallet, 4_000_000);
        _claim();

        assertEq(usdc.balanceOf(creatorWallet), 4_000_000);
        assertEq(jar.pendingTotal(creatorKey), 0);
        assertEq(jar.payoutOf(creatorKey), creatorWallet);
    }

    function test_claimFromWrongSignerRejected() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory forged = _attest(0xBAD, creatorKey, creatorWallet, deadline);
        vm.expectRevert(TipJar.BadAttestation.selector);
        jar.claim(creatorKey, creatorWallet, deadline, forged);
    }

    function test_attestationForOneAddressCannotClaimToAnother() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _attest(verifierKey, creatorKey, creatorWallet, deadline);
        vm.expectRevert(TipJar.BadAttestation.selector);
        jar.claim(creatorKey, makeAddr("thief"), deadline, sig);
    }

    function test_expiredAttestationRejected() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _attest(verifierKey, creatorKey, creatorWallet, deadline);
        vm.warp(deadline + 1);
        vm.expectRevert(TipJar.ClaimExpired.selector);
        jar.claim(creatorKey, creatorWallet, deadline, sig);
    }

    function test_cannotClaimTwice() public {
        _claim();
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _attest(verifierKey, creatorKey, makeAddr("other"), deadline);
        vm.expectRevert(TipJar.AlreadyClaimed.selector);
        jar.claim(creatorKey, makeAddr("other"), deadline, sig);
    }

    function test_reassignNeedsOwnerAndFreshAttestation() public {
        _claim();
        address newWallet = makeAddr("newWallet");
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _attest(verifierKey, creatorKey, newWallet, deadline);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(this)));
        jar.reassign(creatorKey, newWallet, deadline, sig);

        vm.prank(owner);
        jar.reassign(creatorKey, newWallet, deadline, sig);
        assertEq(jar.payoutOf(creatorKey), newWallet);

        // The original claim attestation's nonce is spent; it cannot point it back.
        vm.prank(owner);
        vm.expectRevert(TipJar.BadAttestation.selector);
        jar.reassign(creatorKey, newWallet, deadline, sig);
    }

    // --- refunds ---------------------------------------------------------------

    function test_refundBlockedBeforeWindow() public {
        _tip(creatorKey, THREE_DOLLARS, "a");
        vm.warp(block.timestamp + 89 days);
        vm.prank(fan);
        vm.expectRevert(abi.encodeWithSelector(TipJar.RefundNotYet.selector, block.timestamp + 1 days));
        jar.refund(creatorKey);
    }

    function test_refundAfterWindowReturnsMoney() public {
        _tip(creatorKey, THREE_DOLLARS, "a");
        uint256 before = usdc.balanceOf(fan);
        vm.warp(block.timestamp + 90 days);
        vm.prank(fan);
        jar.refund(creatorKey);

        assertEq(usdc.balanceOf(fan), before + THREE_DOLLARS);
        assertEq(jar.pending(creatorKey, fan), 0);
        assertEq(jar.pendingTotal(creatorKey), 0);
    }

    function test_refundBlockedOnceCreatorClaims() public {
        _tip(creatorKey, THREE_DOLLARS, "a");
        _claim();
        vm.warp(block.timestamp + 91 days);
        vm.prank(fan);
        vm.expectRevert(TipJar.AlreadyClaimed.selector);
        jar.refund(creatorKey);
    }

    function test_cannotRefundSomeoneElsesTip() public {
        _tip(creatorKey, THREE_DOLLARS, "a");
        vm.warp(block.timestamp + 91 days);
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(TipJar.NothingToRefund.selector);
        jar.refund(creatorKey);
    }

    function test_refundThenClaimSweepsOnlyWhatRemains() public {
        _tip(creatorKey, THREE_DOLLARS, "a");
        vm.warp(block.timestamp + 90 days);
        vm.prank(fan);
        jar.refund(creatorKey);

        _tip(creatorKey, 1_000_000, "b");
        _claim();
        assertEq(usdc.balanceOf(creatorWallet), 1_000_000);
        assertEq(usdc.balanceOf(address(jar)), 0, "jar holds nothing it cannot pay out");
    }

    // --- admin -----------------------------------------------------------------

    function test_onlyOwnerSetsVerifier() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(this)));
        jar.setVerifier(address(1));
        vm.prank(owner);
        jar.setVerifier(address(1));
        assertEq(jar.verifier(), address(1));
    }
}
