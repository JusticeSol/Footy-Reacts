# Red React

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

`sync:takes 72` widens the lookback to 72 hours. Both jobs are idempotent, write
to `src/data/store.json` (gitignored), and are also exposed as cron endpoints:

```
GET /api/cron/fixtures?key=$CRON_SECRET
GET /api/cron/takes?key=$CRON_SECRET
```

`vercel.json` already schedules them — fixtures daily at 05:00, takes every 15
minutes.

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

Red React **embeds, never re-hosts**. Every play counts on the creator's own
channel; their monetisation is untouched. We add distribution — and, in Phase 2,
a payment rail.
