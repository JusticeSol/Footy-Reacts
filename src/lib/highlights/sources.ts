/**
 * The official channels highlights come from. Nobody else: these are the
 * rights holders (or their licensees), so embedding their uploads keeps the
 * views and the ad money with them. Re-uploading or stitching match footage
 * ourselves would be infringement, and the Premier League enforces hard.
 *
 * Channel ids are pinned rather than resolved from handles, so polling costs
 * 1 quota unit per source and nothing else. Every id here was checked against
 * the channel's title and recent uploads on 2026-10-16.
 *
 * Hull City and Nottingham Forest are missing: no official channel was found.
 * Champions League highlights come from the same clubs plus TNT and CBS,
 * checked on 2026-10-21. TNT and CBS are region-locked and some clubs post no
 * Champions League cut, so UEFA's every-goal video per matchday (worldwide,
 * checked 2026-10-22) is the fallback everywhere else.
 * Their matches still get highlights from the opponent, Sky or NBC.
 */

export type HighlightSourceKind = "league" | "broadcaster" | "club";

export interface HighlightSource {
  id: string;
  name: string;
  handle: string;
  channelId: string;
  kind: HighlightSourceKind;
  /** For a club channel: the team it speaks for, which is one side of every match it posts. */
  teamId?: string;
  /** For a league channel: the competition its all-goals compilation covers. */
  competitionId?: string;
}

const club = (teamId: string, name: string, handle: string, channelId: string): HighlightSource => ({
  id: `club-${teamId}`,
  name,
  handle,
  channelId,
  kind: "club",
  teamId,
});

export const HIGHLIGHT_SOURCES: HighlightSource[] = [
  // The league posts one all-goals compilation per matchweek, playable worldwide.
  { id: "league", name: "Premier League", handle: "@premierleague", channelId: "UCG5qGWdu8nIRZqJ_GgDwQ-w", kind: "league", competitionId: "comp-pl" },
  // UEFA's equivalent: "EVERY Champions League Goal From Matchday 3", the day after.
  { id: "uefa", name: "UEFA", handle: "@UEFA", channelId: "UCyGa1YEx9ST66rYrJTGIKOw", kind: "league", competitionId: "comp-cl" },
  // Every match, but only in the UK and Ireland (Sky) or the US (NBC).
  { id: "sky", name: "Sky Sports Premier League", handle: "@SkySportsPremierLeague", channelId: "UCNAf1k0yIjyGu3k9BwAg3lg", kind: "broadcaster" },
  { id: "nbc", name: "NBC Sports", handle: "@NBCSports", channelId: "UCqZQlzSHbVJrwrn5XvzrzcA", kind: "broadcaster" },
  // The Champions League, for the English clubs in it: UK and Ireland (TNT) or the US (CBS).
  { id: "tnt", name: "TNT Sports", handle: "@TNTSportsFootball", channelId: "UC4i_9WvfPRTuRWEaWyfKuFw", kind: "broadcaster" },
  { id: "cbs", name: "CBS Sports Golazo", handle: "@CBSSportsGolazo", channelId: "UCET00YnetHT7tOpu12v8jxg", kind: "broadcaster" },

  club("fd-57", "Arsenal", "@arsenal", "UCpryVRk_VDudG8SHXgWcG0w"),
  club("fd-58", "Aston Villa", "@AVFCOfficial", "UCICNP0mvtr0prFwGUQIABfQ"),
  club("fd-1044", "AFC Bournemouth", "@afcbournemouth", "UCeOCuVSSweaEj6oVtJZEKQw"),
  club("fd-402", "Brentford", "@BrentfordFC", "UCAalMUm3LIf504ItA3rqfug"),
  club("fd-397", "Brighton & Hove Albion", "@OfficialBHAFC", "UCf-cpC9WAdOsas19JHipukA"),
  club("fd-61", "Chelsea", "@ChelseaFC", "UCU2PacFf99vhb3hNiYDmxww"),
  club("fd-1076", "Coventry City", "@CoventryCityFC", "UCch_NWdo3JWKngAyO9XlycA"),
  club("fd-354", "Crystal Palace", "@OfficialCPFC", "UCWB9N0012fG6bGyj486Qxmg"),
  club("fd-62", "Everton", "@Everton", "UCtK4QAczAN2mt2ow_jlGinQ"),
  club("fd-63", "Fulham", "@FulhamFC", "UC2VLfz92cTT8jHIFOecC-LA"),
  club("fd-349", "Ipswich Town", "@ipswichtown", "UCjNwxJec96lMWgCXjEDhXgQ"),
  club("fd-341", "Leeds United", "@leedsunited", "UCyQcJHDN4uYfPa1DHzKVSnw"),
  club("fd-64", "Liverpool", "@LiverpoolFC", "UC9LQwHZoucFT94I2h6JOcjw"),
  club("fd-65", "Manchester City", "@ManCity", "UCkzCjdRMrW2vXLx8mvPVLdQ"),
  club("fd-66", "Manchester United", "@manutd", "UC6yW44UGJJBvYTlfC7CRg2Q"),
  club("fd-67", "Newcastle United", "@NUFC", "UCywGl_BPp9QhD0uAcP2HsJw"),
  club("fd-71", "Sunderland", "@SunderlandAFC", "UCrw-7k6yJc0EMJdf-0BAkoQ"),
  club("fd-73", "Tottenham Hotspur", "@TottenhamHotspur", "UCEg25rdRZXg32iwai6N6l0w"),
];

/** Every channel's uploads playlist is its id with "UC" swapped for "UU": no lookup needed. */
export function uploadsPlaylistFor(source: HighlightSource): string {
  return `UU${source.channelId.slice(2)}`;
}

export function sourceById(id: string): HighlightSource | undefined {
  return HIGHLIGHT_SOURCES.find((s) => s.id === id);
}
