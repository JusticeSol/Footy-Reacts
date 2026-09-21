import type { Fixture, FixtureStatus, Team } from "../types";

/**
 * Fixture calendar sync.
 *
 * Two providers are supported because their free tiers differ by region:
 *   - footballdata  → football-data.org v4 (X-Auth-Token header)
 *   - apifootball   → API-Football v3, direct or via RapidAPI
 *
 * Both normalise to the same { teams, fixtures } shape, so the rest of the app
 * never learns which one is in use.
 */

export interface FixtureSyncResult {
  teams: Team[];
  fixtures: Fixture[];
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "Arsenal FC" + "Chelsea FC" on 2026-09-19 → "arsenal-vs-chelsea-2026-09-19". */
export function fixtureSlug(home: Team, away: Team, kickoffUtc: string): string {
  const date = kickoffUtc.slice(0, 10);
  return `${slugify(home.shortName)}-vs-${slugify(away.shortName)}-${date}`;
}

/** Fallback when a provider gives no three-letter code. */
export function deriveAbbr(name: string): string {
  const words = name
    .replace(/\b(FC|AFC|CF|SC|United|City)\b/gi, (m) => m)
    .split(/\s+/)
    .filter(Boolean);
  const base = words.length >= 2 ? words.map((w) => w[0]).join("") : name.slice(0, 3);
  return base.slice(0, 3).toUpperCase();
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// --- football-data.org ------------------------------------------------------

const FD_STATUS: Record<string, FixtureStatus> = {
  SCHEDULED: "scheduled",
  TIMED: "scheduled",
  IN_PLAY: "live",
  PAUSED: "live",
  FINISHED: "finished",
  POSTPONED: "postponed",
  SUSPENDED: "postponed",
  CANCELLED: "postponed",
};

interface FdTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
}

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score?: { fullTime?: { home: number | null; away: number | null } };
}

function fdTeam(t: FdTeam): Team {
  const name = t.name ?? t.shortName ?? "Unknown";
  return {
    id: `fd-${t.id}`,
    name,
    shortName: t.shortName ?? name.replace(/\s+(FC|AFC)$/i, ""),
    abbr: t.tla ?? deriveAbbr(name),
    crestUrl: t.crest,
  };
}

async function syncFootballData(opts: {
  apiKey: string;
  competition: string;
  from: Date;
  to: Date;
}): Promise<FixtureSyncResult> {
  const url = new URL(`https://api.football-data.org/v4/competitions/${opts.competition}/matches`);
  url.searchParams.set("dateFrom", isoDate(opts.from));
  url.searchParams.set("dateTo", isoDate(opts.to));

  const res = await fetch(url, { headers: { "X-Auth-Token": opts.apiKey } });
  if (!res.ok) {
    throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { matches?: FdMatch[] };

  const teams = new Map<string, Team>();
  const fixtures: Fixture[] = [];

  for (const m of body.matches ?? []) {
    const home = fdTeam(m.homeTeam);
    const away = fdTeam(m.awayTeam);
    teams.set(home.id, home);
    teams.set(away.id, away);

    const ft = m.score?.fullTime;
    fixtures.push({
      id: `fd-${m.id}`,
      externalId: String(m.id),
      slug: fixtureSlug(home, away, m.utcDate),
      competitionId: `comp-${opts.competition.toLowerCase()}`,
      homeTeamId: home.id,
      awayTeamId: away.id,
      kickoffUtc: m.utcDate,
      status: FD_STATUS[m.status] ?? "scheduled",
      matchday: m.matchday,
      score:
        ft && ft.home !== null && ft.away !== null ? { home: ft.home, away: ft.away } : undefined,
    });
  }

  return { teams: [...teams.values()], fixtures };
}

// --- API-Football v3 --------------------------------------------------------

const AF_LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"]);
const AF_FINISHED = new Set(["FT", "AET", "PEN"]);
const AF_OFF = new Set(["PST", "CANC", "ABD", "SUSP", "AWD", "WO"]);

interface AfFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round?: string };
  teams: {
    home: { id: number; name: string; logo?: string };
    away: { id: number; name: string; logo?: string };
  };
  goals: { home: number | null; away: number | null };
}

