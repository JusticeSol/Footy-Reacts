/**
 * The competitions on the board. Each numbers its own rounds from 1, so a
 * matchday only means something within its competition: every matchday read
 * is filtered by one of these ids.
 *
 * The Champions League is synced only for matches involving a Premier League
 * club: the same clubs, creators and fans, playing midweek.
 */
export interface Competition {
  id: string;
  /** URL value: `/?c=ucl`. The Premier League is the default and has none. */
  key: string;
  name: string;
  short: string;
}

export const PREMIER_LEAGUE: Competition = { id: "comp-pl", key: "pl", name: "Premier League", short: "PL" };
export const CHAMPIONS_LEAGUE: Competition = { id: "comp-cl", key: "ucl", name: "Champions League", short: "UCL" };

export const COMPETITIONS: Competition[] = [PREMIER_LEAGUE, CHAMPIONS_LEAGUE];

export function competitionByKey(key: string | undefined): Competition {
  return COMPETITIONS.find((c) => c.key === key) ?? PREMIER_LEAGUE;
}

export function competitionById(id: string | undefined): Competition {
  return COMPETITIONS.find((c) => c.id === id) ?? PREMIER_LEAGUE;
}
