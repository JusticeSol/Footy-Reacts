---
workflow: general-video
flow: automation
storyboard: no
message: "Footy Reacts now shows official highlights: every weekend goal in one place, and every match's highlights straight from the clubs and broadcasters."
destination: social
aspect: 1080x1920
language: en
audience: football fans on X, TikTok and YouTube Shorts
length: 22s
angle: product teaser
---

## Intent

A short vertical teaser for the highlights launch (2026-10-16), made for phones,
where nearly all visitors are. The site is shown inside a phone frame,
scrolling and tapping through the board and one match page.

## Rules

- **No match footage plays anywhere.** Premier League footage is the league's
  and its broadcasters'; putting it inside our own promo would be re-using it.
  The site's thumbnails and "Official · embedded from YouTube" labels carry the
  story instead.
- The screens are real captures of the live site in iPhone emulation, not
  mock-ups (`scripts/capture.mjs`). They and the music are git-ignored.

## Assets

- assets/shots/: board and Man Utd v Spurs, captured by `scripts/capture.mjs`.
- assets/voice/: six HeyGen lines, voice "Jonah" (same as the Metropolis videos).
- assets/bgm/: a HeyGen library track (`audio_request.json` has the query),
  trimmed to `teaser-bed.wav` with fades and carved under the voice.
