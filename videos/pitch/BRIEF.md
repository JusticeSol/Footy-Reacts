---
workflow: general-video
flow: automation
storyboard: no
message: "Justice, a solo builder and Manchester United fan, built Footy Reacts so fans can find every reaction to their match in one place and pay the creators who make them, directly, on Monad."
destination: youtube
aspect: 1920x1080
language: en
audience: Metropolis hackathon judges (Consumer Products & Payments track)
length: 120s
angle: founder pitch
---

## Intent

The Metropolis **pitch video**: "introduce your team, the problem you solve,
and why you are building it", up to two minutes. Separate from the technical
demo (`../metropolis-demo/`).

Justice is the whole team and chose not to appear on camera, so the spine is
his own recorded voice over designed visuals and short clips of the demo.

## Assets

- recordings/*.mp4: Justice's five voice takes (intro, problem, what it
  does, why, close). Git-ignored. He read the script freely, about 3:00 of
  speech, so the approved cut keeps the substance and speeds the read up 13%
  (pitch kept): `work/plan.mjs` (selection) → `work/narration.mjs` →
  `assets/voice/narration.wav` (1:57.8) + `work/words.json` (word timings).
  The recordings, the narration and `work/` (his transcripts) are git-ignored:
  his voice stays out of the public repo, so a rebuild needs them locally.
- clips/t1.mp4, t2.mp4: hard links to the demo's re-encoded takes.
- assets/bgm/bed.wav: the demo's music bed (git-ignored).
- assets/brand, assets/fonts: copied from the demo.

## Customizations

- Captions of his words run in the bottom band throughout, corrected for
  mishearings only (Footy Reacts, take, Monad, doom-scrolling) and the closing
  line, which is "Footy Reacts. Tip the take, not the platform."
- Graphics sync to named words: each platform chip pops on the word.
- No club crest or third-party logos: platforms and the club are named in type.

## Notes

- Same Coral design as the demo (`../metropolis-demo/frame.md`).
- Dropped from the read: "over 200 takes for matchday 5 alone" (inaccurate:
  214 takes span 70 fixtures).
