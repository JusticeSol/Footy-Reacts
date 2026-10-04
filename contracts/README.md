# TipJar

Fan-to-creator tips for Footy Reacts, settled in USDC on Monad. See the header
comment in `src/TipJar.sol` for the model. In short:

- tips are gasless (EIP-3009)
- tips for unclaimed creators are held
- creators claim with a verifier attestation
- fans can get a refund after 90 days

## Setup

`lib/` is not committed. Install the dependencies once:

```bash
forge install foundry-rs/forge-std --no-git
forge install OpenZeppelin/openzeppelin-contracts@v5.4.0 --no-git
```

## Test

```bash
forge test                                                      # unit tests, MockUSDC
forge test --match-contract TipJarFork --fork-url monad_testnet # against Circle's real USDC
```

## Deploy (Monad testnet)

```bash
VERIFIER_ADDRESS=0x... forge script script/Deploy.s.sol \
  --rpc-url monad_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

Then put the printed address and block in the app's `.env.local`, as
`TIPJAR_ADDRESS` and `TIPJAR_DEPLOY_BLOCK`.
