---
format: 1080x1080
duration: 60s
message: "Every take on every match, in one place"
arc: PAS — Full time → the flood → the hunt → the snap → the board → one fixture → the creator line
audience: Premier League fans who already follow reaction channels
mode: collaborative
music: energetic percussive build
---

## Video direction

One camera, one film. The ground is cream `#F4F1EA` for frames 01–06 and inverts
to ink `#16130F` only for 07 — that inversion is the video's single biggest
visual event and nothing else may compete with it. Exactly one red `#D5202A`
accent per frame; a frame with two reds is a bug.

Rhythm is deliberately uneven: 01 is near-still, 02–03 are the busiest stretch in
the video, 04 lands hard then holds, 05–06 travel steadily, 07 resolves and
stops. Held beats are allocated at 01 (scenes 3), 04 (scene 3) and 07 (scene 4) —
the video must not read as uniformly busy.

Motion feel: long-tail settles, no bounce. Nothing drifts or breathes during a
hold; stillness is a choice here, not an absence. Type is Anton for anything
large, Space Mono 700 for chrome, Work Sans only where a full sentence runs.

Bans, video-wide: no browser chrome outside frames 05–06 (where it is an
intentional UI reconstruction), no scrollbars, no bokeh, no gradient except the
135° coral region, no radius, no shadow.

## Changes from v1

Verbatim, from the sketch review:

> "01 should be ful 1-1 mum, 02 replace redeem tv with adikastakes, replace fulhamish with kombo's diary, 04 should be ful 1-1 mun, bou 0-1 liv, lee 0-0 cry, mci 5-3 sun, bha 3-0 ars, eve 1-0 ips, 06 should be ful 1-1 mun"

Applied: frames 01, 04 and 06 carry FUL 1—1 MUN; frame 04's six results are the
real ones above; frame 02 swaps The Redmen TV for AdikasTakes and Fulhamish for
Kombo's Diary. Consequence applied without being asked: frame 02's voiceover
named Fulhamish, which is no longer on screen, so the spoken third name became
Kombo's Diary here and in SCRIPT.md.

## Still open

- Frame 06 still lists Fulhamish among the five takes for FUL—MUN. The swap was
  scoped to frame 02, so it stays until told otherwise.

## Locked

Sketch sheet v2 confirmed. Locked at this pass: every frame's layout, copy,
hierarchy and brand treatment as drawn in `storyboard.html`. The build dresses
these layouts and adds motion — it does not redraw them.

Corrected at Step 4: `asset_candidates` originally named `og-image.png` on
frames 01, 02, 03 and 07 and `full-page.png` on 04. Those five frames are pure
typography and consume no captured imagery, so carrying a candidate they would
never place was a Step 3 error. Only 05 and 06 consume the capture.

## Frame 1 — Full time

- scene: One frozen full-time scoreline, held a beat too long, in silence
- duration: 6s   # voice 3.788s + designed hold
- poster: 4s
- transition_in: cut
- status: animated
- type: hook
- persuasion: Tension by withholding
- beat: the whistle
- blueprint: titlecard-reveal (Reproduce)
- registry: titlecard-lockup (component)
- sfx: whistle-single, room-tone-tail
- handoff_out: scoreline group — x 50%, y 47%, scale 1.0, opacity 1.0, motion static (0 px/s) at the cut
- src: compositions/frames/01-full-time.html

Cold open on the whistle. FUL 1 — 1 MUN, 16:30, in Anton on cream, with the mono
kickoff beneath. Near-still — exactly one restrained move, then a hold that runs
two seconds longer than is comfortable. The stillness is the setup: a feed viewer
expects noise and gets a held breath. Nothing about the product yet.

Scene 1 (0.0–1.4s): scoreline already seated dead-center at t=0 — nothing enters. The wallpaper "90" sits behind at 10% ink as the background layer; the red rule draws outward from center beneath the scoreline → `svg-path-draw`. Centered, primary ~55% of canvas, 3 depth layers (wallpaper numeral · scoreline · kicker).
Scene 2 (1.4–2.6s): on the spoken "Full time.", the mono kicker `16:30 · FULL TIME` fades up under the rule → `discrete-text-sequence`. Nothing else moves; the scoreline does not react.
Scene 3 (2.6–6.0s): held read. No camera, no drift, no breathing — the second VO sentence lands into stillness and the frame simply sits. At most a low-amplitude jitter on the scoreline → `sine-wave-loop` (low-amplitude register). This hold is the frame's payload; do not fill it.

