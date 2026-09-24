---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "Every take on every match, in one place"
destination: x-feed
aspect: 1080x1080
language: en
length: 60s
angle: chaos-to-order
narration: yes
---

## Intent

A promo for Footy Reacts (https://footy-reacts.vercel.app/) — a site that
aggregates football creators' post-match reaction videos, organized by fixture,
embedding them so every view still counts on the creator's own channel.

The concept the user chose, from a pitch round, is **"The whistle, then the
flood"**: one frozen full-time scoreline held a beat too long, then takes pile in
from every edge until the frame can't hold them, and they snap into the fixture
list that organizes them. Matchday energy with a spine — cacophony resolving into
order, which is the product's actual claim rather than a description of it.

Audience: Premier League fans who already follow reaction channels. Tone is
terrace-adjacent, fast, confident — not corporate SaaS.

Deliverables: a 60s master, plus a 30s cutdown for feed posting.

## Assets

- ../../src/data/seed.json — the product's real teams, fixtures, and creator
  handles; the flood is built from genuine names, not invented ones.

## Customizations

- Cut the takes' pile-in to a music bed's beat grid — the flood's rhythm is the
  whole effect, and it gives the muted-autoplay viewer a reason to unmute.
- Flood density capped at ~7 legible cards in the foreground, with further
  density implied by depth and blur. Integration check: at phone-sized 1:1,
  twenty cards become unreadable.
- Close on the creator line — "it never re-hosts; every view counts on the
  creator's own channel" — the site's stated differentiator.
- After the 60s master is approved, cut a 30s feed version from the same timeline.

## Notes

- The flood -> fixture-list snap uses a standard hard cut on a beat. The shader
  transition was offered as a challenger and declined on render cost.
- Design preset deliberately deferred to after capture, so the look is judged
  with the real brand colors and fonts remixed in.
- Anti-pattern to avoid: the generic SaaS promo (cursor tour over UI, upbeat
  synth, feature bullets, logo CTA) and the stock-football-montage-with-drum-build.
