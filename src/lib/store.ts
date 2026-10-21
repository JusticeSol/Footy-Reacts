import { getRepo } from "./repo";
import { PREMIER_LEAGUE } from "./competitions";
import { currentMatchday } from "./repo/shared";
import type { MatchdaySummary } from "./repo/types";
import type { Highlight, HydratedFixture, HydratedTake, Phase } from "./types";

/**
 * Thin facade over the active repo, so pages import one stable module and stay
 * ignorant of whether they are reading a JSON file or Postgres.
 */

export { TAG_MIN_CONFIDENCE } from "./repo";

export function getFixtureBoard(opts: { days?: number } = {}): Promise<HydratedFixture[]> {
  return getRepo().getFixtureBoard(opts);
}

export type { MatchdaySummary } from "./repo/types";

export function listMatchdays(competitionId: string = PREMIER_LEAGUE.id): Promise<MatchdaySummary[]> {
  return getRepo().listMatchdays(competitionId);
}

export function getMatchdayFixtures(
  matchday: number,
  competitionId: string = PREMIER_LEAGUE.id,
): Promise<HydratedFixture[]> {
  return getRepo().getMatchdayFixtures(matchday, competitionId);
}

/**
 * The board a visitor lands on: the requested matchday if it exists, otherwise
 * the one being played. Falls back to the rolling date window when no fixture
 * carries a matchday number, so the page still works for a competition that
 * does not number its rounds.
 */
export async function getBoard(
  requested?: number,
  competitionId: string = PREMIER_LEAGUE.id,
): Promise<{
  fixtures: HydratedFixture[];
  matchdays: MatchdaySummary[];
  matchday: number | null;
}> {
  const matchdays = await listMatchdays(competitionId);
  const fallback = currentMatchday(matchdays);
  const matchday =
    requested !== undefined && matchdays.some((m) => m.matchday === requested)
      ? requested
      : fallback;

  if (matchday === null) {
    // The date-window fallback lists every competition, so it is only right
    // for the default board.
    const fixtures = competitionId === PREMIER_LEAGUE.id ? await getFixtureBoard() : [];
    return { fixtures, matchdays, matchday: null };
  }

  return { fixtures: await getMatchdayFixtures(matchday, competitionId), matchdays, matchday };
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

export function getFixtureHighlights(fixtureId: string): Promise<Highlight[]> {
  return getRepo().getFixtureHighlights(fixtureId);
}

export function getMatchdayHighlights(matchday: number): Promise<Highlight[]> {
  return getRepo().getMatchdayHighlights(matchday);
}
