import type { Fixture, Team } from "../types";
import type { HighlightSource } from "./sources";

/**
 * Decides whether an official upload is a Premier League highlight, and what
 * it belongs to: one fixture, or (for the league's weekly compilation) one
 * matchday. Pure, so `npm run check:highlights` can pin its behaviour.
 *
 * Deliberately stricter than the take tagger. A wrong highlight is a broadcast
 * of the wrong match, so anything uncertain is dropped rather than guessed.
 */

export type HighlightMatch =
  | { kind: "match"; fixtureId: string; extended: boolean }
  | { kind: "matchday"; matchday: number }
  | { kind: "reject"; reason: string };

/**
 * Team names as highlight titles write them. Its own list rather than the
 * tagger's: the tagger accepts bare "city" and "united", which would read
 * "Coventry City" as Man City and "Leeds United" as Man United.
 */
const NAMES: Record<string, string[]> = {
  "fd-57": ["arsenal", "gunners"],
  "fd-58": ["aston villa", "villa"],
  "fd-1044": ["bournemouth", "afcb", "cherries"],
  "fd-402": ["brentford", "bees"],
  "fd-397": ["brighton", "seagulls"],
  "fd-61": ["chelsea"],
  "fd-1076": ["coventry", "sky blues"],
  "fd-354": ["crystal palace", "palace", "eagles"],
  "fd-62": ["everton", "toffees"],
  "fd-63": ["fulham", "cottagers"],
  "fd-322": ["hull", "tigers"],
  "fd-349": ["ipswich", "tractor boys"],
  "fd-341": ["leeds"],
  "fd-64": ["liverpool"],
  "fd-65": ["man city", "manchester city", "mancity"],
  "fd-66": ["man utd", "man united", "manchester united", "mufc"],
  "fd-67": ["newcastle", "magpies", "toon"],
  "fd-351": ["nottingham forest", "nottm forest", "forest"],
  "fd-71": ["sunderland", "black cats"],
  "fd-73": ["tottenham", "spurs"],
  "fd-563": ["west ham", "hammers"],
};

/**
 * Not this season's Premier League or Champions League: other teams, other
 * competitions, other eras. ("uefa" alone is fine: it opens every Champions
 * League title.)
 */
const OFF_TOPIC = [
  "u17", "u18", "u19", "u21", "u23", "academy", "next gen", "pl2", "premier league 2",
  "women", "wsl", "europa", "conference league", "youth league",
  "carabao", "fa cup", "efl", "trophy", "friendly", "pre season", "preseason",
  "classic", "legends", "rewind", "archive", "on this day", "espanol", "en espanol",
];

const MATCH_WINDOW_MS = 5 * 86_400_000;

export function normaliseTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasWord(text: string, phrase: string): boolean {
  return new RegExp(`(^|\\s)${phrase.replace(/\s+/g, "\\s+")}(\\s|$)`).test(text);
}

/** Words too common to identify a club on their own. */
const GENERIC = new Set([
  "fc", "afc", "cf", "sc", "ac", "as", "sv", "fk", "sk", "pae", "cp", "bk", "if", "rc", "club", "de", "del", "la",
  "united", "city", "real", "sporting", "athletic", "atletico de", "football", "calcio", "1907", "1899",
]);

/**
 * Names for a team without a curated entry (the Champions League opponents):
 * its short name, its full name without suffixes, its three-letter code, and
 * any distinctive word of four letters or more ("atleti", "atletico", "psg",
 * "aek", "bayern").
 */
function fallbackNames(team: Team): string[] {
  const short = normaliseTitle(team.shortName);
  const full = normaliseTitle(team.name);
  const words = [...short.split(" "), ...full.split(" ")].filter((w) => w.length >= 4 && !GENERIC.has(w));
  const code = team.abbr && /^[A-Za-z]{3}$/.test(team.abbr) ? [team.abbr.toLowerCase()] : [];
  return [...new Set([short, full, ...words, ...code])].filter((n) => n.length >= 3 && !GENERIC.has(n));
}

