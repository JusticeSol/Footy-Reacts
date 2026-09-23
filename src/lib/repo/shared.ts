import type { Fixture, HydratedFixture, Take, Team } from "../types";

/** Takes below this confidence are stored but withheld from the UI. */
export const TAG_MIN_CONFIDENCE = 0.55;

/** How long a match occupies the clock, kickoff → final whistle. */
export const MATCH_DURATION_MS = 115 * 60_000;

/**
 * Pure hydration helpers, shared by both repo implementations so the JSON and
 * Supabase paths can never drift in what they show.
 */

export function indexTeams(teams: Team[]): Map<string, Team> {
  return new Map(teams.map((t) => [t.id, t]));
}

export function isVisible(take: Pick<Take, "confidence" | "unmatched">): boolean {
  return !take.unmatched && take.confidence >= TAG_MIN_CONFIDENCE;
}

export function hydrateFixture(
  fixture: Fixture,
  teams: Map<string, Team>,
  counts: { pre: number; post: number },
): HydratedFixture | null {
  const homeTeam = teams.get(fixture.homeTeamId);
  const awayTeam = teams.get(fixture.awayTeamId);
  if (!homeTeam || !awayTeam) return null;
  return { ...fixture, homeTeam, awayTeam, counts };
}

export function countTakes(
  takes: Array<Pick<Take, "fixtureId" | "phase">>,
  fixtureId: string,
): { pre: number; post: number } {
  let pre = 0;
  let post = 0;
  for (const t of takes) {
    if (t.fixtureId !== fixtureId) continue;
    if (t.phase === "pre") pre += 1;
    else post += 1;
  }
  return { pre, post };
}

/**
 * Round-robin takes across creators, preserving newest-first within each.
 *
 * A creator who uploads fifteen reactions in an hour would otherwise own the
 * whole match page, which reads as their page rather than the fixture's. One
 * from each creator, then the next from each, and so on.
 */
export function interleaveByCreator<T extends { creatorId: string; publishedAt: string }>(
  takes: T[],
): T[] {
  const queues = new Map<string, T[]>();
  for (const take of takes) {
    const queue = queues.get(take.creatorId);
    if (queue) queue.push(take);
    else queues.set(take.creatorId, [take]);
  }

  // Creator with the newest take leads, so the page still opens on what just
  // landed rather than on whoever sorts first.
  const ordered = [...queues.values()].sort(
    (a, b) => Date.parse(b[0].publishedAt) - Date.parse(a[0].publishedAt),
  );
  for (const queue of ordered) {
    queue.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }

  const out: T[] = [];
  for (let round = 0; out.length < takes.length; round += 1) {
    for (const queue of ordered) {
      if (round < queue.length) out.push(queue[round]);
    }
  }
  return out;
}

/**
 * Thins a newest-first list so the ticker shows breadth rather than one
 * creator's upload spree. At most `perPair` entries for any one
 * fixture-and-creator combination.
 */
export function diversify<T extends { fixtureId: string; creatorId: string }>(
  takes: T[],
  limit: number,
  perPair = 1,
): T[] {
  const seen = new Map<string, number>();
  const out: T[] = [];

  for (const take of takes) {
    const key = `${take.fixtureId}:${take.creatorId}`;
    const count = seen.get(key) ?? 0;
    if (count >= perPair) continue;
    seen.set(key, count + 1);
    out.push(take);
    if (out.length >= limit) break;
  }

  return out;
}

/**
 * Summarises fixtures into matchdays for the archive nav.
 *
 * Fixtures without a matchday number are left out: they cannot be navigated to
 * by number, and inventing a bucket for them would put matches under a heading
 * that does not exist in the competition.
 */
export function summariseMatchdays(
  fixtures: Array<{ id?: string; matchday?: number; kickoffUtc: string }>,
  /** Visible takes per fixture id; omitted when the caller has no counts. */
  takesByFixture?: Map<string, number>,
): Array<{
  matchday: number;
  fixtures: number;
  takes: number;
  firstKickoff: string;
  lastKickoff: string;
}> {
  const byMatchday = new Map<number, { kickoffs: string[]; takes: number }>();

  for (const fixture of fixtures) {
    if (fixture.matchday === undefined || fixture.matchday === null) continue;
    const entry = byMatchday.get(fixture.matchday) ?? { kickoffs: [], takes: 0 };
    entry.kickoffs.push(fixture.kickoffUtc);
    entry.takes += (fixture.id && takesByFixture?.get(fixture.id)) || 0;
    byMatchday.set(fixture.matchday, entry);
  }

  return [...byMatchday.entries()]
    .map(([matchday, { kickoffs, takes }]) => {
      const sorted = kickoffs.slice().sort();
      return {
        matchday,
        fixtures: kickoffs.length,
        takes,
        firstKickoff: sorted[0],
        lastKickoff: sorted[sorted.length - 1],
      };
    })
    .sort((a, b) => a.matchday - b.matchday);
}

/**
 * The matchday a visitor should land on.
 *
 *   1. The one being played.
 *   2. Otherwise the latest matchday that has takes.
 *   3. Otherwise the nearest in time.
 *
 * Rule 2 is what carries the site through an international break. Landing on
 * the nearest matchday by date would, a week before the league returns, show
 * ten fixtures all reading "no takes yet" — the emptiest the site ever looks,
 * during exactly the lull when someone is most likely to be sent a link. The
 * last played round keeps its content on the front page instead, and the
 * moment previews for the new round arrive it becomes the latest with takes
 * and takes over on its own.
 */
export function currentMatchday(
  summaries: Array<{
    matchday: number;
    takes?: number;
    firstKickoff: string;
    lastKickoff: string;
  }>,
  now: number = Date.now(),
): number | null {
  if (summaries.length === 0) return null;

  for (const s of summaries) {
    const start = Date.parse(s.firstKickoff);
    // A matchday stays "current" until its last game has been played and had
    // time to attract reactions.
    const end = Date.parse(s.lastKickoff) + MATCH_DURATION_MS + 2 * 86_400_000;
    if (now >= start && now <= end) return s.matchday;
  }

  const withTakes = summaries.filter((s) => (s.takes ?? 0) > 0);
  if (withTakes.length > 0) {
    return withTakes.reduce((latest, s) =>
      Date.parse(s.firstKickoff) > Date.parse(latest.firstKickoff) ? s : latest,
    ).matchday;
  }

  let nearest = summaries[0];
  let best = Infinity;
  for (const s of summaries) {
    const distance = Math.min(
      Math.abs(now - Date.parse(s.firstKickoff)),
      Math.abs(now - Date.parse(s.lastKickoff)),
    );
    if (distance < best) {
      best = distance;
      nearest = s;
    }
  }
  return nearest.matchday;
}

/** Live games first, then soonest kickoff. */
export function byMatchdayOrder(a: Fixture, b: Fixture): number {
  if (a.status === "live" && b.status !== "live") return -1;
  if (b.status === "live" && a.status !== "live") return 1;
  return Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc);
}

/**
 * The board window.
 *
 * The floor must outlast the tagger's post-match window (3 days after the
 * whistle), or a fixture drops off the board while reactions to it are still
 * being filed — they would be ingested and tagged correctly, and then be
 * unreachable. Four days gives that a day of margin.
 */
export const BOARD_FLOOR_DAYS = 4;

export function boardWindow(days: number): { floor: number; horizon: number } {
  const now = Date.now();
  return { floor: now - BOARD_FLOOR_DAYS * 86_400_000, horizon: now + days * 86_400_000 };
}
