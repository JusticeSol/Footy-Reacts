import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Creator,
  Fixture,
  FixtureStatus,
  HydratedFixture,
  HydratedTake,
  Phase,
  Take,
  TaggedBy,
  TakeSource,
  Team,
} from "../types";
import type { Repo } from "./types";
import {
  boardWindow,
  byMatchdayOrder,
  countTakes,
  diversify,
  hydrateFixture,
  indexTeams,
  interleaveByCreator,
  summariseMatchdays,
  TAG_MIN_CONFIDENCE,
} from "./shared";

/**
 * Supabase repo — the deployed backing store.
 *
 * Uses the service-role key and is therefore **server-only**: every caller is a
 * server component, a job or a route handler. The key must never reach the
 * browser, which is why it is not prefixed NEXT_PUBLIC_.
 *
 * Row shapes are snake_case (see db/schema.sql); the mappers below are the only
 * place that knows it.
 */

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

// --- row types and mappers --------------------------------------------------

interface TeamRow {
  id: string;
  name: string;
  short_name: string;
  abbr: string;
  crest_url: string | null;
}

interface FixtureRow {
  id: string;
  slug: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_utc: string;
  status: FixtureStatus;
  matchday: number | null;
  score_home: number | null;
  score_away: number | null;
  external_id: string | null;
}

interface CreatorRow {
  id: string;
  name: string;
  handle: string;
  youtube_channel_id: string | null;
  uploads_playlist_id: string | null;
  avatar_url: string | null;
  club_affinity: string[] | null;
  claimed: boolean;
}

interface TakeRow {
  id: string;
  fixture_id: string;
  creator_id: string;
  phase: Phase;
  source: TakeSource;
  external_id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  published_at: string;
  duration_sec: number | null;
  confidence: number;
  tagged_by: TaggedBy;
  unmatched: boolean;
}

const toTeam = (r: TeamRow): Team => ({
  id: r.id,
  name: r.name,
  shortName: r.short_name,
  abbr: r.abbr,
  crestUrl: r.crest_url ?? undefined,
});

const toFixture = (r: FixtureRow): Fixture => ({
  id: r.id,
  slug: r.slug,
  competitionId: r.competition_id,
  homeTeamId: r.home_team_id,
  awayTeamId: r.away_team_id,
  kickoffUtc: new Date(r.kickoff_utc).toISOString(),
  status: r.status,
  matchday: r.matchday ?? undefined,
  score:
    r.score_home !== null && r.score_away !== null
      ? { home: r.score_home, away: r.score_away }
      : undefined,
  externalId: r.external_id ?? undefined,
});

const toCreator = (r: CreatorRow): Creator => ({
  id: r.id,
  name: r.name,
  handle: r.handle,
  youtubeChannelId: r.youtube_channel_id ?? undefined,
  uploadsPlaylistId: r.uploads_playlist_id ?? undefined,
  avatarUrl: r.avatar_url ?? undefined,
  clubAffinity: r.club_affinity ?? [],
  claimed: r.claimed,
});

const toTake = (r: TakeRow): Take => ({
  id: r.id,
  fixtureId: r.fixture_id,
  creatorId: r.creator_id,
  phase: r.phase,
  source: r.source,
  externalId: r.external_id,
  title: r.title,
  url: r.url,
  thumbnailUrl: r.thumbnail_url ?? undefined,
  publishedAt: new Date(r.published_at).toISOString(),
  durationSec: r.duration_sec ?? undefined,
  confidence: r.confidence,
  taggedBy: r.tagged_by,
  unmatched: r.unmatched,
});

const fromTeam = (t: Team) => ({
  id: t.id,
  name: t.name,
  short_name: t.shortName,
  abbr: t.abbr,
  crest_url: t.crestUrl ?? null,
});

const fromFixture = (f: Fixture) => ({
  id: f.id,
  slug: f.slug,
  competition_id: f.competitionId,
  home_team_id: f.homeTeamId,
  away_team_id: f.awayTeamId,
  kickoff_utc: f.kickoffUtc,
  status: f.status,
  matchday: f.matchday ?? null,
  score_home: f.score?.home ?? null,
  score_away: f.score?.away ?? null,
  external_id: f.externalId ?? null,
});

