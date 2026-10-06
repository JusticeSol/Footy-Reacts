import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  Creator,
  Database,
  Fixture,
  HydratedFixture,
  HydratedTake,
  Phase,
  Take,
  Team,
  Tip,
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
  isVisible,
  keepClaim,
  summariseMatchdays,
} from "./shared";

/**
 * JSON-file repo for local development.
 *
 * Writes go to src/data/store.json (gitignored). Falls back to the committed
 * seed so the app always renders, even on a clean checkout.
 */

const DATA_DIR = path.join(process.cwd(), "src", "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");
const SEED_PATH = path.join(DATA_DIR, "seed.json");

const EMPTY: Database = {
  competitions: [],
  teams: [],
  fixtures: [],
  creators: [],
  takes: [],
};

let cache: { db: Database; mtimeMs: number } | null = null;

async function read(): Promise<Database> {
  try {
    const stat = await fs.stat(STORE_PATH);
    if (cache && cache.mtimeMs === stat.mtimeMs) return cache.db;
    const db = JSON.parse(await fs.readFile(STORE_PATH, "utf8")) as Database;
    cache = { db, mtimeMs: stat.mtimeMs };
    return db;
  } catch {
    try {
      const db = JSON.parse(await fs.readFile(SEED_PATH, "utf8")) as Database;
      return { ...EMPTY, ...db };
    } catch {
      return EMPTY;
    }
  }
}

async function write(db: Database): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES") {
      throw new Error(
        "Cannot write the JSON store: this filesystem is read-only. " +
          "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use the Supabase repo instead.",
      );
    }
    throw err;
  }
  cache = null;
}

async function mutate(fn: (db: Database) => void): Promise<void> {
  const db = structuredClone(await read());
  fn(db);
  await write(db);
}

/**
 * Postgres cascades tip rows away with their take; a flat file has no cascade,
 * so every delete that can remove takes calls this to match.
 */
function pruneTips(db: Database): void {
  if (!db.tips) return;
  const live = new Set(db.takes.map((t) => t.id));
  db.tips = db.tips.filter((tip) => live.has(tip.takeId));
}

function visibleTakes(db: Database): Take[] {
  return db.takes.filter(isVisible);
}

