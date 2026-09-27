# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Footy Reacts aggregates football creators' pre- and post-match reaction videos and
organises them **by fixture** rather than by creator. A Next.js 15 app reads from
Postgres; two scheduled jobs poll YouTube, tag each upload to a fixture and a
phase, and write the results. Videos are always embedded, never re-hosted.

`docs/SPEC.md` holds the product reasoning; `docs/DEPLOY.md` covers secrets.

## Commands

```bash
npm run dev            # localhost:3210
npm run build          # also the only type check that runs on lint
npm run typecheck

npm run check:tagger   # the test suite — 11 tagging cases, needs no API keys
npm run check:landing  # which matchday a visitor lands on, across break dates
```

There is no test runner. `check:tagger` is where regressions get caught; add a
case there for any tagging change. It runs against the seed/JSON store, so it
never depends on live data.

Ingestion and operations (all need `.env.local`, see `.env.example`):

```bash
npm run sync:fixtures            # rolling window; --back N --ahead N to widen
npm run sync:takes 96            # poll creators, hours of lookback
npm run retag                    # re-score stored takes; dry run, --write applies
npm run db:status -- --fixture <slug>   # every take on a fixture, hidden ones too
npm run debug:uploads 48         # per-video tag decision, writes nothing
npm run coverage                 # takes and creators per club
npm run probe -- "@handle"       # channel's real title + recent uploads
npm run creator:add -- --name "X" --handle "@x" --clubs ARS
npm run creator:remove -- --id "Name"
npm run verify:attribution       # every take vs YouTube's own channel ownership
```

Quote handles in PowerShell — a bare `@word` is the splatting operator.

## Storage: one interface, two backends

`src/lib/repo/` holds a `Repo` interface with a JSON-file implementation (local
dev) and a Supabase one (everything deployed). `getRepo()` picks by whether
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both set — there is no flag.

**The two implementations must behave identically.** They have diverged before:
Supabase's `upsertCreators` nulled cached channel ids that the JSON one merged,
silently forcing quota-costly re-resolution. Anything that could drift lives as a
pure function in `repo/shared.ts` and is called by both.

Pages never import a repo directly; they go through the `src/lib/store.ts`
facade. Supabase access uses the service-role key and is **server-only** — RLS is
enabled with no policies, so the anon key is refused by design.

## Tagging (`src/lib/tagger.ts`)

Two stages:

1. **Deterministic pre-filter** narrows the calendar to 2–3 candidates using a
   time window, team-name aliases (including three-letter abbreviations and
   nicknames), the creator's club affinity, proximity to kickoff, and phase
   wording.
2. **Claude**, only when the top two candidates are close or the best score is
   under 0.70.

**The model may reject or re-assign, never promote.** Its confidence is capped at
whatever the heuristic gave that candidate. Letting its own number stand
overrode every heuristic penalty and pushed transfer news, La Liga opinion and
international-break talk onto match pages — asked to choose between plausible
fixtures, a model usually chooses one, so its "no" is far stronger evidence than
its "yes".

Without `ANTHROPIC_API_KEY` the heuristic decides alone; the pipeline never
hard-depends on the model. An organisation-scoped key also needs
`ANTHROPIC_WORKSPACE_ID` or every call 400s and falls back silently.

Scoring rules worth knowing before editing:

- `TAG_MIN_CONFIDENCE` (0.55) gates display. Below it takes are **stored but
  hidden**, so a bad tag is invisible rather than wrong in public.
- Keyword matching is whole-word. It was substring-based once, which made every
  *preview* match *review*.
- `"ft"` is deliberately absent from the full-time words: on YouTube it means
  *featuring* far more often.
- A title containing `news` costs 0.25, with `team news` exempt.
- No club named anywhere **and** no phase wording caps the score below the
  floor — otherwise affinity plus timing alone publishes anything posted near a
  kickoff.
- A take marked `taggedBy: "manual"` is never overwritten by a sync or a retag.

After changing this file, run `npm run retag` — the sync only ever looks at
videos it has not seen, so stored takes keep their old scores otherwise.

## YouTube quota is the pipeline's design constraint

`playlistItems.list` costs 1 unit, `search.list` costs 100, against 10,000/day.
The poller therefore resolves each creator's uploads playlist once, caches it on
the creator record, and pages that. `find:channel` is the one place search is
used, and it is a setup-time tool only — never put it on a schedule.

`fetchRecentUploads` pages until it passes the cutoff. It took a single page of
15 once, and a channel posting fifteen times on a Sunday pushed Saturday's
matches off the end where they were never fetched at all.

## Time windows that have to agree

Changing one of these means checking the others:

- pre-match window: 4 days before kickoff (`tagger.ts`)
- post-match window: 3 days after the whistle (`tagger.ts`)
- `BOARD_FLOOR_DAYS`: 4 (`repo/shared.ts`) — must outlast the post window, or
  fixtures leave the board while reactions are still being filed for them
- `sync:fixtures` default `daysBack`: 5 — must cover the board floor so scores
  keep refreshing for everything still visible

## Which matchday the board shows

`currentMatchday()`: the round being played → else the latest round **that has
takes** → else nearest by date. The middle rule carries the site through an
international break; landing on the nearest by date would show an empty upcoming
round for a week. `check:landing` pins this behaviour.

The archive only contains matchdays that have been synced — a default
`sync:fixtures` run never reaches rounds played before the project existed. Use
`--back` to backfill.

## Seeding

`src/data/seed.json` is the version-controlled creator roster plus a placeholder
calendar. `db:seed` writes creators and teams to whichever store is configured,
but pushes the **placeholder fixtures to the JSON store only** — in a real
database they sit beside synced fixtures forever, since the provider assigns
different ids. `creator:add` and `creator:remove` keep this file in sync; commit
their changes.

## Scheduling

Ingestion runs in GitHub Actions (`.github/workflows/`), not Vercel cron: Hobby
runs crons once a day at most and serverless functions can time out on a long
poll. `vercel.json` has no `crons` block, deliberately. Secrets for the jobs live
in GitHub; Vercel only needs the two Supabase values, and **only a redeploy picks
up changed environment variables**.

`/api/health?key=$CRON_SECRET` reports which configuration actually reached a
deployment — a failing server component otherwise shows only an opaque digest.

## UI conventions

Times render in Europe/London regardless of the reader, which is the clock
fixtures are announced in and also prevents hydration drift. Takes are
round-robined across creators so one channel's upload spree cannot own a match
page, and `TakeList` cuts the first screen at one take per creator. Take cards
are thumbnail facades that only mount the iframe on click.
