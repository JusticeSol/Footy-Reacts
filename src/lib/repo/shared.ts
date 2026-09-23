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
  fixtures: Array<{ matchday?: number; kickoffUtc: string }>,
): Array<{ matchday: number; fixtures: number; firstKickoff: string; lastKickoff: string }> {
  const byMatchday = new Map<number, string[]>();

  for (const fixture of fixtures) {
    if (fixture.matchday === undefined || fixture.matchday === null) continue;
    const kickoffs = byMatchday.get(fixture.matchday) ?? [];
    kickoffs.push(fixture.kickoffUtc);
    byMatchday.set(fixture.matchday, kickoffs);
  }

  return [...byMatchday.entries()]
    .map(([matchday, kickoffs]) => {
      const sorted = kickoffs.slice().sort();
      return {
        matchday,
        fixtures: kickoffs.length,
        firstKickoff: sorted[0],
        lastKickoff: sorted[sorted.length - 1],
      };
    })
    .sort((a, b) => a.matchday - b.matchday);
}

/**
 * The matchday a visitor should land on: the one currently being played, or
 * else whichever is nearest in time. During a matchday weekend that is the
 * live one; midweek it is whichever edge is closer.
 */
export function currentMatchday(
  summaries: Array<{ matchday: number; firstKickoff: string; lastKickoff: string }>,
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
