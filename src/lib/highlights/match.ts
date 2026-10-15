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

/** Not this season's Premier League: other teams, other competitions, other eras. */
const OFF_TOPIC = [
  "u17", "u18", "u19", "u21", "u23", "academy", "next gen", "pl2", "premier league 2",
  "women", "wsl", "champions league", "europa", "conference league", "uefa",
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

function namesFor(team: Team): string[] {
  return NAMES[team.id] ?? [normaliseTitle(team.shortName)];
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
  let pair: [string, string] | null = null;
  if (source.kind === "club" && source.teamId) {
    // A club's own channel is one side of every match it posts, even when its
    // title only names the opponent ("TOWN 2 FULHAM 1" on Ipswich's channel).
    const opponent = named.find((id) => id !== source.teamId);
    if (opponent) pair = [source.teamId, opponent];
  } else if (named.length >= 2) {
    pair = [named[0], named[1]];
  }
  if (!pair) return { kind: "reject", reason: `needs two teams, found ${named.length}` };

  // The most recent meeting of the pair, kicked off before the upload.
  const fixture = fixtures
    .filter((f) => {
      const ids = [f.homeTeamId, f.awayTeamId];
      const kickoff = Date.parse(f.kickoffUtc);
      return ids.includes(pair[0]) && ids.includes(pair[1]) && kickoff <= published && published - kickoff <= MATCH_WINDOW_MS;
    })
    .sort((a, b) => Date.parse(b.kickoffUtc) - Date.parse(a.kickoffUtc))[0];
  if (!fixture) return { kind: "reject", reason: "no fixture between those teams in the last 5 days" };

  return { kind: "match", fixtureId: fixture.id, extended: hasWord(text, "extended") };
}
