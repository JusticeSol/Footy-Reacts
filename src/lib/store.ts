import { getRepo } from "./repo";
import { currentMatchday, mostSupported, totalTips } from "./repo/shared";
import { tipsEnabled } from "./chain/flags";
import type { MatchdaySummary } from "./repo/types";
import type { HydratedFixture, HydratedTake, Phase, TipTotal } from "./types";

/**
 * Thin facade over the active repo, so pages import one stable module and stay
 * ignorant of whether they are reading a JSON file or Postgres.
 */

export { TAG_MIN_CONFIDENCE } from "./repo";

export function getFixtureBoard(opts: { days?: number } = {}): Promise<HydratedFixture[]> {
  return getRepo().getFixtureBoard(opts);
}

export type { MatchdaySummary } from "./repo/types";

export function listMatchdays(): Promise<MatchdaySummary[]> {
  return getRepo().listMatchdays();
}

export function getMatchdayFixtures(matchday: number): Promise<HydratedFixture[]> {
  return getRepo().getMatchdayFixtures(matchday);
}

/**
 * The board a visitor lands on: the requested matchday if it exists, otherwise
 * the one being played. Falls back to the rolling date window when no fixture
 * carries a matchday number, so the page still works for a competition that
 * does not number its rounds.
 */
export async function getBoard(requested?: number): Promise<{
  fixtures: HydratedFixture[];
  matchdays: MatchdaySummary[];
  matchday: number | null;
}> {
  const matchdays = await listMatchdays();
  const fallback = currentMatchday(matchdays);
  const matchday =
    requested !== undefined && matchdays.some((m) => m.matchday === requested)
      ? requested
      : fallback;

  if (matchday === null) {
    return { fixtures: await getFixtureBoard(), matchdays, matchday: null };
  }

  return { fixtures: await getMatchdayFixtures(matchday), matchdays, matchday };
}

export function getFixtureBySlug(slug: string): Promise<HydratedFixture | null> {
  return getRepo().getFixtureBySlug(slug);
}

export function getTakes(fixtureId: string, phase: Phase): Promise<HydratedTake[]> {
  return getRepo().getTakes(fixtureId, phase);
}

export function getRecentTakes(
  limit = 12,
): Promise<Array<{ take: HydratedTake; fixture: HydratedFixture }>> {
  return getRepo().getRecentTakes(limit);
}

/**
 * Tip totals for the takes on a page, plus the Most supported strip.
 *
 * Tips are an add-on to the page, never a reason for it to fail: with tips off
 * this reads nothing, and a store that cannot answer (a database the tip table
 * has not been added to, say) degrades to no totals rather than an error page.
 */
export async function getTipSummary(takes: HydratedTake[]): Promise<{
  totals: Record<string, TipTotal>;
  top: Array<{ take: HydratedTake; total: TipTotal }>;
}> {
  if (!tipsEnabled || takes.length === 0) return { totals: {}, top: [] };
  try {
    const tips = await getRepo().getTipsForTakes(takes.map((t) => t.id));
    const totals = totalTips(tips);
    return { totals: Object.fromEntries(totals), top: mostSupported(takes, totals) };
  } catch (err) {
    console.error(`[tips] totals unavailable: ${(err as Error).message}`);
    return { totals: {}, top: [] };
  }
}
