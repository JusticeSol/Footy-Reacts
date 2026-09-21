import { loadEnv } from "./env";
import { getRepo, TAG_MIN_CONFIDENCE } from "../src/lib/repo";
import { fetchSnippets } from "../src/lib/providers/youtube";
import { tagVideo } from "../src/lib/tagger";
import type { Take, Team } from "../src/lib/types";

loadEnv();

/**
 * Re-scores every stored take against the current tagger.
 *
 * The sync only ever looks at videos it has not seen, so a change to the
 * tagging rules leaves everything already ingested frozen at its old score.
 * Run this after any change to src/lib/tagger.ts.
 *
 * Dry run by default — pass --write to apply. Takes corrected by hand
 * (taggedBy: "manual") are never touched.
 *
 *   npm run retag           # show what would change
 *   npm run retag -- --write
 */
async function main() {
  const write = process.argv.includes("--write");
  const repo = getRepo();

  const [takes, teamList, fixtures, creators] = await Promise.all([
    repo.listTakes(),
    repo.listTeams(),
    repo.listFixtures(),
    repo.listCreators(),
  ]);
  const teams = new Map<string, Team>(teamList.map((t) => [t.id, t]));
  const creatorById = new Map(creators.map((c) => [c.id, c]));

  const youtube = takes.filter((t) => t.source === "youtube" && t.taggedBy !== "manual");
  const manual = takes.filter((t) => t.taggedBy === "manual").length;

  console.log(
    `store=${repo.kind} takes=${takes.length} re-scorable=${youtube.length}` +
      (manual > 0 ? ` (${manual} manual, left alone)` : "") +
      `\nmode=${write ? "WRITE" : "dry run"}\n`,
  );
  if (youtube.length === 0) return;

  // The take row keeps the title but not the description, and the tagger reads
  // both — so fetch the full snippet rather than re-score on partial input.
  const snippets = await fetchSnippets(youtube.map((t) => t.externalId));

  const updated: Take[] = [];
  let unchanged = 0;

  for (const take of youtube) {
    const snippet = snippets.get(take.externalId);
    if (!snippet) {
      console.log(`  ? ${take.title.slice(0, 70)}\n      video unavailable, skipped`);
      continue;
    }

    const creator = creatorById.get(take.creatorId);
    const tag = await tagVideo(snippet, creator?.clubAffinity ?? [], fixtures, teams);

    const changedFixture = tag.fixtureId !== take.fixtureId;
    const changedPhase = tag.phase !== take.phase;
    const changedScore = Math.abs(tag.confidence - take.confidence) > 0.005;
    if (!changedFixture && !changedPhase && !changedScore) {
      unchanged += 1;
      continue;
    }

    const was = take.confidence >= TAG_MIN_CONFIDENCE;
    const now = tag.fixtureId !== null && tag.confidence >= TAG_MIN_CONFIDENCE;
    const visibility = was === now ? "" : now ? "  → NOW SHOWN" : "  → NOW HIDDEN";

    console.log(
      `  ${take.confidence.toFixed(2)} → ${tag.confidence.toFixed(2)}${visibility}\n` +
        `      ${take.title.slice(0, 74)}` +
        (changedFixture ? `\n      fixture ${take.fixtureId} → ${tag.fixtureId ?? "none"}` : "") +
        (changedPhase ? `\n      phase ${take.phase} → ${tag.phase}` : ""),
    );

    updated.push({
      ...take,
      // A take that no longer matches any fixture keeps its row but is flagged
      // unmatched, so it disappears from the UI without losing the record.
      fixtureId: tag.fixtureId ?? take.fixtureId,
      unmatched: tag.fixtureId === null,
      phase: tag.phase,
      confidence: tag.confidence,
      taggedBy: tag.taggedBy,
    });
  }

  console.log(`\n${updated.length} changed, ${unchanged} unchanged`);

  if (!write) {
    console.log("dry run — re-run with --write to apply");
    return;
  }

  await repo.upsertTakes(updated);
  console.log("applied");
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