function afTeam(t: { id: number; name: string; logo?: string }): Team {
  return {
    id: `af-${t.id}`,
    name: t.name,
    shortName: t.name.replace(/\s+(FC|AFC)$/i, ""),
    abbr: deriveAbbr(t.name),
    crestUrl: t.logo,
  };
}

function afStatus(short: string): FixtureStatus {
  if (AF_LIVE.has(short)) return "live";
  if (AF_FINISHED.has(short)) return "finished";
  if (AF_OFF.has(short)) return "postponed";
  return "scheduled";
}

async function syncApiFootball(opts: {
  apiKey: string;
  league: string;
  season: string;
  from: Date;
  to: Date;
}): Promise<FixtureSyncResult> {
  // Direct api-sports keys and RapidAPI keys use different hosts and headers.
  const viaRapidApi = opts.apiKey.length === 50;
  const host = viaRapidApi ? "api-football-v1.p.rapidapi.com" : "v3.football.api-sports.io";
  const base = viaRapidApi
    ? `https://${host}/v3/fixtures`
    : `https://${host}/fixtures`;

  const url = new URL(base);
  url.searchParams.set("league", opts.league);
  url.searchParams.set("season", opts.season);
  url.searchParams.set("from", isoDate(opts.from));
  url.searchParams.set("to", isoDate(opts.to));

  const headers: Record<string, string> = viaRapidApi
    ? { "x-rapidapi-key": opts.apiKey, "x-rapidapi-host": host }
    : { "x-apisports-key": opts.apiKey };

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`API-Football ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { response?: AfFixture[]; errors?: unknown };
  if (body.errors && Object.keys(body.errors as object).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(body.errors)}`);
  }

  const teams = new Map<string, Team>();
  const fixtures: Fixture[] = [];

  for (const row of body.response ?? []) {
    const home = afTeam(row.teams.home);
    const away = afTeam(row.teams.away);
    teams.set(home.id, home);
    teams.set(away.id, away);

    const matchday = Number(row.league.round?.match(/(\d+)\s*$/)?.[1] ?? NaN);
    fixtures.push({
      id: `af-${row.fixture.id}`,
      externalId: String(row.fixture.id),
      slug: fixtureSlug(home, away, row.fixture.date),
      competitionId: `comp-af-${opts.league}`,
      homeTeamId: home.id,
      awayTeamId: away.id,
      kickoffUtc: new Date(row.fixture.date).toISOString(),
      status: afStatus(row.fixture.status.short),
      matchday: Number.isFinite(matchday) ? matchday : undefined,
      score:
        row.goals.home !== null && row.goals.away !== null
          ? { home: row.goals.home, away: row.goals.away }
          : undefined,
    });
  }

  return { teams: [...teams.values()], fixtures };
}

// --- entry point ------------------------------------------------------------

export async function syncFixtures(
  opts: { daysBack?: number; daysAhead?: number } = {},
): Promise<FixtureSyncResult> {
  // daysBack must cover BOARD_FLOOR_DAYS so results and statuses keep
  // refreshing for every fixture still visible on the board.
  const { daysBack = 5, daysAhead = 14 } = opts;
  const now = Date.now();
  const from = new Date(now - daysBack * 86_400_000);
  const to = new Date(now + daysAhead * 86_400_000);

  const provider = process.env.FIXTURES_PROVIDER ?? "footballdata";

  if (provider === "footballdata") {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY is not set");
    return syncFootballData({
      apiKey,
      competition: process.env.FOOTBALL_DATA_COMPETITION ?? "PL",
      from,
      to,
    });
  }

  if (provider === "apifootball") {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) throw new Error("API_FOOTBALL_KEY is not set");
    return syncApiFootball({
      apiKey,
      league: process.env.API_FOOTBALL_LEAGUE ?? "39",
      season: process.env.API_FOOTBALL_SEASON ?? String(new Date().getFullYear()),
      from,
      to,
    });
  }

  throw new Error(`Unknown FIXTURES_PROVIDER: ${provider}`);
}