## Frame 2 — The flood

- scene: Takes pile in from every edge until the frame can't hold them
- duration: 10s   # voice 7.837s + designed hold
- poster: 7s
- transition_in: cut
- status: animated
- type: pain_point
- persuasion: Pain by abundance
- beat: cacophony
- blueprint: overwhelm-surround (Adapt)
- registry: overwhelm-surround (component)
- sfx: crowd-swell, card-whoosh-soft, riser
- src: compositions/frames/02-the-flood.html

The concept's engine. Real creator cards — The United Stand, Stretford Paddock,
Kombo's Diary, AdikasTakes, Toffee TV, Back of The Nest, Talking Town — accumulate
from every edge and close in on the center, accelerating. Roughly seven legible
cards in the foreground; everything behind them is depth and blur implying
hundreds. Ends claustrophobic, on the crowd, not on a number.

Adapt: keep the accelerate-inward signature and the density ramp. Changed — the
surrounding objects are creator cards, not notification bubbles, and there is no
avatar morph at the center: the center stays empty cream so the crowding reads as
pressure rather than as a person being buried.

Scene 1 (0.0–1.8s): bare cream. THE UNITED STAND enters from the left edge on its spoken cue and settles upper-left at a slight rotate → `dynamic-content-sequencing`; nothing else on screen. Layered-depth, one foreground card only.
Scene 2 (1.8–3.4s): STRETFORD PADDOCK enters from the right on its cue, settling mid-right. The two cards hold; the first does not re-animate.
Scene 3 (3.4–5.0s): KOMBO'S DIARY arrives from below onto the center-left and lands as the frame's single red card — the one accent. Three foreground cards now.
Scene 4 (5.0–7.6s): on "Ninety minutes ends —", the remaining four foreground cards (AdikasTakes, Football Fans Tribe, Toffee TV, Back of The Nest) accelerate inward from four different edges in quick succession → `dynamic-content-sequencing`, and the blurred far layer populates behind them at 30% opacity. Density climbs; the ring tightens toward center.
Scene 5 (7.6–10.0s): on "a hundred takes start", the whole field closes in a final inward push in lockstep → `center-outward-expansion` (run inward, toward center) — cards nudge inward and overlap, the far layer thickens, and the frame ends crowded and unresolved. No settle, no clean hold: the cut catches it mid-pressure.

## Frame 3 — The hunt

- scene: Pain statements land solo on a bare canvas as tabs stack up
- duration: 8s   # voice 6.217s + designed hold
- poster: 5s
- transition_in: cut
- status: animated
- type: pain_point
- persuasion: Pain agitation, second-person
- beat: futility
- blueprint: kinetic-type-beats (Reproduce)
- registry: headline-slam (component)
- sfx: impact-soft ×4, tab-click ×6
- src: compositions/frames/03-the-hunt.html

Agitation — the viewer's own behaviour named back to them. Short lines land one
at a time on bare cream, each its own hard move, while browser tabs accrete as a
thin mono rail. "Stop scrolling" is the site's own phrase; this beat earns it.
No product on screen.

The tab rail is hand-authored: a catalog search for an accumulating browser-tab
rail returned nothing that fits (`tabs-slide-indicator` is a pill indicator, not
an accumulation), so it is built rather than installed.

Scene 1 (0.0–1.5s): bare cream. "SO YOU SCROLL." slams in at the upper-third and settles in light grey → `kinetic-beat-slam`. Two tabs snap into the rail at the top edge on the same beat. Left-aligned stack, primary ~40% of canvas.
Scene 2 (1.5–3.0s): "CHANNEL TO CHANNEL." lands beneath it in full ink on its spoken cue; the first line stays put and does not dim further. Two more tabs snap in.
Scene 3 (3.0–4.4s): "TAB TO TAB." lands third; two final tabs snap in and the rail is now visibly overfull, the last reading "+12".
Scene 4 (4.4–6.2s): "AND YOU STILL / MISS HALF." lands largest and in red — the frame's single accent — on its own cue. The stack now fills the lower two-thirds; hierarchy is size 3:1 against line one.
Scene 5 (6.2–8.0s): held read, fully still. The tab rail keeps its overfull state; nothing animates out. The silence before the turn.

