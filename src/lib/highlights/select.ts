import type { Fixture, Highlight } from "../types";
import { sourceById } from "./sources";

/**
 * Chooses what a visitor sees, given where they are. Pure, so it is checked
 * by `npm run check:highlights`.
 *
 * `country` is the visitor's ISO 3166 alpha-2 code from the host's geo header,
 * or undefined when it is not known (local dev): then only unrestricted
 * videos count as playable.
 */

export function playableIn(h: Highlight, country?: string): boolean {
  if (!h.embeddable) return false;
  if (h.regionsAllowed) return country ? h.regionsAllowed.includes(country) : false;
  if (h.regionsBlocked && country) return !h.regionsBlocked.includes(country);
  return true;
}

/** Could the visitor watch it on YouTube itself, embedding aside? */
function watchableIn(h: Highlight, country?: string): boolean {
  if (h.regionsAllowed) return country ? h.regionsAllowed.includes(country) : false;
  if (h.regionsBlocked && country) return !h.regionsBlocked.includes(country);
  return true;
}

/**
 * Preference: a broadcaster that serves the visitor's country (neutral, and
 * covers both teams), then the home club, then the away club. The standard
 * cut before the extended one, newest first within a tie.
 */
function rank(h: Highlight, fixture: Fixture): number {
  const source = sourceById(h.sourceId);
  let r = 4;
  if (source?.kind === "broadcaster") r = 0;
  else if (source?.teamId === fixture.homeTeamId) r = 1;
  else if (source?.teamId === fixture.awayTeamId) r = 2;
  return r * 2 + (h.extended ? 1 : 0);
}

export interface MatchHighlights {
  /** The one to embed, if any version plays here. */
  main?: Highlight;
  /** Other versions that also play here (the extended cut, the other club's). */
  more: Highlight[];
  /** Nothing embeddable plays here, but this one can be watched on YouTube. */
  watchOnYouTube?: Highlight;
}

export function pickMatchHighlights(all: Highlight[], fixture: Fixture, country?: string): MatchHighlights {
  const ordered = [...all].sort(
    (a, b) => rank(a, fixture) - rank(b, fixture) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  const playable = ordered.filter((h) => playableIn(h, country));
  if (playable.length > 0) return { main: playable[0], more: playable.slice(1, 4) };
  return { more: [], watchOnYouTube: ordered.find((h) => watchableIn(h, country)) };
}

export function pickMatchdayHighlight(all: Highlight[], country?: string): Highlight | undefined {
  return [...all]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .find((h) => playableIn(h, country));
}
