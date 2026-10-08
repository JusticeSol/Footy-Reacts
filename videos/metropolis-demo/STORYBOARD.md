---
format: 1920x1080
duration: 150s
message: "Footy Reacts is a live product where fans tip football creators' takes in dollars, settled gaslessly on Monad, and creators collect what is held for them."
arc: Product → Tip → Onchain proof → Held tips → Claim → Onchain proof → Contract
audience: Metropolis hackathon judges (Consumer Products & Payments)
mode: collaborative
version: 1
---

# Metropolis technical demo — storyboard v1

## Decisions

- **Message:** a working product, not a pitch: a fan tips in dollars, the chain
  proves it, and a creator collects.
- **Format:** 1920×1080, ~2:34, AI voiceover, a very quiet calm music bed,
  English.
- **Spine — "the screen in a frame":** every product beat is the real
  recording, scaled to 1800×902, on a cream (`#F4F1EA`) stage with a 1px ink
  rule. The 158px band beneath it is the **caption rail**: one Anton line plus
  one Space Mono proof line. The footage is never covered except by callouts
  that point *into* it.
- **Watermark:** the recorder's "Screenpresso" stamp, bottom-right of every
  clip, is covered by a small red Footy Reacts mark badge pinned to that
  corner of the screen frame.
- **Brand:** `frame.md` (Coral): red `#D5202A`, ink `#16130F`, cream `#F4F1EA`;
  Anton display, Work Sans body, Space Mono chrome. Zero shadow; zero radius
  except the logo.
- **Proof treatment:** onchain moments get a slow push-in (1.0→1.6, 1.2s,
  power2.inOut) onto the explorer row, then a red outline box with a Space Mono
  tag. Push-outs reverse it.
- **Speed:** page loads and scrolls are trimmed or run at 1.5–2×. Onchain
  readouts and tip states always play at 1×.
- **Privacy cuts:** the email typing (T1 2:00–2:42), the confirmation code
  screen, and the whole Google sign-in (T2 0:55–3:28) are never shown.
- **Bans:** no mocked-up UI, no code walkthrough, no slides between beats, no
  glow, no stock footage, no full-frame text cards except the open and close.
- **Held frame:** frame 07's From/To callout holds 3s with nothing moving, so
  the line "the fan never needed MON" lands.
- **Truthfulness:** every product shot is the recording of the live demo URL on
  6 Oct 2026. The amounts, addresses and transactions are real Monad testnet
  transactions.

## Changes from v1

