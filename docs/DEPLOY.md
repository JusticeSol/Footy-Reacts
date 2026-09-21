# Deployment and secrets

Three places hold configuration, for three different jobs. Nothing secret ever
goes in the repository.

| Where | Runs what | How it's set |
| --- | --- | --- |
| `.env.local` on your machine | the scripts you run by hand | a gitignored file |
| GitHub **Actions secrets** | the scheduled ingestion | repo → Settings → Secrets |
| Vercel **environment variables** | the live website's page rendering | project → Settings |

They overlap but are not identical: Actions needs the write keys, Vercel only
needs to read.

---

## 1. GitHub Actions — the ingestion

`.github/workflows/sync-takes.yml` and `sync-fixtures.yml` run the same scripts
you run locally, on a schedule, writing straight to Supabase. They do not touch
Vercel, so ingestion keeps working even if the site is down.

Add these at **repo → Settings → Secrets and variables → Actions → New
repository secret**:

| Secret | Needed for |
| --- | --- |
| `SUPABASE_URL` | where to write |
| `SUPABASE_SERVICE_ROLE_KEY` | permission to write |
| `YOUTUBE_API_KEY` | polling creator uploads |
| `FOOTBALL_DATA_API_KEY` | the fixture calendar |
| `ANTHROPIC_API_KEY` | optional — tagging tie-breaks |

Optional **variables** (not secrets) on the same page: `FIXTURES_PROVIDER`,
`FOOTBALL_DATA_COMPETITION`, `TAGGER_MODEL`. Sensible defaults apply if unset.

Test it without waiting for a schedule: **Actions** tab → *Sync takes* → **Run
workflow**. The log prints the same summary line as the local run.

### Why the schedule looks like that

Weekends every 15 minutes (11:00–23:00 UTC), weekday evenings every 30 minutes
(17:00–22:00 UTC). Polling every 15 minutes around the clock would cost roughly
2,900 Actions minutes a month against a 2,000 free allowance on a private repo.
The schedule follows when reaction content actually appears.

GitHub delays scheduled runs when it is busy. That is fine — the jobs are
idempotent, so a late or repeated run changes nothing.

---

## 2. Vercel — the website

The deployed site only **reads**. Add at **project → Settings → Environment
Variables**, for all three environments:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | same as above |

Then **redeploy** — environment variables are read at build and run time, so an
existing deployment will not pick them up.

Until these are set, the deployed site falls back to the JSON seed and shows the
placeholder calendar, while your local copy shows real data. That mismatch is
the usual sign the variables did not take.

### Why the service-role key, on a website

Every read happens in a server component, never in the browser, and row level
security is enabled with no policies — so the anon key would be refused. The
service-role key bypasses RLS and is only ever used server-side. Do not add
`NEXT_PUBLIC_` to it, and do not import the repo into a client component.

### Cron on Vercel is deliberately not used

`vercel.json` has no `crons` block. Vercel's Hobby plan runs cron jobs once a
day at most, which is useless for matchday ingestion, and serverless functions
can time out on a long poll. GitHub Actions does the work instead. If you later
move to Vercel Pro, the block to restore is in the README.

---

## 3. Adding creators

```bash
npm run creator:add -- --name "AFTV" --handle @AFTVMedia --clubs ARS
```

Clubs are the three-letter abbreviations from the fixture board. The command
resolves the channel immediately, so a wrong handle fails right there instead of
silently skipping that creator on every future sync. If a handle will not
resolve:

```bash
npm run find:channel -- "AFTV"
npm run creator:add -- --name "AFTV" --channel UCBTy8j2cPy6zw68godcE7MQ --clubs ARS
```

The creator is written to both `src/data/seed.json` (version controlled, so the
roster is reviewable) and the live database. Commit the seed change, then run
`npm run sync:takes` to pull their recent uploads.
