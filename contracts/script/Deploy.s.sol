// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TipJar} from "../src/TipJar.sol";

/// Deploys TipJar against Circle USDC on Monad testnet.
///
///   forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast \
///     --private-key $DEPLOYER_PRIVATE_KEY
///
/// VERIFIER_ADDRESS is the public address of VERIFIER_PRIVATE_KEY in the app's
/// .env.local. The deployer becomes owner unless OWNER_ADDRESS is set.
contract Deploy is Script {
    address constant MONAD_TESTNET_USDC = 0x534b2f3A21130d7a60830c2Df862319e593943A3;

    function run() external {
        address usdc = vm.envOr("USDC_ADDRESS", MONAD_TESTNET_USDC);
        address verifier = vm.envAddress("VERIFIER_ADDRESS");

        vm.startBroadcast();
        address owner = vm.envOr("OWNER_ADDRESS", msg.sender);
        TipJar jar = new TipJar(IERC20(usdc), verifier, owner);
        vm.stopBroadcast();

        console.log("TipJar   ", address(jar));
        console.log("USDC     ", usdc);
        console.log("verifier ", verifier);
        console.log("owner    ", owner);
        console.log("block    ", block.number);
    }
}
