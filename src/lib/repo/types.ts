import type {
  Creator,
  Fixture,
  HydratedFixture,
  HydratedTake,
  Phase,
  Take,
  Team,
} from "../types";

/**
 * The storage contract.
 *
 * Two implementations: a JSON file for local development, and Supabase for
 * anything deployed. Nothing above this interface knows which is in use.
 *
 * Note the shape of the write methods — they are explicit upserts rather than
 * a read-modify-write of the whole database. That is what makes the same code
 * work against a file and against Postgres.
 */
export interface Repo {
  /** Human-readable name of the backing store, for job logs. */
  readonly kind: "json" | "supabase";

  // --- reads for the UI ---
  getFixtureBoard(opts?: { days?: number }): Promise<HydratedFixture[]>;
  getFixtureBySlug(slug: string): Promise<HydratedFixture | null>;
  getTakes(fixtureId: string, phase: Phase): Promise<HydratedTake[]>;
  getRecentTakes(limit?: number): Promise<Array<{ take: HydratedTake; fixture: HydratedFixture }>>;

  // --- reads for the jobs ---
  listTeams(): Promise<Team[]>;
  listFixtures(): Promise<Fixture[]>;
  listCreators(): Promise<Creator[]>;
  /** Keys of takes already stored, as `${source}:${externalId}`. */
  listTakeKeys(): Promise<Set<string>>;
  /** Every stored take, including ones withheld from the UI. For re-scoring. */
  listTakes(): Promise<Take[]>;

  // --- writes ---
  upsertTeams(teams: Team[]): Promise<void>;
  upsertFixtures(fixtures: Fixture[]): Promise<void>;
  upsertCreators(creators: Creator[]): Promise<void>;
  /** Must never overwrite a take whose `taggedBy` is "manual". */
  upsertTakes(takes: Take[]): Promise<void>;
  setCreatorYouTube(creatorId: string, channelId: string, playlistId: string): Promise<void>;
  /** Removes fixtures and, by cascade, any takes attached to them. */
  deleteFixtures(ids: string[]): Promise<void>;
  /** Removes takes outright. Used when a creator is re-pointed at a different channel. */
  deleteTakes(ids: string[]): Promise<void>;
}
