import type { Fixture } from "./types";

/** How far ahead of a kickoff the watcher is willing to wait for it. */
const LOOKAHEAD_MS = 6 * 3_600_000;
/** Past this, a game with no result is the provider's problem, not worth waiting on. */
const GIVE_UP_MS = 4 * 3_600_000;
/** Between refreshes while a game is on. */
const POLL_MS = 5 * 60_000;
/** Longest single wait for a kickoff, so a moved kickoff time is noticed. */
const MAX_WAIT_MS = 30 * 60_000;

/**
 * How long until scores are worth refreshing again, or null when no game is on
 * or close enough to wait for.
 */
export function nextScoreCheck(
  fixtures: Array<Pick<Fixture, "kickoffUtc" | "status">>,
  now: number = Date.now(),
): number | null {
  let wait: number | null = null;
  for (const f of fixtures) {
    if (f.status === "finished" || f.status === "postponed") continue;
    const untilKickoff = Date.parse(f.kickoffUtc) - now;
    if (untilKickoff > LOOKAHEAD_MS || untilKickoff < -GIVE_UP_MS) continue;
    const w = untilKickoff <= 0 ? POLL_MS : Math.min(Math.max(untilKickoff, POLL_MS), MAX_WAIT_MS);
    wait = wait === null ? w : Math.min(wait, w);
  }
  return wait;
}
