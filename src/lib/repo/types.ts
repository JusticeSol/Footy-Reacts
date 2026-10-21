import type {
  Creator,
  Fixture,
  Highlight,
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
export interface MatchdaySummary {
  matchday: number;
  fixtures: number;
  /** Visible takes across the matchday — decides which one a visitor lands on. */
  takes: number;
  /** Earliest kickoff in the matchday — used to pick the current one. */
  firstKickoff: string;
  lastKickoff: string;
}

export interface Repo {
  /** Human-readable name of the backing store, for job logs. */
  readonly kind: "json" | "supabase";

  // --- reads for the UI ---
  getFixtureBoard(opts?: { days?: number }): Promise<HydratedFixture[]>;
  /**
   * Every matchday held in the store, oldest first, for the archive nav. Pass a
   * competition id: competitions number their rounds independently, so
   * "matchday 3" across all of them would mix two different rounds.
   */
  listMatchdays(competitionId?: string): Promise<MatchdaySummary[]>;
  getMatchdayFixtures(matchday: number, competitionId?: string): Promise<HydratedFixture[]>;
  getFixtureBySlug(slug: string): Promise<HydratedFixture | null>;
  getTakes(fixtureId: string, phase: Phase): Promise<HydratedTake[]>;
  getRecentTakes(limit?: number): Promise<Array<{ take: HydratedTake; fixture: HydratedFixture }>>;
  /**
   * Official highlights for one fixture, and the league's compilations for one
   * matchday. Both return [] when the store predates highlights, so the pages
   * keep working before the table exists.
   */
  getFixtureHighlights(fixtureId: string): Promise<Highlight[]>;
  getMatchdayHighlights(matchday: number): Promise<Highlight[]>;

  // --- reads for the jobs ---
  listTeams(): Promise<Team[]>;
  listFixtures(): Promise<Fixture[]>;
  listCreators(): Promise<Creator[]>;
  /** Keys of takes already stored, as `${source}:${externalId}`. */
  listTakeKeys(): Promise<Set<string>>;
  /** Every stored take, including ones withheld from the UI. For re-scoring. */
  listTakes(): Promise<Take[]>;
  /** Video ids of highlights already stored, so the sync only looks at new uploads. */
  listHighlightVideoIds(): Promise<Set<string>>;

  // --- writes ---
  upsertTeams(teams: Team[]): Promise<void>;
  upsertFixtures(fixtures: Fixture[]): Promise<void>;
  upsertCreators(creators: Creator[]): Promise<void>;
  /** Must never overwrite a take whose `taggedBy` is "manual". */
  upsertTakes(takes: Take[]): Promise<void>;
  upsertHighlights(highlights: Highlight[]): Promise<void>;
  setCreatorYouTube(creatorId: string, channelId: string, playlistId: string): Promise<void>;
  /** Removes fixtures and, by cascade, any takes attached to them. */
  deleteFixtures(ids: string[]): Promise<void>;
  /** Removes takes outright. Used when a creator is re-pointed at a different channel. */
  deleteTakes(ids: string[]): Promise<void>;
  /** Removes creators and, by cascade, their takes. Honours an opt-out request. */
  deleteCreators(ids: string[]): Promise<void>;
}
