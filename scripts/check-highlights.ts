import { matchHighlight, type HighlightMatch } from "../src/lib/highlights/match";
import { pickMatchHighlights, pickMatchdayHighlight } from "../src/lib/highlights/select";
import { sourceById } from "../src/lib/highlights/sources";
import type { Fixture, Highlight, Team } from "../src/lib/types";

/**
 * Pins highlight matching and the country-aware choice of version. Every title
 * below is a real upload seen on 2026-10-16. Needs no API keys:
 *
 *   npm run check:highlights
 */

const team = (id: string, name: string, shortName: string, abbr: string): Team => ({ id, name, shortName, abbr });
const TEAMS: Team[] = [
  team("fd-57", "Arsenal FC", "Arsenal", "ARS"),
  team("fd-61", "Chelsea FC", "Chelsea", "CHE"),
  team("fd-62", "Everton FC", "Everton", "EVE"),
  team("fd-63", "Fulham FC", "Fulham", "FUL"),
  team("fd-64", "Liverpool FC", "Liverpool", "LIV"),
  team("fd-65", "Manchester City FC", "Man City", "MCI"),
  team("fd-66", "Manchester United FC", "Man United", "MUN"),
  team("fd-67", "Newcastle United FC", "Newcastle", "NEW"),
  team("fd-73", "Tottenham Hotspur FC", "Tottenham", "TOT"),
  team("fd-322", "Hull City AFC", "Hull City", "HUL"),
  team("fd-341", "Leeds United FC", "Leeds United", "LEE"),
  team("fd-349", "Ipswich Town FC", "Ipswich Town", "IPS"),
  team("fd-1076", "Coventry City FC", "Coventry City", "COV"),
];

const fixture = (id: string, home: string, away: string, kickoffUtc: string, matchday = 6): Fixture => ({
  id, slug: id, competitionId: "PL", homeTeamId: home, awayTeamId: away, kickoffUtc, status: "finished", matchday,
});
const FIXTURES: Fixture[] = [
  fixture("mun-tot", "fd-66", "fd-73", "2026-10-10T16:30:00Z"),
  fixture("ips-ful", "fd-349", "fd-63", "2026-10-10T14:00:00Z"),
  fixture("cov-new", "fd-1076", "fd-67", "2026-10-11T13:00:00Z"),
  fixture("hul-eve", "fd-322", "fd-62", "2026-10-11T15:30:00Z"),
  fixture("liv-mci", "fd-64", "fd-65", "2026-10-11T15:30:00Z"),
  fixture("ars-lee", "fd-57", "fd-341", "2026-10-11T14:00:00Z"),
];

const SAT_NIGHT = "2026-10-10T20:00:00Z";
const SUN_NIGHT = "2026-10-11T20:00:00Z";

const cases: Array<{ title: string; source: string; published: string; expect: string }> = [
  // Broadcasters name both teams.
  { title: "Spurs snatch LATE point in fiery Old Trafford clash | Man Utd 1-1 Spurs | Premier League Highlights", source: "sky", published: SAT_NIGHT, expect: "match mun-tot" },
  { title: "Coventry City v. Newcastle United | PREMIER LEAGUE HIGHLIGHTS | 10/11/2026 | NBC Sports", source: "nbc", published: SUN_NIGHT, expect: "match cov-new" },
  { title: "Cagliari v. Juventus (En Español) | SERIE A HIGHLIGHTS | 10/11/2026", source: "nbc", published: SUN_NIGHT, expect: "reject" },
  { title: "Rampant R's cruise past Rams! | QPR 4-1 Derby | EFL Highlights", source: "sky", published: SUN_NIGHT, expect: "reject" },
  // A club's channel is one side of the match even when only the opponent is named.
  { title: "Man Utd 1-1 Spurs | Extended Highlights", source: "club-fd-66", published: SUN_NIGHT, expect: "match mun-tot extended" },
  { title: "HIGHLIGHTS | TOWN 2 FULHAM 1", source: "club-fd-349", published: SAT_NIGHT, expect: "match ips-ful" },
  { title: "Hull City 2-2 Everton | EXTENDED Premier League highlights", source: "club-fd-62", published: SUN_NIGHT, expect: "match hul-eve extended" },
  { title: "EXTENDED HIGHLIGHTS | Liverpool 0-3 Man City | Haaland, Doku", source: "club-fd-65", published: SUN_NIGHT, expect: "match liv-mci extended" },
  // Not this season's Premier League.
  { title: "Reading U18 0-3 Chelsea U18 | HIGHLIGHTS | U18 Premier League", source: "club-fd-61", published: SUN_NIGHT, expect: "reject" },
  { title: "HIGHLIGHTS | Man City 2-4 PSG | Six goal thriller at the Etihad", source: "club-fd-65", published: SUN_NIGHT, expect: "reject" },
  { title: "Highlights: LASK 3-6 Liverpool", source: "club-fd-64", published: SUN_NIGHT, expect: "reject" },
  // A real match, but the upload is too long after it to be its highlights.
  { title: "Man Utd 1-1 Spurs | Highlights", source: "club-fd-66", published: "2026-10-20T12:00:00Z", expect: "reject" },
  // The league: weekly compilations only.
  { title: "EVERY Weekend Goal | Matchweek 6 | 2026/27 Premier League Highlights", source: "league", published: "2026-10-12T09:00:00Z", expect: "matchday 6" },
  { title: "THRILLER At Goodison! | Everton v Chelsea | Classic Premier League", source: "league", published: SUN_NIGHT, expect: "reject" },
  { title: "EVERY Weekend Goal | Matchweek 9 | 2026/27 Premier League Highlights", source: "league", published: "2026-10-12T09:00:00Z", expect: "reject" },
];

