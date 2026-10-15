import { loadEnv } from "./env";
import { runHighlightsSync } from "../src/lib/jobs";

loadEnv();

/**
 * Pulls official Premier League highlights from the channels in
 * src/lib/highlights/sources.ts.
 *
 *   npm run sync:highlights        last 48 hours
 *   npm run sync:highlights 168    last week (a backfill)
 */
async function main() {
  const hours = Number(process.argv[2] ?? 48);
  const started = Date.now();

  const result = await runHighlightsSync({ sinceHours: hours });
  console.log(
    `[highlights] polled ${result.sourcesPolled} channels, saw ${result.videosSeen} uploads, ` +
      `added ${result.highlightsAdded} highlights, ${result.rejected} not Premier League highlights ` +
      `(${Date.now() - started}ms)`,
  );
  for (const skip of result.skipped) console.warn(`[highlights] skipped: ${skip}`);
}

main().catch((err: Error) => {
  console.error(`[highlights] failed: ${err.message}`);
  process.exit(1);
});
