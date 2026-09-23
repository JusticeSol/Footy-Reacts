import { loadEnv } from "./env";
import { runFixturesSync } from "../src/lib/jobs";

// Safe to import the job first: every provider reads process.env lazily, at
// call time, not at module load.
loadEnv();

/**
 * npm run sync:fixtures                  rolling window (5 back, 14 ahead)
 * npm run sync:fixtures -- --back 60     reach back for earlier matchdays
 * npm run sync:fixtures -- --ahead 45    pull the calendar further forward
 *
 * The window is adjustable because the archive can only contain matchdays that
 * have been synced: a default run never reaches rounds played before the
 * project existed.
 */
function arg(flag: string): number | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  const value = Number(process.argv[i + 1]);
  return Number.isFinite(value) ? value : undefined;
}

async function main() {
  const started = Date.now();
  const result = await runFixturesSync({ daysBack: arg("--back"), daysAhead: arg("--ahead") });
  console.log(
    `[fixtures] ${result.fixturesUpserted} fixtures, ${result.teamsUpserted} teams in ${
      Date.now() - started
    }ms`,
  );
}

main().catch((err: Error) => {
  console.error(`[fixtures] failed: ${err.message}`);
  process.exit(1);
});