export const jsonRepo: Repo = {
  kind: "json",

  async getFixtureBoard(opts = {}) {
    const db = await read();
    const teams = indexTeams(db.teams);
    const takes = visibleTakes(db);
    const { floor, horizon } = boardWindow(opts.days ?? 10);

    return db.fixtures
      .filter((f) => {
        const ko = Date.parse(f.kickoffUtc);
        return ko >= floor && ko <= horizon;
      })
      .sort(byMatchdayOrder)
      .map((f) => hydrateFixture(f, teams, countTakes(takes, f.id)))
      .filter((f): f is HydratedFixture => f !== null);
  },

  async listMatchdays() {
    const db = await read();
    const takesByFixture = new Map<string, number>();
    for (const take of visibleTakes(db)) {
      takesByFixture.set(take.fixtureId, (takesByFixture.get(take.fixtureId) ?? 0) + 1);
    }
    return summariseMatchdays(db.fixtures, takesByFixture);
  },

  async getMatchdayFixtures(matchday) {
    const db = await read();
    const teams = indexTeams(db.teams);
    const takes = visibleTakes(db);

    return db.fixtures
      .filter((f) => f.matchday === matchday)
      .sort(byMatchdayOrder)
      .map((f) => hydrateFixture(f, teams, countTakes(takes, f.id)))
      .filter((f): f is HydratedFixture => f !== null);
  },

  async getFixtureBySlug(slug) {
    const db = await read();
    const fixture = db.fixtures.find((f) => f.slug === slug);
    if (!fixture) return null;
    return hydrateFixture(
      fixture,
      indexTeams(db.teams),
      countTakes(visibleTakes(db), fixture.id),
    );
  },

  async getTakes(fixtureId, phase: Phase) {
    const db = await read();
    const creators = new Map(db.creators.map((c) => [c.id, c]));
    const takes = visibleTakes(db)
      .filter((t) => t.fixtureId === fixtureId && t.phase === phase)
      .map((t) => {
        const creator = creators.get(t.creatorId);
        return creator ? { ...t, creator } : null;
      })
      .filter((t): t is HydratedTake => t !== null);

    return interleaveByCreator(takes);
  },

  async getRecentTakes(limit = 12) {
    const db = await read();
    const teams = indexTeams(db.teams);
    const creators = new Map(db.creators.map((c) => [c.id, c]));
    const fixtures = new Map(db.fixtures.map((f) => [f.id, f]));

    const newest = visibleTakes(db)
      .slice()
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

    return diversify(newest, limit)
      .map((take) => {
        const creator = creators.get(take.creatorId);
        const raw = fixtures.get(take.fixtureId);
        if (!creator || !raw) return null;
        const fixture = hydrateFixture(raw, teams, { pre: 0, post: 0 });
        if (!fixture) return null;
        return { take: { ...take, creator }, fixture };
      })
      .filter((x): x is { take: HydratedTake; fixture: HydratedFixture } => x !== null);
  },

  async listTeams(): Promise<Team[]> {
    return (await read()).teams;
  },

  async listFixtures(): Promise<Fixture[]> {
    return (await read()).fixtures;
  },

  async listCreators(): Promise<Creator[]> {
    return (await read()).creators;
  },

  async listTakeKeys() {
    const db = await read();
    return new Set(db.takes.map((t) => `${t.source}:${t.externalId}`));
  },

  async listTakes() {
    return (await read()).takes;
  },

  async upsertTeams(teams) {
    await mutate((db) => {
      for (const team of teams) {
        const i = db.teams.findIndex((t) => t.id === team.id);
        if (i === -1) db.teams.push(team);
        else db.teams[i] = { ...db.teams[i], ...team };
      }
    });
  },

  async upsertFixtures(fixtures) {
    await mutate((db) => {
      for (const fixture of fixtures) {
        const i = db.fixtures.findIndex((f) => f.id === fixture.id || f.slug === fixture.slug);
        // Keep our own id so existing takes stay attached when a kickoff moves.
        if (i === -1) db.fixtures.push(fixture);
        else db.fixtures[i] = { ...db.fixtures[i], ...fixture, id: db.fixtures[i].id };
      }
    });
  },

  async upsertCreators(creators) {
    await mutate((db) => {
      for (const creator of creators) {
        const i = db.creators.findIndex((c) => c.id === creator.id);
        if (i === -1) {
          db.creators.push(creator);
          continue;
        }
        const prior = db.creators[i];
        const merged = { ...prior, ...creator, ...keepClaim(creator, prior) };
        // A corrected channel id invalidates the playlist cached from the old
        // one; keeping it would poll the wrong (or a dead) playlist forever.
        if (
          creator.youtubeChannelId !== undefined &&
          prior.youtubeChannelId != null &&
          creator.youtubeChannelId !== prior.youtubeChannelId
        ) {
          merged.uploadsPlaylistId = creator.uploadsPlaylistId;
        }
        db.creators[i] = merged;
      }
    });
  },

  async upsertTakes(takes) {
    await mutate((db) => {
      for (const take of takes) {
        const i = db.takes.findIndex((t) => t.id === take.id);
        if (i === -1) db.takes.push(take);
        else if (db.takes[i].taggedBy !== "manual") db.takes[i] = { ...db.takes[i], ...take };
      }
    });
  },

  async setCreatorYouTube(creatorId, channelId, playlistId) {
    await mutate((db) => {
      const creator = db.creators.find((c) => c.id === creatorId);
      if (!creator) return;
      creator.youtubeChannelId = channelId;
      creator.uploadsPlaylistId = playlistId;
    });
  },

  async deleteTakes(ids) {
    if (ids.length === 0) return;
    const doomed = new Set(ids);
    await mutate((db) => {
      db.takes = db.takes.filter((t) => !doomed.has(t.id));
      pruneTips(db);
    });
  },

  async deleteCreators(ids) {
    if (ids.length === 0) return;
    const doomed = new Set(ids);
    await mutate((db) => {
      db.creators = db.creators.filter((c) => !doomed.has(c.id));
      db.takes = db.takes.filter((t) => !doomed.has(t.creatorId));
      pruneTips(db);
    });
  },

  async deleteFixtures(ids) {
    if (ids.length === 0) return;
    const doomed = new Set(ids);
    await mutate((db) => {
      db.fixtures = db.fixtures.filter((f) => !doomed.has(f.id));
      // No cascade in a flat file, so takes are removed explicitly.
      db.takes = db.takes.filter((t) => !doomed.has(t.fixtureId));
      pruneTips(db);
    });
  },

  async recordTips(tips) {
    let added = 0;
    if (tips.length === 0) return added;
    await mutate((db) => {
      const held = new Set((db.tips ?? []).map((t) => t.id));
      db.tips ??= [];
      for (const tip of tips) {
        if (held.has(tip.id)) continue;
        db.tips.push(tip);
        held.add(tip.id);
        added += 1;
      }
    });
    return added;
  },

  async getTipsForTakes(takeIds) {
    const wanted = new Set(takeIds);
    return ((await read()).tips ?? []).filter((tip) => wanted.has(tip.takeId));
  },

  async listTipsBy(filter) {
    const tips = (await read()).tips ?? [];
    if ("from" in filter) return tips.filter((t) => t.from === filter.from.toLowerCase());
    const wanted = new Set(filter.creatorIds);
    return tips.filter((t) => wanted.has(t.creatorId));
  },

  async listTipIds() {
    return new Set(((await read()).tips ?? []).map((tip) => tip.id));
  },

  async setCreatorPayout(creatorId, payoutAddress) {
    await mutate((db) => {
      const creator = db.creators.find((c) => c.id === creatorId);
      if (!creator) return;
      creator.claimed = true;
      creator.payoutAddress = payoutAddress;
    });
  },
};
