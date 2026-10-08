# Footy Reacts — tip the take, not the platform

**Metropolis · Consumer Products & Payments**

- **Demo:** https://footyreacts-monad.vercel.app
- **Code:** https://github.com/JusticeSol/Footy-Reacts/tree/monad-hackathon
- **TipJar contract (Monad testnet, verified):** [`0xAd171119f441fCF94A20129545B73c201D47E386`](https://testnet.monadexplorer.com/address/0xAd171119f441fCF94A20129545B73c201D47E386)

## The problem

After every Premier League match, dozens of fan creators post their reaction on
YouTube. A Spurs fan who wants every take on Saturday's game has to search
channel by channel. When a take nails it, the only thing the fan can give back
is a like.

## What Footy Reacts is

Footy Reacts organises match reactions **by fixture rather than by creator**:
one page per match, with every creator's pre-match and post-match take on it.

It is live, built in this hackathon's window (first commit 18 September):

- 27 creators covering 19 of 20 Premier League clubs
- 214 published takes across 70 fixtures
- ingestion that polls YouTube and tags each upload to its fixture and phase,
  using heuristics plus Claude to veto bad matches

Videos are always embedded, never re-hosted. Creators keep their views and
their YouTube revenue.

## What we built on Monad

**Fans can tip any take, in dollars, in two taps.**

1. Tap **Support** on a take, and pick $1, $3 or $5.
2. Sign in with email or Google. Privy creates an embedded wallet behind it,
   and the fan never sees the word.
3. The fan signs a USDC transfer authorization (EIP-3009). Our relayer submits
   it to **TipJar** on Monad, and pays the gas. The fan never holds MON.
4. It settles in under a second. The card's total updates, a **receipt** link
   goes to the explorer, and the match page's **Most supported** strip ranks
   the best-backed takes.

The money rail is invisible, as the track asks: no wallet, no gas, no chain
name on screen, just "Sent $3 to AFTV".

**Most creators have never heard of us, so tips wait for them.** TipJar holds a
tip for a creator who hasn't joined, keyed to their YouTube channel. To
collect, a creator:

1. puts a one-off code in their channel description, which only the channel's
   owner can do
2. signs in

Our verifier signs an attestation, the relayer submits the claim, and
everything held is swept to them in one transaction. Every later tip goes
straight to them. If a creator never claims, **each fan can take their own tip
back after 90 days**. We think holding money in someone's name with no exit
would be wrong.

An **Account** page shows a fan's or creator's balance and history. It also
lets them move the money anywhere, through Privy's own key-export screen.

## Why Monad

- **Tips are small.** On a $1 tip, fees and confirmation time are the whole
  experience. Monad settles it before the fan has scrolled to the next take,
  and the relayer's gas cost is a fraction of a cent.
- **Matchday traffic arrives in bursts.** Every reaction lands within an hour
  of full time, and parallel execution suits that shape.
- **It's EVM.** We used Circle's native USDC with EIP-3009, OpenZeppelin, and
  Foundry, with nothing Monad-specific to work around. The one thing we did
  design for: Monad charges the **gas limit**, not gas used, so every relayed
  transaction is simulated before it is sent.

## How it's built

| Piece | What it does |
| --- | --- |
| `contracts/src/TipJar.sol` | Holds tips by channel, claims with a verifier signature, refunds after 90 days |
| EIP-3009 relay (`/api/tips`) | The fan signs; the relayer pays gas. The nonce is derived from the creator and take, so a relayer **cannot redirect** a tip |
| Claim flow (`/claim`) | Channel-description code, then verifier signature, then a relayed claim. Any YouTube channel can claim |
| Tip cache | Postgres stores a tip only after its event is confirmed, keyed by tx hash and log index. `tips:reconcile` rebuilds it from the chain |
| Privy | Email/Google sign-in, embedded wallets, key export |

**Tests:**

- 19 Foundry unit tests: tampering, replays, forged and expired attestations,
  and refunds.
- A fork test that runs a gasless tip against Circle's real USDC on Monad
  testnet.
- An end-to-end tip and claim, both onchain.

## Honest limits

- **Testnet.** Tips use Circle's testnet USDC, and a "get $5 test money"
  button tops fans up. The contract and code are mainnet-ready; it's a
  configuration change.
- **The verifier is trusted.** Claims rest on our server checking the channel
  description and signing. That's fine for a launch; the next step is an
  oracle or zkTLS proof of channel ownership.
- **Tipping lives on this branch.** The public site stays tips-off until
  creators have been told about it, and until it can run on mainnet.

## What's next

Mainnet USDC; memberships (a season's support for a creator); match-day pots
that split one tip across every creator on a fixture; and onboarding the 27
creators already on the site.