function namesFor(team: Team): string[] {
  return NAMES[team.id] ?? fallbackNames(team);
}

/** Team ids named in a title, in the order they first appear. */
export function teamsInTitle(title: string, teams: Team[]): string[] {
  const text = normaliseTitle(title);
  const found: Array<{ id: string; at: number }> = [];
  for (const team of teams) {
    let first = Infinity;
    for (const name of namesFor(team)) {
      const m = new RegExp(`(^|\\s)${name.replace(/\s+/g, "\\s+")}(\\s|$)`).exec(text);
      if (m) first = Math.min(first, m.index);
    }
    if (first !== Infinity) found.push({ id: team.id, at: first });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.id);
}

/** The league's weekly all-goals video: "EVERY Weekend Goal | Matchweek 6 | ...". */
function compilationMatchday(text: string): number | null {
  const week = /(?:^|\s)(?:matchweek|match week|mw|gameweek|gw)\s?(\d{1,2})(?:\s|$)/.exec(text);
  if (!week) return null;
  const isGoals = hasWord(text, "goals") || hasWord(text, "goal") || hasWord(text, "highlights");
  return isGoals ? Number(week[1]) : null;
}

export function matchHighlight(
  video: { title: string; publishedAt: string },
  source: HighlightSource,
  fixtures: Fixture[],
  teams: Team[],
): HighlightMatch {
  const text = normaliseTitle(video.title);
  const offTopic = OFF_TOPIC.find((w) => hasWord(text, w));
  if (offTopic) return { kind: "reject", reason: `off-topic: ${offTopic}` };

  const published = Date.parse(video.publishedAt);

  if (source.kind === "league") {
    const matchday = compilationMatchday(text);
    if (matchday === null) return { kind: "reject", reason: "not a matchweek compilation" };
    // Only a matchday that has actually been played, and recently.
    const played = fixtures.some(
      (f) => f.matchday === matchday && Date.parse(f.kickoffUtc) <= published && published - Date.parse(f.kickoffUtc) <= MATCH_WINDOW_MS,
    );
    return played ? { kind: "matchday", matchday } : { kind: "reject", reason: `matchweek ${matchday} not just played` };
  }

  if (!hasWord(text, "highlights") && !hasWord(text, "highlight")) {
    return { kind: "reject", reason: "not a highlights upload" };
  }

  const named = teamsInTitle(video.title, teams);
  // Candidate pairings. A club's own channel is one side of every match it
  // posts, even when its title only names the opponent ("TOWN 2 FULHAM 1" on
  // Ipswich's channel). Otherwise any two named teams: a title can name a third
  // club in passing, so every pair is tried rather than the first two.
  const pairs: Array<[string, string]> = [];
  if (source.kind === "club" && source.teamId) {
    for (const id of named) if (id !== source.teamId) pairs.push([source.teamId, id]);
  } else {
    for (let i = 0; i < named.length; i += 1) for (let j = i + 1; j < named.length; j += 1) pairs.push([named[i], named[j]]);
  }
  if (pairs.length === 0) return { kind: "reject", reason: `needs two teams, found ${named.length}` };

  // The most recent meeting of a named pair, kicked off before the upload.
  const recent = fixtures.filter((f) => {
    const kickoff = Date.parse(f.kickoffUtc);
    return kickoff <= published && published - kickoff <= MATCH_WINDOW_MS;
  });
  const fixture = recent
    .filter((f) => pairs.some(([a, b]) => [f.homeTeamId, f.awayTeamId].includes(a) && [f.homeTeamId, f.awayTeamId].includes(b) && a !== b))
    .sort((a, b) => Date.parse(b.kickoffUtc) - Date.parse(a.kickoffUtc))[0];
  if (!fixture) return { kind: "reject", reason: "no fixture between those teams in the last 5 days" };

  return { kind: "match", fixtureId: fixture.id, extended: hasWord(text, "extended") };
}
