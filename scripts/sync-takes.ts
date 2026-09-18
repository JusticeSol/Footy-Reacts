import { loadEnv } from "./env";
import { runTakesSync } from "../src/lib/jobs";

loadEnv();

async function main() {
  const hours = Number(process.argv[2] ?? 48);
  const started = Date.now();

  const result = await runTakesSync({ sinceHours: hours });
  console.log(
    `[takes] polled ${result.creatorsPolled} creators, saw ${result.videosSeen} uploads, ` +
      `added ${result.takesAdded} takes, ${result.unmatched} unmatched (${Date.now() - started}ms)`,
  );
  for (const skip of result.skipped) console.warn(`[takes] skipped — ${skip}`);
}

main().catch((err: Error) => {
  console.error(`[takes] failed: ${err.message}`);
  process.exit(1);
});
