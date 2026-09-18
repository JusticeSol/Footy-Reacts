import { loadEnv } from "./env";
import { runFixturesSync } from "../src/lib/jobs";

// Safe to import the job first: every provider reads process.env lazily, at
// call time, not at module load.
loadEnv();

async function main() {
  const started = Date.now();
  const result = await runFixturesSync();
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