- 2026-10-06: the user approved the plan as written ("I approve of the plan.
  And I'll go with what you've given me"), choosing the recommended option:
  **sketches first**. Next is review-loop § 2: draw every frame's layout as a
  cell of `storyboard.html` (real copy, the Coral treatment, plain blocks for
  footage), mark frames `built`, and pause for the user to confirm the sheet.
- 2026-10-06, sketch pass (`storyboard.html` v1, all 15 frames `built`). The
  footage blocks are real stills from the takes (`.hyperframes/sketch/`), none
  inside the email ranges. Changes made while drawing, for the user to confirm:
  - Frame 06 source corrected to T1 2:52–3:12: "Sent" first shows at 3:07, so
    the planned 2:55–3:08 would have cut on it.
  - Frames 04 and 06 push in to 2.2×, not 1.5×: at 1.5× the card-footer text
    (≈10px in the recording) is still unreadable at 1080p.
  - Watermark cover is a coral corner wedge (a right triangle, ~236×140) with
    the mark, not a square badge: the Screenpresso page-curl is triangular.
  - Callout tags: ink block, cream Space Mono 24px, 8px coral left bar; the box
    is a 5px coral outline. The rail is Anton 58px plus Space Mono 28px, with
    the act and frame number at right in coral.
  - Frame 03 proof line shortened to fit the rail; frame 08 gains a tag.
  - Privacy: T1 2:40–2:41 is the code screen, which prints the email in full;
    it sits inside the cut range, and frame 05 resumes at 2:43.

## Still open

- Exact in/out points are refined at build from the contact strips in
  `.hyperframes/sheets/`.

## Built (2026-10-06)

The compositions are now the truth; this table is regenerated from them. Cut
points, zooms, callouts and captions live in one table in
`scripts/build-frames.mjs`, which writes frames 02–14 and `index.html`
(frames 01 and 15 are hand-written). Re-carve the bed after regenerating.

| # | frame | start–end | dur | source |
|---|---|---|---|---|
| 01 | title | 0:00–0:03 | 3s | graphic |
| 02 | board | 0:03–0:12 | 9s | T1 0:05 ×1.6 |
| 03 | match | 0:12–0:22 | 10s | T1 0:38 ×1.8 |
| 04 | support | 0:22–0:28.5 | 6.5s | T1 1:33–1:36.5, 1:51.5–1:54.5 · push 2.2× |
| 05 | sign in | 0:28.5–0:35.9 | 7.4s | T1 1:56–1:59, 2:44–2:49.5 ×1.25 (privacy jump) |
| 06 | send | 0:35.9–0:48.9 | 13s | T1 2:59–3:12 · push 2.2× |
| 07 | receipt | 0:48.9–1:06.9 | 18s | T1 3:25 ×2 (load), 3:51–4:04.5 · push 1.6×, 4 callouts |
| 08 | most | 1:06.9–1:13.9 | 7s | T1 5:04–5:11 |
| 09 | wait | 1:13.9–1:26.4 | 12.5s | T2 0:06 ×3, 0:28.5–0:33.5 |
| 10 | proof | 1:26.4–1:37.4 | 11s | T2 0:40–0:44, 3:44 ×2 (privacy jump) |
| 11 | collect | 1:37.4–1:44.4 | 7s | T2 4:05.5–4:12.5 |
| 12 | claim tx | 1:44.4–1:54.4 | 10s | T2 4:31–4:34, held still of 4:45.5 · push 1.5× + pan |
| 13 | account | 1:54.4–2:06.4 | 12s | T2 5:14–5:26 |
| 14 | contract | 2:06.4–2:17.4 | 11s | T3 0:34.5–0:39.5, 0:45–0:51 |
| 15 | end | 2:17.4–2:23.4 | 6s | graphic |

**Final length: 2:23.4 (143.4s)** against the 150s brief. Voice: HeyGen
"Jonah — Clear & Professional", 13 lines, 81.3s. Frame 07 was cut from 22s to
18s (its voice ends at 14.6s); frame 12 from 13s to 10s. Frame 13's voiceover
also says "In this demo, one test account played both fan and creator."
Music: HeyGen catalogue track looped to a 150s bed (`assets/bgm/bed.wav`), at
0.07 and carved against the `voiceover` group.

## Locked

- 2026-10-06: the user confirmed the sketch sheet ("we are good to go"),
  including the 2.2× push-ins, the frame 06 source fix and the corner wedge.
- Frame 13 states it plainly: "demo: one test account played fan and creator"
  (the user's choice).

## Frame 01 — Title

- src: compositions/frames/01-title.html
- scene: Red ground; the on-red lockup centred; "FAN TIPS ON MONAD" in Space Mono beneath
- duration: 3s
- transition_in: cut
- status: animated
- voiceover: —
- source: none (graphic)

The lockup scales 0.96→1 with a fade (0.5s, power3.out). The tagline tracks in
0.3s later. The seam out is a hard cut to the board, on the voiceover's first
word.

## Frame 02 — The board

- src: compositions/frames/02-board.html
- scene: Fixture board for matchday 5, scrolling
- duration: 9s
- transition_in: cut
- status: animated
- voiceover: "Footy Reacts gathers every football creator's reaction video and organises it by match."
- source: T1 0:05–0:20 at 1.6×
- caption: "EVERY TAKE ON EVERY MATCH — ORGANISED BY FIXTURE" / "live: 27 creators · 70 fixtures · 214 takes"

Why: establishes that this is a real, live product before any payment appears.

## Frame 03 — The match page

- src: compositions/frames/03-match.html
- scene: Fulham 1–1 Man United; scroll through the take grid
- duration: 10s
- transition_in: cut
- status: animated
- voiceover: "This is live data. Real creators' YouTube reactions, embedded, never re-hosted."
- source: T1 0:38–0:56 at 1.8×
- caption: "ONE PAGE PER MATCH" / "embedded, never re-hosted · creators keep their views"

## Frame 04 — Support, $3

- src: compositions/frames/04-support.html
- scene: First card's footer: Support → $1 / $3 / $5 → $3 clicked
- duration: 6s
- transition_in: cut
- status: animated
- voiceover: "Now fans can tip the takes they agree with."
- source: T1 1:35–1:39 + 1:45–1:48 (hover trimmed)
- caption: "TIP A TAKE IN DOLLARS" / "$1 · $3 · $5"
- motion: push-in 1.0→2.2 on the card footer (origin ~43% / 77% of the recording)

## Frame 05 — Sign in

- src: compositions/frames/05-signin.html
- scene: Privy "Sign in to support creators", then "Creating your wallet", then "All set!"
- duration: 7s
- transition_in: cut (privacy jump: 1:59 → 2:43)
- status: animated
- voiceover: "Sign in with an email. A wallet is created behind it — the fan never sees the word."
- source: T1 1:56–1:59, then 2:43–2:50
- caption: "SIGN IN WITH EMAIL" / "no wallet setup · no seed phrase · Privy embedded wallet"

## Frame 06 — Top-up and send

- src: compositions/frames/06-send.html
- scene: "Out of test money · Add $5 & send" → "Adding test money…" → "Sending $3…" → "Sent $3 to The United Stand · receipt", "$3 tipped"
- duration: 13s
- transition_in: cut
- status: animated
- voiceover: "It's testnet, so a new fan gets five dollars of test USDC. Then the tip goes through — about seven seconds from click to confirmed."
- source: T1 2:52–3:12 at 1× ("Out of test money" 2:52, "Adding" 3:01, "Sending" 3:04, "Sent" 3:07)
- caption: "SENT — SETTLED ON MONAD" / "click → confirmed onchain in ~7s"
- motion: push-in 1.0→2.2 on the footer row (origin ~36% / 77%), held through the "Sent" state

## Frame 07 — The tip receipt (proof)

- src: compositions/frames/07-receipt.html
- scene: MonadVision transaction: Success · TipWithAuthorization; From 0x9Fb8…7645; To 0xAd17…E386; 3 USDC 0xeF63…2e20 → 0xAd17…E386
- duration: 22s
- transition_in: cut
- status: animated
- voiceover: "Here's the receipt on Monad's explorer. The fan only signed a USDC authorisation. Our relayer submitted it to the TipJar contract and paid the gas — the fan never needed MON. And three dollars moved from the fan into TipJar."
- source: T1 3:20–3:36 at 2× (loading), then 3:38–4:24 at 1× (trimmed to the hovers)
- callouts, in order: "METHOD: TIPWITHAUTHORIZATION" (status row) → "FROM: OUR RELAYER — PAID THE GAS" (From) → "TO: TIPJAR" (To) → "3 USDC: FAN → TIPJAR" (ERC20 row)
- caption: "THE FAN PAID NO GAS" / "EIP-3009 authorisation · relayed · Monad testnet"
- held: the From/To pair holds 3s

## Frame 08 — Most supported

- src: compositions/frames/08-most.html
- scene: Back on the match page after a refresh; Most supported now shows The United Stand at #1 with "$3 from 1 fan"
- duration: 7s
- transition_in: cut
- status: animated
- voiceover: "The best-backed takes rise to the top of the match — one per creator."
- source: T1 5:03–5:12
- caption: "MOST SUPPORTED" / "beside the list, never re-sorting it · one per creator"
- callout: "#1 · $3 FROM 1 FAN", right of the outlined strip
- motion: red outline on the strip

## Frame 09 — Tips wait for creators

- src: compositions/frames/09-wait.html
- scene: /claim: "Collect your tips" → @FootyReactss → channel card "$3 waiting for you"
- duration: 12s
- transition_in: cut
- status: animated
- voiceover: "Most creators haven't heard of us yet, so TipJar holds their tips, keyed to their YouTube channel. Here, three dollars are waiting."
- source: T2 0:01–0:34 at 2× (typing), hold 0:30–0:34 at 1×
- caption: "TIPS WAIT FOR CREATORS" / "held in TipJar, keyed to the channel id"

## Frame 10 — Proof of ownership

- src: compositions/frames/10-proof.html
- scene: The FOOTY- code copied → YouTube Studio description with the code → "Changes published"
- duration: 11s
- transition_in: cut (privacy jump over the Google sign-in)
- status: animated
- voiceover: "To collect, the creator puts a one-off code in their channel description — something only the owner can do."
- source: T2 0:38–0:46, then 3:42–3:58
- caption: "PROOF OF OWNERSHIP" / "code in the channel description — only the owner can edit it"

## Frame 11 — Collect

- src: compositions/frames/11-collect.html
- scene: "I've added it — collect $3" → "$3 is yours"
- duration: 7s
- transition_in: cut
- status: animated
- voiceover: "Our verifier checks it and signs. The relayer submits the claim."
- source: T2 4:04–4:14
- caption: "$3 IS YOURS" / "verifier signs · relayer submits · no gas for the creator"

## Frame 12 — The claim receipt (proof)

- src: compositions/frames/12-claimtx.html
- scene: MonadVision claim tx: ERC20 0xAd17…E386 → 0xeF63…2e20 for 3 USDC; Input data claim(bytes32,address,uint256,bytes)
- duration: 13s
- transition_in: cut
- status: animated
- voiceover: "Everything held is swept to the creator in one transaction."
- source: T2 4:28–4:50
- callouts: "3 USDC: TIPJAR → CREATOR" (ERC20 row) → "CLAIM(…)" (input data)
- caption: "HELD TIPS, SWEPT IN ONE TRANSACTION" / "claim · Monad testnet"

## Frame 13 — Account

- src: compositions/frames/13-account.html
- scene: Your Account: balance $5, history
- duration: 7s
- transition_in: cut
- status: animated
- voiceover: "It shows in their account, and every future tip goes straight there. Fans can take back tips that are never claimed, after ninety days."
- source: T2 5:12–5:25
- caption: "BALANCE, READ FROM THE CHAIN" / "demo: one test account played fan and creator"

## Frame 14 — The contract

- src: compositions/frames/14-contract.html
- scene: TipJar address page: creator 0x9Fb8…7645, transactions Claim / TipWithAuthorization → Contract tab: "Contract Source Code Verified"
- duration: 13s
- transition_in: cut
- status: animated
- voiceover: "The TipJar contract is verified on Monad testnet: gasless tips, held tips, signed claims, and refunds."
- source: T3 0:15–0:24, then 0:38–0:52
- callouts: "CLAIM · TIPWITHAUTHORIZATION — REAL CALLS" (txn list) → "SOURCE VERIFIED" (Contract tab)
- caption: "TIPJAR — VERIFIED ON MONAD TESTNET" / "0xAd17…E386"

## Frame 15 — End card

- src: compositions/frames/15-end.html
- scene: Cream ground; lockup; demo URL; TipJar address; "BUILT ON MONAD · METROPOLIS 2026"
- duration: 6s
- transition_in: cut
- status: animated
- voiceover: —
- source: none (graphic)

The lines settle in sequence (0.25s stagger, power3.out), then hold. It is not
a static end card: the badge mark ticks in last.

**Total:** 3+9+10+6+7+13+22+7+12+11+7+13+7+13+6 = **146s** (2:26). The
voiceover is ~230 words, about 2:20 at a calm pace; the real voice duration
will set the final cut.
