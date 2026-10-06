---
workflow: general-video
flow: automation
storyboard: yes
message: "Footy Reacts is a live product where fans tip football creators' takes in dollars, settled gaslessly on Monad, and creators collect what is held for them."
destination: youtube
aspect: 1920x1080
language: en
audience: Metropolis hackathon judges (Consumer Products & Payments track)
length: 150s
angle: technical demo
---

## Intent

The **technical demo video** for the Metropolis submission. The form asks for
"the working product, not slides or a code walkthrough", so this is real
screen recordings of the live demo URL, cut down to about 2:30. HyperFrames
adds only a light layer: a title card, captions that name what is happening,
callouts and zooms on the onchain proof (TipJar as recipient, the relayer as
sender, the USDC transfer, the claim sweep), and an end card. The full shot
list, captions and voiceover are in `../../docs/DEMO-SCRIPT.md`.

It is uploaded to YouTube as Unlisted on the Footy Reacts channel, and the
link goes in the submission form.

## Assets

- clips/take 1.mp4 — a fan tips (incognito): board → match page → Support → $3 → email sign-in → "Out of test money" → Add $5 & send → Sent → explorer receipt → Most supported. 5:19, 1880×942, 30fps, no audio.
- clips/take 2.mp4 — a creator collects: /claim → @FootyReactss → $3 waiting → code into YouTube Studio → collect → "$3 is yours" → claim receipt → Account. 5:30, same format.
- clips/take 3.mp4 — TipJar on the Monad explorer with verified source. 2:01, same format.
- ../../brand/mark.svg, ../../brand/lockup.svg, ../../brand/lockup-onred.svg — the Footy Reacts mark and wordmark, for the title and end cards.
- ../../src/app/fonts/ — Anton, Work Sans, Space Mono (woff2), the site's faces.

## Customizations

- AI voiceover of the script's narration (~230 words), timed to the edit.
- A very quiet, calm music bed under the voice ("the voice alone might be too boring"), carved under the narration.
- Captions sit in the cream band below the footage, not over it: the recordings are wider than 16:9, and the product must stay uncovered.
- Callouts and zooms on small proof details (tx hash, From/To, the USDC transfer line).

## Notes

- Reuse the Coral design spec from `../footy-reacts-promo/frame.md`: same red, ink, cream and Anton as the site and the logo.
- No mocked-up UI and no code walkthrough. Every product shot is footage.
- The 13 minutes of takes include waits, page loads and the email-code step: trim them, never speed up the onchain moments so they become unreadable.
- Do not show the full email address used to sign in, if it is visible in the footage.
