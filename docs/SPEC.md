# Footy Reacts — MVP Spec

**Status:** in build · **Last updated:** 2026-09-18

## 1. What it is

A fixture-centric home for football reaction content. Fans stop hunting across
YouTube, X and TikTok for takes on their club's match — every creator's pre- and
post-match video sits on one page, organised by fixture.

**The unit of consumption is the match, not the creator.** That is the whole
insight. `Arsenal vs Chelsea → Pre-Match | Post-Match → every creator's take`.
YouTube and X structurally cannot offer this view; they are organised around
channels and feeds.

### Why it isn't just an aggregator

A pure aggregator has a value-capture problem: it embeds other people's videos,
the host platform keeps the ad money, and the aggregator owns nothing. Footy
Reacts pairs aggregation with a creator payment rail:

- **Aggregation is the distribution.** Fans arrive for the convenience.
- **The rail is the revenue.** Fans tip or subscribe to creators in-page.

Each side fixes the other's cold-start problem. Creators join for a new income
stream and free distribution; fans join for the convenience; and creators bring
their own audiences, so the marketplace is only half two-sided.

### Non-negotiable: embed, never re-host

Every video plays through the creator's own YouTube embed. Views, watch time and
ad revenue stay theirs. This is both the legal position and the pitch to
creators: *we add distribution and a second income stream, and take nothing you
already have.*

---

## 2. Scope of the MVP

| In | Out (for now) |
| --- | --- |
| One competition (Premier League) | Multi-league, multi-sport |
| 15–20 hand-picked creators | Open creator sign-up |
| YouTube as the only source | X/TikTok ingestion |
| Fixture list + match page | Accounts, follows, notifications |
| Automated fixture tagging | Comments, ratings, rankings |
| A disabled `SUPPORT` button | The live payment rail (Phase 2) |

**Start absurdly narrow.** Depth beats coverage: a fan must open a match page and
feel *every* take on their club's game is here. Twenty creators covering six
clubs properly beats two hundred covering everything thinly.

---

## 3. Data model

Implemented in [`src/lib/types.ts`](../src/lib/types.ts); the Postgres version
for Supabase is in [`db/schema.sql`](../db/schema.sql). Field names match across
both so the dev JSON store and Supabase stay interchangeable.

```
competition ──< fixture >── team (home, away)
                   │
                   └──< take >── creator
```

**`fixture`** — `slug` is the URL key (`arsenal-vs-chelsea-2026-09-19`).
`externalId` keeps the provider's own id so re-syncs de-duplicate cleanly, while
our internal `id` never changes — existing takes stay attached when a kickoff
moves.

**`creator`** — `clubAffinity` (team ids) is the tagging pre-filter's strongest
signal. `uploadsPlaylistId` is resolved once and cached; see the quota note
below. `claimed` gates Phase 2 payouts.

**`take`** — the join of a video to a fixture. Carries `phase` (`pre` | `post`),
`confidence` (0–1) and `taggedBy` (`heuristic` | `agent` | `manual`). Takes
below `TAG_MIN_CONFIDENCE` (0.55) are stored but withheld from the UI, so a bad
tag is invisible rather than wrong in public. A `manual` tag always survives
re-sync.

---

## 4. Ingestion

Two idempotent cron jobs. Both are safe to run every 15 minutes and safe to run
twice. Implemented in [`src/lib/jobs.ts`](../src/lib/jobs.ts), exposed at
`/api/cron/fixtures` and `/api/cron/takes` (shared-secret auth), and runnable
locally via `npm run sync:fixtures` / `npm run sync:takes`.

### 4.1 Fixture sync — daily

Pulls a rolling window (3 days back, 14 days ahead) and upserts teams and
fixtures. Two providers are supported and normalise to one shape:

- `footballdata` — football-data.org v4, free tier, `X-Auth-Token` header
- `apifootball` — API-Football v3, direct or via RapidAPI

Kickoff times and scores are provider-authoritative; our ids are not.

### 4.2 Take sync — every 15 minutes on matchdays

**The quota decision the whole pipeline rests on:**

| Call | Cost | At 20 creators, polled 4×/hour |
| --- | --- | --- |
| `search.list` | 100 units | ~192,000 units/day ❌ |
| `playlistItems.list` | 1 unit | ~1,920 units/day ✅ |

Default YouTube quota is 10,000 units/day. Every channel has an "uploads"
playlist, so we resolve `handle → channelId → uploadsPlaylistId` **once**, cache
it on the creator record, and poll the playlist thereafter. Search would die on
day one; this leaves headroom to roughly 5× the creator roster.

Per run, for each creator: fetch uploads since the last run → drop anything
already stored → fetch durations in one batched call (50 ids per unit) → drop
anything under 90 seconds (Shorts and clips, not takes) → tag → store.

---

## 5. The tagging agent

**Contract:** given a video (title, description, publish time) and its creator,
decide *which fixture* it is about and *which phase* it belongs to — or decline.

Implemented in [`src/lib/tagger.ts`](../src/lib/tagger.ts) in two stages.

