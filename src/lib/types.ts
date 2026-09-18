/**
 * Core domain model for Red React.
 *
 * Field names deliberately mirror the Postgres schema in db/schema.sql so the
 * JSON dev store and a future Supabase backend stay interchangeable.
 */

export type Phase = "pre" | "post";
export type FixtureStatus = "scheduled" | "live" | "finished" | "postponed";
export type TakeSource = "youtube" | "x";
export type TaggedBy = "heuristic" | "agent" | "manual";

export interface Team {
  id: string;
  name: string;
  /** Display name on the fixture row, e.g. "Arsenal". */
  shortName: string;
  /** Three-letter board abbreviation, e.g. "ARS". */
  abbr: string;
  crestUrl?: string;
}

export interface Competition {
  id: string;
  /** Provider code, e.g. "PL". */
  code: string;
  name: string;
}

export interface Fixture {
  id: string;
  /** URL key: "arsenal-vs-chelsea-2026-09-19". */
  slug: string;
  competitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  /** ISO-8601, always UTC. */
  kickoffUtc: string;
  status: FixtureStatus;
  matchday?: number;
  score?: { home: number; away: number };
  /** Provider's own id, used to de-duplicate on re-sync. */
  externalId?: string;
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  youtubeChannelId?: string;
  /** Derived once from the channel id; polling this costs 1 quota unit. */
  uploadsPlaylistId?: string;
  avatarUrl?: string;
  /** Team ids this creator covers — the pre-filter's strongest signal. */
  clubAffinity: string[];
  /** Creator has claimed the profile (Phase 2: unlocks payouts). */
  claimed: boolean;
}

export interface Take {
  id: string;
  fixtureId: string;
  creatorId: string;
  phase: Phase;
  source: TakeSource;
  /** YouTube video id, or tweet id. */
  externalId: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  publishedAt: string;
  durationSec?: number;
  /** 0–1 tagging confidence; below TAG_MIN_CONFIDENCE it stays unpublished. */
  confidence: number;
  taggedBy: TaggedBy;
  /** Set when a take was ingested but could not be tied to a fixture. */
  unmatched?: boolean;
}

export interface Database {
  competitions: Competition[];
  teams: Team[];
  fixtures: Fixture[];
  creators: Creator[];
  takes: Take[];
}

/** A take joined to the creator and fixture it belongs to, for rendering. */
export interface HydratedTake extends Take {
  creator: Creator;
}

/** A fixture joined to its teams plus take counts, for the fixture list. */
export interface HydratedFixture extends Fixture {
  homeTeam: Team;
  awayTeam: Team;
  counts: { pre: number; post: number };
}
