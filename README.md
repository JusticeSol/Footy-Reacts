# Footy Reacts

Every take on every match, organised by fixture. Pre- and post-match reaction
content from football creators, in one place — so fans stop hunting across
YouTube and X on matchday.

Full spec: [`docs/SPEC.md`](docs/SPEC.md).

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:3210
```

The app renders immediately from `src/data/seed.json` (a placeholder calendar,
no takes). Real content arrives once the two sync jobs run.

## Fill it with real data

```bash
npm run sync:fixtures   # pulls the real calendar: 3 days back, 14 ahead
npm run sync:takes      # polls every creator's uploads and tags them
```

### Inspecting what happened

```bash
npm run db:status              # counts, recent takes, unresolved creators
npm run debug:uploads 48       # per-video: duration, tag decision, why it was dropped
npm run find:channel "AFTV"    # channel id lookup when a @handle will not resolve
```

`find:channel` uses `search.list` at 100 quota units — fine while building the
roster, never on a schedule.

`sync:takes 72` widens the lookback to 72 hours. Both jobs are idempotent, write
to `src/data/store.json` (gitignored), and are also exposed as cron endpoints:

```
GET /api/cron/fixtures?key=$CRON_SECRET
GET /api/cron/takes?key=$CRON_SECRET
```

### Cron schedules are deliberately not set

`vercel.json` carries no `crons` block. The jobs write through
[`src/lib/store.ts`](src/lib/store.ts), which is a JSON file — unwritable on a
serverless filesystem, so a schedule would just 500 every 15 minutes and persist
nothing. Restore this block once `db/schema.sql` is live on Supabase and
`store.ts` talks to it:

```json
"crons": [
  { "path": "/api/cron/fixtures", "schedule": "0 5 * * *" },
  { "path": "/api/cron/takes", "schedule": "*/15 * * * *" }
]
```

Until then, run the syncs locally.

## Keys you need

| Variable | Why | Where |
| --- | --- | --- |
| `FOOTBALL_DATA_API_KEY` | fixture calendar | football-data.org (free tier) |
| `API_FOOTBALL_KEY` | alternative provider | api-football.com / RapidAPI |
| `YOUTUBE_API_KEY` | creator uploads | Google Cloud → YouTube Data API v3 |
| `ANTHROPIC_API_KEY` | tagging tie-breaks | optional — heuristic works alone |
| `CRON_SECRET` | protects the cron routes | any random string |

Set `FIXTURES_PROVIDER` to `footballdata` or `apifootball` to pick a provider.

## Layout

```
src/lib/types.ts            domain model (mirrors db/schema.sql)
src/lib/store.ts            storage + every read query (swap point for Supabase)
src/lib/providers/          football-data.org, API-Football, YouTube
src/lib/tagger.ts           fixture tagging: pre-filter, then Claude tie-break
src/lib/jobs.ts             the two cron jobs
src/app/                    fixture board, match page, cron routes
db/schema.sql               Postgres schema, ready for Supabase
```

## Ground rule

Footy Reacts **embeds, never re-hosts**. Every play counts on the creator's own
channel; their monetisation is untouched. We add distribution — and, in Phase 2,
a payment rail.