const describe = (m: HighlightMatch): string =>
  m.kind === "match" ? `match ${m.fixtureId}${m.extended ? " extended" : ""}` : m.kind === "matchday" ? `matchday ${m.matchday}` : "reject";

let failures = 0;
for (const c of cases) {
  const source = sourceById(c.source);
  if (!source) throw new Error(`unknown source ${c.source}`);
  const got = matchHighlight({ title: c.title, publishedAt: c.published }, source, FIXTURES, TEAMS);
  const ok = describe(got) === c.expect;
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${c.expect.padEnd(24)} ${ok ? "" : `got ${describe(got)}${got.kind === "reject" ? ` (${got.reason})` : ""}  `}${c.title.slice(0, 70)}`);
}

// --- which version each visitor is shown ---------------------------------------
const hl = (id: string, sourceId: string, extra: Partial<Highlight> = {}): Highlight => ({
  id, kind: "match", fixtureId: "mun-tot", sourceId, videoId: id, title: id, publishedAt: SUN_NIGHT,
  extended: false, embeddable: true, ...extra,
});
const munTot = FIXTURES[0];
const versions = [
  hl("sky", "sky", { regionsAllowed: ["GB", "IE", "GG", "GI", "IM", "JE"] }),
  hl("nbc", "nbc", { regionsAllowed: ["US", "PR", "GU", "MP", "VI"] }),
  hl("home-ext", "club-fd-66", { extended: true }),
  hl("home", "club-fd-66"),
  hl("away", "club-fd-73"),
];
const picks: Array<{ name: string; got?: string; expect: string }> = [
  { name: "UK visitor gets Sky", got: pickMatchHighlights(versions, munTot, "GB").main?.id, expect: "sky" },
  { name: "US visitor gets NBC", got: pickMatchHighlights(versions, munTot, "US").main?.id, expect: "nbc" },
  { name: "elsewhere: the home club's standard cut", got: pickMatchHighlights(versions, munTot, "NG").main?.id, expect: "home" },
  { name: "unknown country: no region-locked version", got: pickMatchHighlights(versions, munTot).main?.id, expect: "home" },
  {
    name: "embedding off everywhere: link out instead",
    got: pickMatchHighlights([hl("ars", "club-fd-66", { embeddable: false })], munTot, "NG").watchOnYouTube?.id,
    expect: "ars",
  },
  {
    name: "matchday compilation plays worldwide",
    got: pickMatchdayHighlight([hl("weekly", "league", { kind: "matchday", fixtureId: undefined, matchday: 6 })], "NG")?.id,
    expect: "weekly",
  },
];
for (const p of picks) {
  const ok = p.got === p.expect;
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${p.name}${ok ? "" : ` (expected ${p.expect}, got ${p.got})`}`);
}

console.log(`\n${cases.length + picks.length - failures}/${cases.length + picks.length} passed`);
if (failures > 0) process.exit(1);
