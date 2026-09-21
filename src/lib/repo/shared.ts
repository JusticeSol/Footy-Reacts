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
