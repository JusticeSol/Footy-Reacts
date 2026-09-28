# Status

**Last updated:** 2026-09-28 · Live at <https://footy-reacts.vercel.app>

A snapshot for picking the project back up. Architecture is in
[CLAUDE.md](../CLAUDE.md), product reasoning in [SPEC.md](SPEC.md), secrets in
[DEPLOY.md](DEPLOY.md).

## Where it stands

| | |
| --- | --- |
| Creators | 26, all with uploads playlists resolved |
| Takes | 367 stored, ~240 above the confidence floor |
| Fixtures | 59 (matchdays 1–5) |
| Club coverage | 19 of 20 — Brentford is the gap |
| Ingestion | GitHub Actions, running clean on schedule |
| Site | Live, holding matchday 5 through the international break |

The league is in an international break. **Matchday 6 is on 10 October** — the
first round the system fills with nobody watching, and the real test of it.

Scheduled runs are succeeding and correctly storing almost nothing: break-time
content is transfer news, call-ups and squad announcements, which the off-topic
rules reject by design.

## What's in flight

**Creator outreach has started.** `npm run outreach` generates a personalised
message per creator — their own video, their fixture page, who they sit beside.
Contact on the site is `@affanyjoe` only; email was deliberately left off a
public page.

Order that matters: the 14 club channels first (they get pitched least and gain
most), AFTV and The United Stand last. If anyone opts out:
`npm run creator:remove -- --id "Their Name"` — the message promises same-day
removal, and honouring that quickly is what makes the message safe to send.

**An X launch post is drafted but not published.** Link preview cards are in
place, so a shared match link unfurls with its scoreline and take counts. Send
the creator messages a day or two *before* posting — a creator discovering the
site through a viral post reacts differently to one who heard from you first.

## Decided, don't re-litigate

- **Brentford has no active reaction scene.** Five separate fan channels, none
  with an upload in fourteen days. The dead entry was removed rather than
  swapped for another dormant one. Their matches are still covered from the
  opponent's side.
- **Matchdays 1–4 are results-only** and will stay that way. YouTube polling
  started at matchday 5 and a prolific channel's uploads playlist cannot be
  paged back that far.
- **West Ham is not in this season's fixtures.** It exists in the team table
  only because the placeholder seed invented it; `coverage` ignores it.
- **Kombo's Diary** was added on request. It posts general football news, so it
  contributes little and some of what it does contribute is not match reaction.

## Next, roughly in order

1. Finish creator outreach, then publish the X post.
2. Watch the matchday 6 weekend: `npm run debug:uploads 48` after it, to see
   what the tagger did with a round it handled unsupervised.
3. Ranking within a fixture page. Forty-one takes on one match is already past
   what anyone scrolls; `TakeList` cuts the first screen at one take per
   creator, but ordering beyond that is still just recency.
4. Phase 2 — the creator payment rail — but only once fans are demonstrably
   returning each matchday. Retention first; the rail is plumbing, not the
   product.

## Operational notes

- `.env.local` drives what you run by hand; GitHub secrets drive the scheduled
  jobs. They are separate, and both matter.
- Changing Vercel environment variables requires a **redeploy** to take effect.
  A deployment built without them throws an opaque digest on every page;
  `/api/health?key=$CRON_SECRET` says which configuration actually arrived.
- After any change to `src/lib/tagger.ts`, run `npm run check:tagger`, then
  `npm run retag` (dry by default) — stored takes otherwise keep old scores.
- Start Claude Code sessions from this folder, or CLAUDE.md will not load.