### Stage 1 — deterministic pre-filter (free)

Narrows the entire calendar to the 2–3 plausible fixtures by scoring:

- **Time window.** Only fixtures within 4 days before kickoff or 3 days after
  the final whistle can be the subject. This alone eliminates almost everything.
- **Team mentions.** Both clubs named in the title is the strongest textual
  signal. Matching runs over an alias table — APIs say "Wolverhampton
  Wanderers FC", creators say "Wolves"; likewise Spurs, Man Utd, the Toon.
- **Creator affinity.** A channel that only covers Arsenal is almost certainly
  discussing the Arsenal game that week, even with a vague title.
- **Proximity to kickoff**, scaled across the window.
- **Phase wording.** "preview / team news / predictions" vs "reaction / review /
  player ratings / full time". Wording that *contradicts* the timing subtracts
  score — it usually means the wrong fixture was matched, not the wrong phase.

Phase itself is decided by timing first (published before kickoff → `pre`, after
the whistle → `post`), with wording only breaking ties inside the match window.

### Stage 2 — Claude as tie-breaker (cheap, optional)

The model is called **only** when the top two candidates are within 0.15 of each
other, or the best score is weak enough to be withheld anyway. It then chooses
between 2–3 labelled options plus "none of these" — a far easier and cheaper
task than guessing from an open calendar. Haiku is the default model; picking
one of three options does not need a frontier model.

With no `ANTHROPIC_API_KEY` set, the heuristic decides alone. **The pipeline
never hard-depends on the model.**

---

## 6. Interface

Design direction: football's own printed world — the Saturday results coupon,
the teletext vidiprinter, the matchday programme — rather than generic app UI.

- **Type:** Anton (condensed display), Work Sans (body), Space Mono (all
  numerals: kickoff times, scores, counts).
- **Palette:** red is the *field*, not an accent. The masthead and the active
  phase tab wear it fully; everything else stays paper-and-ink quiet, so the red
  keeps meaning something.
- **Home** — fixtures as coupon rows grouped by day, bold three-letter
  abbreviations, take counts on the right. All times render in Europe/London
  regardless of the reader's location: that is the clock fixtures are announced
  in, and pinning it also prevents hydration drift.
- **Vidiprinter** — a black teletext strip under the masthead announcing takes
  as the agent files them. It turns the ingestion pipeline into visible matchday
  energy, and it costs nothing extra: it is just the newest rows.
- **Match page** — the two phase tabs are the two halves of a matchday; the
  active one goes full red like a raised board. The phase lives in the URL, so
  "send me the post-match takes" is a shareable link. The page opens on
  `post` once the match has been played, `pre` before.
- **Take cards** — YouTube thumbnail facade; the iframe only mounts on click
  (twenty live iframes would cost megabytes before anyone pressed play).
  A ghosted `SUPPORT →` sits on every card — Phase 2's seat at the table.

---

## 7. Build order

- [x] **Day 1** — scaffold, design tokens, domain model, storage layer
- [x] **Day 2** — fixture sync (both providers), YouTube poller, quota-safe polling
- [x] **Day 3** — tagging agent: pre-filter + model tie-breaker
- [x] **Day 4** — fixture board, match page, phase tabs, take cards, vidiprinter
- [ ] **Day 5** — run against live keys; hand-correct mis-tags; tune
      `TAG_MIN_CONFIDENCE` against real matchday output
- [ ] **Day 6** — deploy (Vercel), wire cron schedules, point a domain
- [ ] **Day 7** — creator outreach: DM 15–20 channels with their own page link

### Then: prove retention before building the rail

The one metric that matters: **do fans come back next matchday?** Ship the
aggregator, watch a few matchdays, and only wire in payments once creators are
claiming profiles. Retention first, payments second — a rail nobody returns to
use is just plumbing.

---

## 8. Phase 2 — the creator payment rail

Stablecoins are the settlement layer, not the product. Fans see "tip £3" or
"support this creator"; the rail is invisible underneath. Creator payouts in
stablecoin solve a real problem this audience actually has — reaction creators
are global and cross-border payouts are slow and expensive — which is why this
vertical suits the rail rather than the other way round.

Sequenced after retention is proven:

1. **Claim your page** — creator verifies channel ownership, sets a payout
   address. `creator.claimed` already exists for this.
2. **Tips** — one-tap per take, settling to the creator's address.
3. **Memberships** — recurring support for a creator across a season.
4. **Match-day pots** — split a tip across every creator on one fixture page.

---

## 9. Known open questions

- **Handles in the seed are unverified.** `sync:takes` logs any handle that
  fails to resolve rather than failing the run; verify the real roster before
  outreach.
- **`TAG_MIN_CONFIDENCE` is a guess** (0.55) until it meets a real matchday.
- **No storage migration yet.** The dev JSON store is one file behind the same
  interface Supabase will implement; `db/schema.sql` is written and waiting.
- **Shorts are dropped at 90 seconds.** Some creators post genuine 60-second
  takes; revisit once real data exists.
