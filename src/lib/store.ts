import { getRepo } from "./repo";
import { PREMIER_LEAGUE } from "./competitions";
import { currentMatchday, pairedMatchday } from "./repo/shared";
import { sourceById } from "./highlights/sources";
import { buildPostPack, type PostPack } from "./studio";
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

/** First kickoff of the Premier League round the default board is showing. */
async function currentLeagueRoundStart(): Promise<string | null> {
  const league = await listMatchdays(PREMIER_LEAGUE.id);
  const md = currentMatchday(league);
  return league.find((m) => m.matchday === md)?.firstKickoff ?? null;
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
  const fallback =
    competitionId === PREMIER_LEAGUE.id
      ? currentMatchday(matchdays)
      : pairedMatchday(matchdays, await currentLeagueRoundStart());
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

/** Today's drafts for the X account, for /studio. */
export async function getPostPack(siteUrl: string, now: number = Date.now()): Promise<PostPack> {
  const recent = (await getRepo().getRecentTakes(150)).filter(
    ({ take }) => now - Date.parse(take.publishedAt) <= 48 * 3_600_000,
  );
  // Recent takes carry their fixture without take counts; the most-reacted
  // draft needs the real ones.
  const slugs = [...new Set(recent.map(({ fixture }) => fixture.slug))];
  const full = await Promise.all(slugs.map((s) => getRepo().getFixtureBySlug(s)));
  const byId = new Map(full.filter((f) => f !== null).map((f) => [f.id, f]));
  const rows = recent.map((r) => ({ ...r, fixture: byId.get(r.fixture.id) ?? r.fixture }));
  return buildPostPack(rows, siteUrl, now);
}

export function getFixtureHighlights(fixtureId: string): Promise<Highlight[]> {
  return getRepo().getFixtureHighlights(fixtureId);
}

/**
 * A matchday's all-goals compilations from that competition's own channel.
 * Stored rows carry only the matchday number, and Premier League matchweek 3
 * is not Champions League matchday 3, so the source decides.
 */
export async function getMatchdayHighlights(
  matchday: number,
  competitionId: string = PREMIER_LEAGUE.id,
): Promise<Highlight[]> {
  const all = await getRepo().getMatchdayHighlights(matchday);
  return all.filter((h) => sourceById(h.sourceId)?.competitionId === competitionId);
}
