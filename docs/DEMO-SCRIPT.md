# Technical demo video — script

**What it is:** the working product, used live, end to end. It is not slides,
not a promo, and not a code walkthrough.

**Length:** about 2:30. Unhurried. A judge should be able to read every screen.

**What HyperFrames adds:** a light layer over your real screen recordings.

- a 3-second title card and a 6-second end card
- captions that name what is happening
- callouts and zooms on small proof: transaction hashes, addresses, the
  "From" field

Nothing is mocked up. Every product shot is a recording of the demo URL.

**Demo URL:** https://footyreacts-monad.vercel.app

---

## Before you record

- Use **Chrome, 1920×1080, zoom 100%**. Close other tabs, and hide the
  bookmarks bar (Ctrl+Shift+B).
- Make the cursor easy to follow: move slowly, and pause about a second on
  anything you click.
- Wait for each page, and especially each **explorer page**, to load fully
  before moving on. Dead time is fine; HyperFrames trims it.
- Open a second window in **Incognito** (Ctrl+Shift+N) for Take 1. A
  signed-out fan with an empty account shows the real first-time flow:
  sign-in, test money, tip.
- **Check that `@FootyReactss` still shows $3 waiting** on `/claim`. If it
  doesn't, ask Claude to send another test tip.
- No voiceover while recording. It is added afterwards, so you can just
  click.

---

## Take 1: a fan tips a take (incognito, about 90 seconds of footage)

| # | Do this | Caption on screen (added later) |
| --- | --- | --- |
| 1.1 | Open the demo URL. Pause on the fixture board, then scroll slowly. | **Every take on every match, organised by fixture.** Live data: 27 creators, 70 fixtures |
| 1.2 | Click **FUL 1–1 MUN**. Pause on the score and the Pre/Post tabs. | One page per match |
| 1.3 | Scroll to the **Most supported** strip, then down through the take cards. | Real creators' YouTube reactions, embedded, never re-hosted |
| 1.4 | On a take *not* in Most supported, click **Support →**. The $1 / $3 / $5 buttons appear. | **Tip a take in dollars** |
| 1.5 | Click **$3**. Privy's sign-in opens: enter an email, then type the code from your inbox. | Sign in with email — no wallet, no seed phrase |
| 1.6 | The card says **Out of test money**. Click **Add $5 & send**. | Testnet: the demo tops up new fans with test USDC |
| 1.7 | Wait for **"Sent $3 to …"**, and for **"$3 tipped"** under the card. | **Settled on Monad** |
| 1.8 | Click **receipt**. The explorer opens. Let it load and pause. Slowly hover **To** (the TipJar contract), then **From** (the relayer), then the **USDC transfer** line. | **To: TipJar** `0xAd17…E386` · **From: our relayer**, so the fan paid no gas · **USDC moved from the fan → TipJar** |
| 1.9 | Go back to the match page and refresh. The take now appears in **Most supported**. | Best-backed takes rise to the top, one per creator |

## Take 2: a creator collects (your normal browser, about 60 seconds)

| # | Do this | Caption on screen |
| --- | --- | --- |
| 2.1 | Click **Creators** in the red header. The `/claim` page opens. | Most creators haven't joined yet, so **tips wait for them** |
| 2.2 | Type `@FootyReactss` and click **Find it**. Pause on the card: name, avatar, **"$3 waiting for you"**. | Held in TipJar, keyed to the YouTube channel |
| 2.3 | Click **copy** next to the `FOOTY-…` code. Click **YouTube Studio**, paste the code into the channel description, and click **Publish**. | **Proof of ownership:** only the channel's owner can edit its description |
| 2.4 | Back on the claim page, click **"I've added it — collect $3"**. Sign in if asked. Wait for **"$3 is yours"**. | Our verifier signs; the relayer submits the claim |
| 2.5 | Click **receipt**. On the explorer, pause on the transaction calling **claim** on TipJar. | **Everything held, swept to the creator in one transaction** |
| 2.6 | Click **see it in your account →**. Pause on the balance and history. | The creator's balance, read from the chain. Future tips go straight here |

## Take 3: the contract (about 15 seconds)

| # | Do this | Caption on screen |
| --- | --- | --- |
| 3.1 | Open `https://testnet.monadexplorer.com/address/0xAd171119f441fCF94A20129545B73c201D47E386`. Show its **Contract** tab with the **verified source**, and scroll a little. | **TipJar: verified on Monad testnet.** Gasless tips (EIP-3009), held tips, verifier-signed claims, refunds after 90 days |

Afterwards, delete the code from the YouTube description.

---

## The edit

| Time | Shot | Voiceover |
| --- | --- | --- |
| 0:00–0:03 | **Title card:** the logo, "Footy Reacts — fan tips on Monad" | — |
| 0:03–0:20 | Take 1.1–1.3 | "Footy Reacts gathers every football creator's reaction video and organises them by match. This is live data: twenty-seven creators, every fixture." |
| 0:20–0:50 | Take 1.4–1.7 | "Now fans can tip the takes they agree with. Pick an amount, sign in with an email, and that's it. No wallet, no gas. This is testnet, so a new fan gets five dollars of test USDC." |
| 0:50–1:10 | Take 1.8 | "Here's the receipt on the Monad explorer. The fan signed a USDC authorisation. Our relayer submitted it to the TipJar contract and paid the gas, so the fan never needed MON. The three dollars went from the fan into TipJar, in under a second." |
| 1:10–1:20 | Take 1.9 | "And the best-backed takes rise to the top of the match page." |
| 1:20–1:35 | Take 2.1–2.2 | "Most creators haven't heard of us yet, so TipJar holds their tips, keyed to their YouTube channel. Here, three dollars are waiting." |
| 1:35–2:00 | Take 2.3–2.5 | "To collect, the creator puts a code in their channel description, which only the owner can do. Our verifier checks it and signs, the relayer submits the claim, and everything held is swept to them in one transaction." |
| 2:00–2:12 | Take 2.6 | "It shows in their account, and every future tip goes straight there. Fans can take back tips a creator never claims, after ninety days." |
| 2:12–2:24 | Take 3.1 | "The contract is verified on Monad testnet. It does gasless tips, held tips, signed claims, and refunds." |
| 2:24–2:30 | **End card:** the demo URL, the TipJar address, "Built on Monad · Metropolis" | — |

The voiceover is about 230 words, which fits 2:30 at a calm pace. Record your
own (it usually lands better with judges), or let HyperFrames generate it with
text-to-speech.

## Where to put the recordings

Put the files in `videos/metropolis-demo/clips/`, named `take1`, `take2` and
`take3` (any common format: .mp4, .mov or .webm). One long file per take is
ideal; HyperFrames cuts out the waits.
