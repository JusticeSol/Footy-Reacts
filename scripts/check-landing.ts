import { loadEnv } from "./env";
import { getRepo } from "../src/lib/repo";
import { currentMatchday } from "../src/lib/repo/shared";

loadEnv();

/**
 * Which matchday a visitor lands on, checked against the real store at dates
 * across the international break.
 *
 * The break is the case that matters: landing on the nearest matchday by date
 * would put an empty round on the front page for a week before the league
 * returns, which is exactly when links are being sent to creators.
 */
async function main() {
  const summaries = await getRepo().listMatchdays();

  console.log("matchdays in store:");
  for (const s of summaries) {
    console.log(
      `  MD${s.matchday}  ${String(s.fixtures).padStart(2)} fixtures  ` +
        `${String(s.takes).padStart(3)} takes  ${s.firstKickoff.slice(0, 10)} → ${s.lastKickoff.slice(0, 10)}`,
    );
  }

  // A future matchday is simulated by pretending it has previews, since the
  // store cannot yet contain takes for a round that has not been played.
  const withMd6 = [
    ...summaries,
    {
      matchday: 6,
      fixtures: 10,
      takes: 0,
      firstKickoff: "2026-10-10T11:30:00Z",
      lastKickoff: "2026-10-11T15:30:00Z",
    },
  ];

  const cases: Array<[string, string, typeof withMd6]> = [
    ["during the break, MD6 synced but empty", "2026-10-02T12:00:00Z", withMd6],
    ["day before MD6, still no previews", "2026-10-09T12:00:00Z", withMd6],
    [
      "previews for MD6 start landing",
      "2026-10-09T12:00:00Z",
      withMd6.map((s) => (s.matchday === 6 ? { ...s, takes: 4 } : s)),
    ],
    ["MD6 kickoff weekend", "2026-10-10T14:00:00Z", withMd6],
  ];

  console.log("\nlanding matchday:");
  for (const [label, when, data] of cases) {
    console.log(`  ${currentMatchday(data, Date.parse(when))}  ← ${label} (${when.slice(0, 10)})`);
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