## Frame 4 — The snap

- scene: The chaos snaps into one ordered fixture list on the beat
- duration: 8s   # voice 3.579s + designed hold
- poster: 6s
- transition_in: cut
- status: animated
- type: product_intro
- persuasion: Relief / resolution
- beat: the turn
- blueprint: grid-card-assemble (Adapt)
- registry: mk-specs-list (block)
- sfx: snap-impact, row-tick ×6
- src: compositions/frames/04-the-snap.html

Deliberate clean cut into frame 05 (no handoff): the board is a screenshot of a different surface, so continuing a single row across that seam was not buildable without pushing the captured MATCHDAY header off screen. The money moment and the turn of the whole video. A hard cut on a beat: six real
results cascade into a clean ordered list. The same visual material as frame 02 —
ink-bordered cards, Anton type — suddenly legible. This frame states the message
visually before the product is named.

Adapt: keep the staggered-cascade signature of the specs-list shape. Changed —
rows carry a scoreline in Space Mono 700 rather than a checkmark, and the cascade
lands on one beat rather than reading as a checklist being ticked.

Scene 1 (0.0–0.9s): on the cut, all six rows cascade top-to-bottom in a tight stagger and land → `dynamic-content-sequencing`. Left-aligned full-width strip, rows at ~78% canvas width, 2 depth layers. This is the one front-loaded moment in the video and it is deliberate — the snap must feel instantaneous.
Scene 2 (0.9–2.6s): on "every take, sorted by fixture", the red leftbar draws down the FUL 1—1 MUN row → `svg-path-draw`, marking the fixture frame 06 will open. Single accent.
Scene 3 (2.6–8.0s): held read, fully still. Long hold by design — the audience needs time to register that the noise became a list. No camera move, no row hover, no drift.

## Frame 5 — The board

- scene: The real matchday board — Friday to Sunday, kickoff times, pre and post
- duration: 10s   # voice 6.818s + designed hold
- poster: 7s
- transition_in: cut
- status: animated
- type: feature_showcase
- persuasion: Proof by real surface
- beat: the product, named
- blueprint: device-surface-showcase (Adapt)
- registry: scroll-camera-story (component)
- focal: capture/screenshots/full-page.png
- roles: full-page.png = cutout (the hero plate, held at 1:1 or below — never pushed past native scale)
- sfx: page-travel-soft, chip-tick ×3
- asset_candidates: capture/screenshots/full-page.png
- handoff_out: FUL fixture row — x 50%, y 57%, scale 1.0 (plate native; upscaling past 1:1 is banned), opacity 1.0, motion settled to 0 px/s at the cut
- src: compositions/frames/05-the-board.html

Product named, on its own surface. The captured page is the truth here, not a
redrawing: MATCHDAY, 18—20 SEPTEMBER, the day headings, the 20:00 / 12:30 /
15:00 kickoffs, the pre and post chips. Introduced by completing its core loop
rather than by a feature list.

Adapt: keep the hero-surface hold. Changed — the surface is the real captured
plate rather than a device mockup, and there is no device chrome around it; the
frame travels the plate instead of cycling screens.

Scene 1 (0.0–2.0s): the captured plate seats full-bleed with its MATCHDAY header at the top third, already present at t=0 — it is the frame's ground, not an entrance. Slight tilt away from the viewer, held. Full-width, 3 depth layers (cream ground · plate · chips).
Scene 2 (2.0–4.4s): on "One matchday board", the frame travels down the plate at a steady rate, bringing FRIDAY and SATURDAY into center → `3d-page-scroll`. The plate itself never re-renders; the camera reads it.
Scene 3 (4.4–7.0s): on "pre and post", the PRE and POST chips light in sequence down the visible fixtures — the POST chip is the red accent → `dynamic-content-sequencing`. Travel continues underneath at the same rate; the chips ride with the plate, not against it.
Scene 4 (7.0–10.0s): travel decelerates and locks with the FUL fixture row framed high — the same row frame 06 will continue — and holds still for the cut into 06. No overshoot; the lock must be clean so the handoff reads.

