import { nextScoreCheck } from "../src/lib/scoreWatch";
import type { FixtureStatus } from "../src/lib/types";

/** When the score watcher keeps going and when it stops. No keys needed. */
const now = Date.parse("2026-11-24T20:30:00Z");
const game = (minutes: number, status: FixtureStatus = "scheduled") => ({
  kickoffUtc: new Date(now + minutes * 60_000).toISOString(),
  status,
});
const MIN = 60_000;

const cases: Array<[string, number | null, number | null]> = [
  ["game on: poll", nextScoreCheck([game(-30, "live")], now), 5 * MIN],
  ["kicked off, store still says scheduled", nextScoreCheck([game(-150)], now), 5 * MIN],
  ["one finished, one still on", nextScoreCheck([game(-130, "finished"), game(-30, "live")], now), 5 * MIN],
  ["all finished: stop", nextScoreCheck([game(-130, "finished")], now), null],
  ["postponed: stop", nextScoreCheck([game(-30, "postponed")], now), null],
  ["kickoff in 20 minutes: wait for it", nextScoreCheck([game(20)], now), 20 * MIN],
  ["kickoff in 3 hours: wait, checking in", nextScoreCheck([game(180)], now), 30 * MIN],
  ["kickoff tomorrow: stop", nextScoreCheck([game(24 * 60)], now), null],
  ["no result after 4 hours: give up", nextScoreCheck([game(-300, "live")], now), null],
];

const failed = cases.filter(([, got, want]) => got !== want);
for (const [name, got, want] of failed) console.log(`✗ ${name}: got ${got}, want ${want}`);
console.log(`${cases.length - failed.length}/${cases.length} passed`);
if (failed.length) process.exit(1);
