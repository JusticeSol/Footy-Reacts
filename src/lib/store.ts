import { getRepo } from "./repo";
import type { HydratedFixture, HydratedTake, Phase } from "./types";

/**
 * Thin facade over the active repo, so pages import one stable module and stay
 * ignorant of whether they are reading a JSON file or Postgres.
 */

export { TAG_MIN_CONFIDENCE } from "./repo";

export function getFixtureBoard(opts: { days?: number } = {}): Promise<HydratedFixture[]> {
  return getRepo().getFixtureBoard(opts);
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