## Frame 6 — One fixture

- scene: Open FUL—MUN; five creators' takes stack up side by side
- duration: 9s   # voice 5.93s + designed hold
- poster: 6s
- transition_in: cut
- status: animated
- type: feature_showcase
- persuasion: Payoff — the hunt answered
- beat: relief, concrete
- blueprint: cursor-ui-demo (Reproduce)
- registry: mk-specs-list (block)
- focal: capture/screenshots/full-page.png
- roles: full-page.png = supporting (creator tiles cropped from the plate; the type is live)
- sfx: cursor-click, row-arrive ×5
- asset_candidates: capture/screenshots/full-page.png
- handoff_in: FUL 1—1 MUN — x 50%, y 57%, scale 1.0, opacity 1.0, entering static (0 px/s) and rising into the frame header
- src: compositions/frames/06-one-fixture.html

The proof beat, one workflow end to end. FUL—MUN opens and its real creator
stack fills: The United Stand, Stephen Howson, Stretford Paddock, Football Fans
Tribe, Fulhamish — the five the site genuinely lists for that fixture. The
payoff of frame 3's pain, answered literally.

Scene 1 (0.0–1.3s): the FUL 1 — 1 MUN header arrives already in motion from frame 05's locked row and settles at the top — the only element carried across a seam in the whole video. Below it, empty cream. Left-aligned, header ~25% of canvas.
Scene 2 (1.3–2.4s): on "Pick a match", the cursor travels in from the right and lands a click on the header row, emitting one ripple → `cursor-click-ripple`. This is the video's only cursor; it appears here and nowhere else.
Scene 3 (2.4–5.8s): on "Five takes, side by side", the five take rows arrive one per beat downward from the click point → `dynamic-content-sequencing`. The top row (The United Stand) is the red selected state — the single accent. Creator thumbs are cropped from the captured plate, not invented tiles.
Scene 4 (5.8–9.0s): the cursor exits the frame; the stack holds still and reads. No hover states, no secondary motion — the density of five legible takes on one screen is the argument, and it needs stillness to land.

## Frame 7 — Every view counts

- scene: The creator line, then the wordmark and the URL
- duration: 9s   # voice 7.967s + designed hold
- poster: 6s
- transition_in: crossfade
- status: animated
- type: branding
- persuasion: Differentiator + identity
- beat: resolution
- blueprint: logo-assemble-lockup (Adapt)
- registry: bottom-up-letters (component), cta-lockup (component)
- sfx: ground-invert-thud, letter-tick ×12, tail-out
- src: compositions/frames/07-every-view-counts.html

The differentiator no competitor can copy, in the site's own words, then the
lockup. The wordmark is live Anton type, not a traced logo — no logo SVG was
captured, and composing a fake mark would ship off-brand. Lands on
footy-reacts.vercel.app.

Adapt: keep the mark-comes-to-exist signature via letter cascade. Changed — the
lockup is preceded by a full claim that must be read and cleared first, so the
wordmark assembles into vacated space rather than onto an empty stage from t=0.

Scene 1 (0.0–1.2s): the crossfade completes onto ink — the ground inversion is the frame's entrance and the video's single biggest visual event. Empty ink field, nothing else.
Scene 2 (1.2–4.0s): on "It never re-hosts", the claim types on in Anton across the upper two-thirds, with "creator's own channel" arriving in red as its own cue → `discrete-text-sequence`. Centered-left, claim ~45% of canvas.
Scene 3 (4.0–6.2s): the claim clears and FOOTY REACTS assembles glyph-by-glyph from below into the vacated center → `bottom-up-letters` (registry component); the URL fades up beneath it in Space Mono 700 → `discrete-text-sequence`.
Scene 4 (6.2–9.0s): held lockup, fully still, to the end of the video. No jitter here — this is the last frame and it must stop cleanly rather than trail off.
