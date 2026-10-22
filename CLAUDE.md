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

npm run check:tagger   # the test suite: 11 tagging cases, needs no API keys
npm run check:landing  # which matchday a visitor lands on, across break dates
npm run check:highlights  # highlight matching and the per-country choice of version
```

There is no test runner. `check:tagger` is where regressions get caught; add a
case there for any tagging change. It runs against the seed/JSON store, so it
never depends on live data.

Ingestion and operations (all need `.env.local`, see `.env.example`):

```bash
npm run sync:fixtures            # rolling window; --back N --ahead N to widen
npm run sync:takes 96            # poll creators, hours of lookback
npm run sync:highlights 48       # poll the official highlight channels
npm run retag                    # re-score stored takes; dry run, --write applies
npm run db:status -- --fixture <slug>   # every take on a fixture, hidden ones too
npm run debug:uploads 48         # per-video tag decision, writes nothing
npm run coverage                 # takes and creators per club
npm run probe -- "@handle"       # channel's real title + recent uploads
npm run creator:add -- --name "X" --handle "@x" --clubs ARS
npm run creator:remove -- --id "Name"
npm run verify:attribution       # every take vs YouTube's own channel ownership
```

Quote handles in PowerShell: a bare `@word` is the splatting operator.

## Storage: one interface, two backends

`src/lib/repo/` holds a `Repo` interface with a JSON-file implementation (local
dev) and a Supabase one (everything deployed). `getRepo()` picks by whether
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both set. There is no flag.

**The two implementations must behave identically.** They have diverged before:
Supabase's `upsertCreators` nulled cached channel ids that the JSON one merged,
silently forcing quota-costly re-resolution. Anything that could drift lives as a
pure function in `repo/shared.ts` and is called by both.

Pages never import a repo directly; they go through the `src/lib/store.ts`
facade. Supabase access uses the service-role key and is **server-only**. RLS is
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
international-break talk onto match pages. Asked to choose between plausible
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
  floor. Otherwise affinity plus timing alone publishes anything posted near a
  kickoff.
- A take marked `taggedBy: "manual"` is never overwritten by a sync or a retag.

After changing this file, run `npm run retag`. The sync only ever looks at
videos it has not seen, so stored takes keep their old scores otherwise.

## YouTube quota is the pipeline's design constraint

`playlistItems.list` costs 1 unit, `search.list` costs 100, against 10,000/day.
The poller therefore resolves each creator's uploads playlist once, caches it on
the creator record, and pages that. `find:channel` is the one place search is
used, and it is a setup-time tool only; never put it on a schedule.

`fetchRecentUploads` pages until it passes the cutoff. It took a single page of
15 once, and a channel posting fifteen times on a Sunday pushed Saturday's
matches off the end where they were never fetched at all.

## Time windows that have to agree

Changing one of these means checking the others:

- pre-match window: 4 days before kickoff (`tagger.ts`)
- post-match window: 3 days after the whistle (`tagger.ts`)
- `BOARD_FLOOR_DAYS`: 4 (`repo/shared.ts`), which must outlast the post window, or
  fixtures leave the board while reactions are still being filed for them
- `sync:fixtures` default `daysBack`: 5, which must cover the board floor so scores
  keep refreshing for everything still visible

## Which matchday the board shows

`currentMatchday()`: the round being played → else the latest round **that has
takes** → else nearest by date. The middle rule carries the site through an
international break; landing on the nearest by date would show an empty upcoming
round for a week. `check:landing` pins this behaviour.

The archive only contains matchdays that have been synced. A default
`sync:fixtures` run never reaches rounds played before the project existed. Use
`--back` to backfill.

## Seeding

`src/data/seed.json` is the version-controlled creator roster plus a placeholder
calendar. `db:seed` writes creators and teams to whichever store is configured,
but pushes the **placeholder fixtures to the JSON store only**. In a real
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
deployment. A failing server component otherwise shows only an opaque digest.

## Competitions (`src/lib/competitions.ts`)

The board has two: the Premier League (default) and the Champions League,
switched with `/?c=ucl`. The Champions League is synced only for matches with a
Premier League club in them (`FOOTBALL_DATA_EUROPE`, default `CL`, "none" turns
it off): the same clubs, creators and fans, playing midweek. No new creators.

- **Every matchday read takes a competition id.** Both competitions number their
  rounds from 1, so an unfiltered "matchday 3" mixes two rounds and confuses
  `currentMatchday()`. `listMatchdays` and `getMatchdayFixtures` default to the
  Premier League in `store.ts`.
- **The tagger knows foreign clubs by the distinctive words of their names**
  ("Club Atletico de Madrid" answers to "atletico") when they have no curated
  aliases; generic words (united, city, real, town) never count on their own.
- **Highlights**: TNT Sports (UK and Ireland) and CBS Sports Golazo (US) for the
  Champions League, plus the same club channels. UEFA posts no weekly all-goals
  video, so the Champions League board has no "Weekend goals".
- football-data.org gives Barcelona and Bayern the same code, "FCB":
  `ABBR_OVERRIDES` in `providers/fixtures.ts` fixes board codes like that.

## Highlights (`src/lib/highlights/`)

Official match highlights, embedded from the rights holders' own YouTube
channels: never uploaded, cut or stitched by us. Premier League footage belongs
to the league and its broadcasters, who enforce hard; embedding their uploads
keeps the views and the ad money with them, the same deal as takes.

- **Sources are pinned** in `sources.ts`: the Premier League (its weekly
  "EVERY Weekend Goal | Matchweek N" compilation only), Sky Sports Premier
  League, NBC Sports and 18 club channels; for the Champions League, TNT, CBS
  Sports Golazo and UEFA (its "EVERY Champions League Goal From Matchday N"
  only). Channel ids, not handles, so a poll costs 1 unit per source. Hull City
  and Nottingham Forest have no confirmed official channel yet.
- **Matching is stricter than tagging** (`match.ts`). A wrong highlight is the
  wrong match on screen, so anything uncertain is dropped. It has its own team
  names: the tagger's bare "city" and "united" would read Coventry City as Man
  City. A club channel is one side of every match it posts, which is how
  "TOWN 2 FULHAM 1" on Ipswich's channel still matches. A club upload without
  the word "highlights" ("EZE AND RICE GOALS ... (2-2)") counts only if it says
  "goals" and carries the match's actual result.
- **Region rules come from YouTube** and are stored per video: Sky plays only
  in the UK and Ireland, NBC only in the US, and Arsenal, Brighton, Coventry
  and Newcastle switch embedding off. `select.ts` picks per visitor, using
  Vercel's `x-vercel-ip-country` header (`src/lib/viewer.ts`): a broadcaster
  that serves the country, then the home club, then the away club; the
  standard cut before the extended one. With nothing embeddable, the page links
  to YouTube instead, and when no version plays in the visitor's country it
  also offers the matchday's every-goal compilation. TNT and CBS cover only the
  UK and US, so outside them that compilation is often the only Champions
  League footage. Compilations are stored by matchday number alone; the
  source's `competitionId` keeps PL matchweek 3 apart from UCL matchday 3.
- **The `highlight` table is newer than the site.** Reads return [] when it is
  missing, so the pages work before `db/schema.sql` has been re-run; the sync
  fails loudly instead.
- The sync rides the take sync's GitHub Actions schedule as a second step.

## UI conventions

Times render in Europe/London regardless of the reader, which is the clock
fixtures are announced in and also prevents hydration drift. Takes are
round-robined across creators so one channel's upload spree cannot own a match
page, and `TakeList` cuts the first screen at one take per creator. Take cards
are thumbnail facades that only mount the iframe on click.

The site is installable (`src/app/manifest.ts`, icons in `public/icons` and
`src/app/{icon,apple-icon}.png`, rendered from `brand/avatar.svg`). On an
iPhone home screen the page draws under a see-through status bar, so anything
pinned to the top of the screen offsets by `env(safe-area-inset-top)`; a fixed
red strip in the layout sits behind the clock. `InstallPrompt` is the home
page's dismissible "add to home screen" strip. There is no service worker and no
offline mode.
