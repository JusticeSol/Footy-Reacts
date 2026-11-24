import { appendFileSync } from "node:fs";
import { loadEnv } from "./env";
import { runFixturesSync } from "../src/lib/jobs";
import { getRepo } from "../src/lib/repo";
import { nextScoreCheck } from "../src/lib/scoreWatch";

loadEnv();

/**
 * Keeps scores fresh until every game on or coming up has a result, then exits.
 *
 * GitHub starts scheduled jobs when it likes (one to three times a day here,
 * against dozens scheduled), so nothing that must happen at full time can rely
 * on a schedule. This stays running instead. GitHub stops a job at six hours,
 * so near that it exits with more=true and the workflow starts a fresh one.
 */
const RUN_FOR_MS = 5.5 * 3_600_000;
const MAX_FAILURES = 6;

async function main() {
  const deadline = Date.now() + RUN_FOR_MS;
  let failures = 0;

  for (;;) {
    let wait: number | null;
    try {
      await runFixturesSync();
      wait = nextScoreCheck(await getRepo().listFixtures());
      failures = 0;
    } catch (err) {
      failures += 1;
      console.warn(`[scores] failed (${failures}): ${(err as Error).message}`);
      if (failures >= MAX_FAILURES) throw err;
      wait = 60_000;
    }

    if (wait === null) {
      console.log("[scores] no game on or coming up, done");
      return;
    }
    if (Date.now() + wait > deadline) {
      console.log("[scores] time limit, handing over");
      if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "more=true\n");
      return;
    }
    console.log(`[scores] ${new Date().toISOString()} next check in ${Math.round(wait / 60_000)} min`);
    await new Promise((r) => setTimeout(r, wait));
  }
}

main().catch((err: Error) => {
  console.error(`[scores] failed: ${err.message}`);
  process.exit(1);
});
