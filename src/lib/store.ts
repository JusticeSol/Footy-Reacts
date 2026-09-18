import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  Database,
  Fixture,
  HydratedFixture,
  HydratedTake,
  Phase,
  Take,
  Team,
} from "./types";

/**
 * JSON-file store for development.
 *
 * Everything the app reads goes through the functions below, so swapping in
 * Supabase later means reimplementing this file — not touching the UI.
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

/** Takes below this confidence are ingested but withheld from the UI. */
export const TAG_MIN_CONFIDENCE = 0.55;

let cache: { db: Database; mtimeMs: number } | null = null;

async function readRaw(): Promise<Database> {
  try {
    const stat = await fs.stat(STORE_PATH);
    if (cache && cache.mtimeMs === stat.mtimeMs) return cache.db;
    const db = JSON.parse(await fs.readFile(STORE_PATH, "utf8")) as Database;
    cache = { db, mtimeMs: stat.mtimeMs };
    return db;
  } catch {
    // No store yet — fall back to the committed seed so the app always renders.
    try {
      const db = JSON.parse(await fs.readFile(SEED_PATH, "utf8")) as Database;
      return { ...EMPTY, ...db };
    } catch {
      return EMPTY;
    }
  }
}

export async function loadDb(): Promise<Database> {
  return readRaw();
}

export async function saveDb(db: Database): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(db, null, 2), "utf8");
  cache = null;
}

/** Read-modify-write helper used by the sync scripts. */
export async function mutate(fn: (db: Database) => void | Promise<void>): Promise<Database> {
  const db = structuredClone(await loadDb());
  await fn(db);
  await saveDb(db);
  return db;
}

// --- queries ----------------------------------------------------------------

function indexTeams(teams: Team[]): Map<string, Team> {
  return new Map(teams.map((t) => [t.id, t]));
}

function visible(takes: Take[]): Take[] {
  return takes.filter((t) => !t.unmatched && t.confidence >= TAG_MIN_CONFIDENCE);
}

function hydrateFixture(f: Fixture, teams: Map<string, Team>, takes: Take[]): HydratedFixture | null {
  const homeTeam = teams.get(f.homeTeamId);
  const awayTeam = teams.get(f.awayTeamId);
  if (!homeTeam || !awayTeam) return null;
  const mine = takes.filter((t) => t.fixtureId === f.id);
  return {
    ...f,
    homeTeam,
    awayTeam,
    counts: {
      pre: mine.filter((t) => t.phase === "pre").length,
      post: mine.filter((t) => t.phase === "post").length,
    },
  };
}

/**
 * Matchday-ordered fixture list: anything kicking off inside the window,
 * soonest first, with live games floated to the top.
 */
export async function getFixtureBoard(opts: { days?: number } = {}): Promise<HydratedFixture[]> {
  const { days = 10 } = opts;
  const db = await loadDb();
  const teams = indexTeams(db.teams);
  const takes = visible(db.takes);
  const now = Date.now();
  const horizon = now + days * 86_400_000;
  // Keep yesterday's games around so post-match takes have somewhere to live.
  const floor = now - 2 * 86_400_000;

  return db.fixtures
    .filter((f) => {
      const ko = Date.parse(f.kickoffUtc);
      return ko >= floor && ko <= horizon;
    })
    .map((f) => hydrateFixture(f, teams, takes))
    .filter((f): f is HydratedFixture => f !== null)
    .sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      return Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc);
    });
}

export async function getFixtureBySlug(slug: string): Promise<HydratedFixture | null> {
  const db = await loadDb();
  const fixture = db.fixtures.find((f) => f.slug === slug);
  if (!fixture) return null;
  return hydrateFixture(fixture, indexTeams(db.teams), visible(db.takes));
}

export async function getTakes(fixtureId: string, phase: Phase): Promise<HydratedTake[]> {
  const db = await loadDb();
  const creators = new Map(db.creators.map((c) => [c.id, c]));
  return visible(db.takes)
    .filter((t) => t.fixtureId === fixtureId && t.phase === phase)
    .map((t) => {
      const creator = creators.get(t.creatorId);
      return creator ? { ...t, creator } : null;
    })
    .filter((t): t is HydratedTake => t !== null)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

/** Most recently tagged takes — the vidiprinter ticker under the masthead. */
export async function getRecentTakes(limit = 12): Promise<
  Array<{ take: HydratedTake; fixture: HydratedFixture }>
> {
  const db = await loadDb();
  const teams = indexTeams(db.teams);
  const creators = new Map(db.creators.map((c) => [c.id, c]));
  const fixtures = new Map(db.fixtures.map((f) => [f.id, f]));

  return visible(db.takes)
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit)
    .map((take) => {
      const creator = creators.get(take.creatorId);
      const raw = fixtures.get(take.fixtureId);
      if (!creator || !raw) return null;
      const fixture = hydrateFixture(raw, teams, []);
      if (!fixture) return null;
      return { take: { ...take, creator }, fixture };
    })
    .filter((x): x is { take: HydratedTake; fixture: HydratedFixture } => x !== null);
}