const fromCreator = (c: Creator) => ({
  id: c.id,
  name: c.name,
  handle: c.handle,
  youtube_channel_id: c.youtubeChannelId ?? null,
  uploads_playlist_id: c.uploadsPlaylistId ?? null,
  avatar_url: c.avatarUrl ?? null,
  club_affinity: c.clubAffinity,
  claimed: c.claimed,
});

const fromTake = (t: Take) => ({
  id: t.id,
  fixture_id: t.fixtureId,
  creator_id: t.creatorId,
  phase: t.phase,
  source: t.source,
  external_id: t.externalId,
  title: t.title,
  url: t.url,
  thumbnail_url: t.thumbnailUrl ?? null,
  published_at: t.publishedAt,
  duration_sec: t.durationSec ?? null,
  confidence: t.confidence,
  tagged_by: t.taggedBy,
  unmatched: t.unmatched ?? false,
});

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`Supabase ${context}: ${error.message}`);
}

/** Only takes above the confidence floor are ever shown. */
function visibleTakesQuery(table: "take") {
  return db().from(table).select("*").eq("unmatched", false).gte("confidence", TAG_MIN_CONFIDENCE);
}

export const supabaseRepo: Repo = {
  kind: "supabase",

  async getFixtureBoard(opts = {}) {
    const { floor, horizon } = boardWindow(opts.days ?? 10);

    const [fixturesRes, teamsRes] = await Promise.all([
      db()
        .from("fixture")
        .select("*")
        .gte("kickoff_utc", new Date(floor).toISOString())
        .lte("kickoff_utc", new Date(horizon).toISOString()),
      db().from("team").select("*"),
    ]);
    fail("fixture board", fixturesRes.error);
    fail("teams", teamsRes.error);

    const fixtures = (fixturesRes.data as FixtureRow[]).map(toFixture);
    const teams = indexTeams((teamsRes.data as TeamRow[]).map(toTeam));
    if (fixtures.length === 0) return [];

    const takesRes = await visibleTakesQuery("take").in(
      "fixture_id",
      fixtures.map((f) => f.id),
    );
    fail("take counts", takesRes.error);
    const takes = (takesRes.data as TakeRow[]).map(toTake);

    return fixtures
      .sort(byMatchdayOrder)
      .map((f) => hydrateFixture(f, teams, countTakes(takes, f.id)))
      .filter((f): f is HydratedFixture => f !== null);
  },

  async listMatchdays() {
    const [fixturesRes, takesRes] = await Promise.all([
      db().from("fixture").select("id,matchday,kickoff_utc"),
      db()
        .from("take")
        .select("fixture_id")
        .eq("unmatched", false)
        .gte("confidence", TAG_MIN_CONFIDENCE),
    ]);
    fail("list matchdays", fixturesRes.error);
    fail("matchday take counts", takesRes.error);

    const takesByFixture = new Map<string, number>();
    for (const row of takesRes.data as Array<{ fixture_id: string }>) {
      takesByFixture.set(row.fixture_id, (takesByFixture.get(row.fixture_id) ?? 0) + 1);
    }

    return summariseMatchdays(
      (fixturesRes.data as Array<{ id: string; matchday: number | null; kickoff_utc: string }>).map(
        (r) => ({
          id: r.id,
          matchday: r.matchday ?? undefined,
          kickoffUtc: new Date(r.kickoff_utc).toISOString(),
        }),
      ),
      takesByFixture,
    );
  },

  async getMatchdayFixtures(matchday) {
    const [fixturesRes, teamsRes] = await Promise.all([
      db().from("fixture").select("*").eq("matchday", matchday),
      db().from("team").select("*"),
    ]);
    fail("matchday fixtures", fixturesRes.error);
    fail("teams", teamsRes.error);

    const fixtures = (fixturesRes.data as FixtureRow[]).map(toFixture);
    const teams = indexTeams((teamsRes.data as TeamRow[]).map(toTeam));
    if (fixtures.length === 0) return [];

    const takesRes = await visibleTakesQuery("take").in(
      "fixture_id",
      fixtures.map((f) => f.id),
    );
    fail("take counts", takesRes.error);
    const takes = (takesRes.data as TakeRow[]).map(toTake);

    return fixtures
      .sort(byMatchdayOrder)
      .map((f) => hydrateFixture(f, teams, countTakes(takes, f.id)))
      .filter((f): f is HydratedFixture => f !== null);
  },

  async getFixtureBySlug(slug) {
    const fixtureRes = await db().from("fixture").select("*").eq("slug", slug).maybeSingle();
    fail("fixture by slug", fixtureRes.error);
    if (!fixtureRes.data) return null;
    const fixture = toFixture(fixtureRes.data as FixtureRow);

    const [teamsRes, takesRes] = await Promise.all([
      db().from("team").select("*").in("id", [fixture.homeTeamId, fixture.awayTeamId]),
      visibleTakesQuery("take").eq("fixture_id", fixture.id),
    ]);
    fail("teams", teamsRes.error);
    fail("take counts", takesRes.error);

    const teams = indexTeams((teamsRes.data as TeamRow[]).map(toTeam));
    const takes = (takesRes.data as TakeRow[]).map(toTake);
    return hydrateFixture(fixture, teams, countTakes(takes, fixture.id));
  },

  async getTakes(fixtureId, phase) {
    const takesRes = await visibleTakesQuery("take")
      .eq("fixture_id", fixtureId)
      .eq("phase", phase)
      .order("published_at", { ascending: false });
    fail("takes", takesRes.error);

    const takes = (takesRes.data as TakeRow[]).map(toTake);
    if (takes.length === 0) return [];

    const creatorsRes = await db()
      .from("creator")
      .select("*")
      .in("id", [...new Set(takes.map((t) => t.creatorId))]);
    fail("creators", creatorsRes.error);

    const creators = new Map(
      (creatorsRes.data as CreatorRow[]).map((r) => [r.id, toCreator(r)]),
    );

    const hydrated = takes
      .map((t) => {
        const creator = creators.get(t.creatorId);
        return creator ? { ...t, creator } : null;
      })
      .filter((t): t is HydratedTake => t !== null);

    return interleaveByCreator(hydrated);
  },

  async getRecentTakes(limit = 12) {
    // Over-fetch, because thinning happens after: one creator's upload spree
    // would otherwise fill the whole ticker before any other fixture appeared.
    const takesRes = await visibleTakesQuery("take")
      .order("published_at", { ascending: false })
      .limit(limit * 6);
    fail("recent takes", takesRes.error);

    const takes = diversify((takesRes.data as TakeRow[]).map(toTake), limit);
    if (takes.length === 0) return [];

    const [creatorsRes, fixturesRes] = await Promise.all([
      db()
        .from("creator")
        .select("*")
        .in("id", [...new Set(takes.map((t) => t.creatorId))]),
      db()
        .from("fixture")
        .select("*")
        .in("id", [...new Set(takes.map((t) => t.fixtureId))]),
    ]);
    fail("creators", creatorsRes.error);
    fail("fixtures", fixturesRes.error);

    const creators = new Map(
      (creatorsRes.data as CreatorRow[]).map((r) => [r.id, toCreator(r)]),
    );
    const fixtures = (fixturesRes.data as FixtureRow[]).map(toFixture);

    const teamIds = [...new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]))];
    const teamsRes = await db().from("team").select("*").in("id", teamIds);
    fail("teams", teamsRes.error);
    const teams = indexTeams((teamsRes.data as TeamRow[]).map(toTeam));

    const fixtureById = new Map(fixtures.map((f) => [f.id, f]));

    return takes
      .map((take) => {
        const creator = creators.get(take.creatorId);
        const raw = fixtureById.get(take.fixtureId);
        if (!creator || !raw) return null;
        const fixture = hydrateFixture(raw, teams, { pre: 0, post: 0 });
        if (!fixture) return null;
        return { take: { ...take, creator }, fixture };
      })
      .filter((x): x is { take: HydratedTake; fixture: HydratedFixture } => x !== null);
  },

  async listTeams() {
    const res = await db().from("team").select("*");
    fail("list teams", res.error);
    return (res.data as TeamRow[]).map(toTeam);
  },

  async listFixtures() {
    const res = await db().from("fixture").select("*");
    fail("list fixtures", res.error);
    return (res.data as FixtureRow[]).map(toFixture);
  },

  async listCreators() {
    const res = await db().from("creator").select("*");
    fail("list creators", res.error);
    return (res.data as CreatorRow[]).map(toCreator);
  },

  async listTakeKeys() {
    const res = await db().from("take").select("source,external_id");
    fail("list take keys", res.error);
    return new Set(
      (res.data as Array<{ source: string; external_id: string }>).map(
        (r) => `${r.source}:${r.external_id}`,
      ),
    );
  },

  async listTakes() {
    const res = await db().from("take").select("*");
    fail("list takes", res.error);
    return (res.data as TakeRow[]).map(toTake);
  },

  async upsertTeams(teams) {
    if (teams.length === 0) return;
    const res = await db().from("team").upsert(teams.map(fromTeam), { onConflict: "id" });
    fail("upsert teams", res.error);
  },

  async upsertFixtures(fixtures) {
    if (fixtures.length === 0) return;
    // slug is unique and stable for a given pairing and date, so conflicts on
    // either key resolve to the same row.
    const res = await db().from("fixture").upsert(fixtures.map(fromFixture), { onConflict: "id" });
    fail("upsert fixtures", res.error);
  },

  async upsertCreators(creators) {
    if (creators.length === 0) return;

    // An upsert replaces the whole row, so a caller that does not carry the
    // resolved YouTube ids (the seeder, for one) would null them out and force
    // every channel to be resolved again at quota cost. Merge instead, matching
    // what the JSON repo does — the two must not diverge in behaviour.
    const existingRes = await db()
      .from("creator")
      .select("id,youtube_channel_id,uploads_playlist_id")
      .in(
        "id",
        creators.map((c) => c.id),
      );
    fail("read creators", existingRes.error);

    const existing = new Map(
      (
        existingRes.data as Array<{
          id: string;
          youtube_channel_id: string | null;
          uploads_playlist_id: string | null;
        }>
      ).map((r) => [r.id, r]),
    );

    const rows = creators.map((c) => {
      const prior = existing.get(c.id);
      // A corrected channel id invalidates the playlist cached from the old
      // one; keeping it would poll the wrong (or a dead) playlist forever.
      const channelChanged =
        c.youtubeChannelId !== undefined &&
        prior?.youtube_channel_id != null &&
        c.youtubeChannelId !== prior.youtube_channel_id;

      return {
        ...fromCreator(c),
        youtube_channel_id: c.youtubeChannelId ?? prior?.youtube_channel_id ?? null,
        uploads_playlist_id: channelChanged
          ? null
          : (c.uploadsPlaylistId ?? prior?.uploads_playlist_id ?? null),
      };
    });

    const res = await db().from("creator").upsert(rows, { onConflict: "id" });
    fail("upsert creators", res.error);
  },

  async upsertTakes(takes) {
    if (takes.length === 0) return;

    // A hand-corrected tag outranks anything the pipeline produces later, so
    // those rows are excluded from the write rather than upserted over.
    const manualRes = await db()
      .from("take")
      .select("id")
      .eq("tagged_by", "manual")
      .in(
        "id",
        takes.map((t) => t.id),
      );
    fail("check manual takes", manualRes.error);

    const protectedIds = new Set((manualRes.data as Array<{ id: string }>).map((r) => r.id));
    const writable = takes.filter((t) => !protectedIds.has(t.id));
    if (writable.length === 0) return;

    const res = await db().from("take").upsert(writable.map(fromTake), { onConflict: "id" });
    fail("upsert takes", res.error);
  },

  async setCreatorYouTube(creatorId, channelId, playlistId) {
    const res = await db()
      .from("creator")
      .update({ youtube_channel_id: channelId, uploads_playlist_id: playlistId })
      .eq("id", creatorId);
    fail("update creator", res.error);
  },

  async deleteTakes(ids) {
    if (ids.length === 0) return;
    const res = await db().from("take").delete().in("id", ids);
    fail("delete takes", res.error);
  },

  async deleteCreators(ids) {
    if (ids.length === 0) return;
    // take.creator_id is ON DELETE CASCADE, so their takes go with them.
    const res = await db().from("creator").delete().in("id", ids);
    fail("delete creators", res.error);
  },

  async deleteFixtures(ids) {
    if (ids.length === 0) return;
    // take.fixture_id is ON DELETE CASCADE, so attached takes go with them.
    const res = await db().from("fixture").delete().in("id", ids);
    fail("delete fixtures", res.error);
  },
};
