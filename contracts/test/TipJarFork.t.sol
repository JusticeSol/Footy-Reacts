// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TipJar} from "../src/TipJar.sol";

interface IFiatToken {
    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function name() external view returns (string memory);
    function version() external view returns (string memory);
}

/// The unit tests run against MockUSDC. This runs the same gasless tip against
/// Circle's real USDC on a Monad testnet fork, which is what would catch the
/// mock disagreeing with the token — a different EIP-712 domain, say.
///
///   forge test --match-contract TipJarFork --fork-url monad_testnet
contract TipJarForkTest is Test {
    address constant USDC = 0x534b2f3A21130d7a60830c2Df862319e593943A3;
    bytes32 constant RECEIVE_TYPEHASH = keccak256(
        "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    function test_gaslessTipAgainstRealUsdc() public {
        if (block.chainid != 10143) vm.skip(true);

        uint256 fanKey = 0xF4;
        address fan = vm.addr(fanKey);
        TipJar jar = new TipJar(IERC20(USDC), makeAddr("verifier"), address(this));
        deal(USDC, fan, 5_000_000);

        bytes32 creatorKey = keccak256("UCpHumbIRd4VuwfRtc6YXGBQ");
        bytes32 takeKey = keccak256("dQw4w9WgXcQ");
        uint256 validBefore = block.timestamp + 1 hours;
        bytes32 nonce = jar.tipNonce(creatorKey, takeKey, "salt");

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                IFiatToken(USDC).DOMAIN_SEPARATOR(),
                keccak256(abi.encode(RECEIVE_TYPEHASH, fan, address(jar), 3_000_000, 0, validBefore, nonce))
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(fanKey, digest);

        vm.prank(makeAddr("relayer"));
        jar.tipWithAuthorization(creatorKey, takeKey, fan, 3_000_000, 0, validBefore, "salt", v, r, s);

        assertEq(IERC20(USDC).balanceOf(address(jar)), 3_000_000);
        assertEq(jar.pending(creatorKey, fan), 3_000_000);
        emit log_named_string("token name", IFiatToken(USDC).name());
        emit log_named_string("token version", IFiatToken(USDC).version());
    }
}
