import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnv } from "./env";
import { getRepo } from "../src/lib/repo";
import type { Creator } from "../src/lib/types";

loadEnv();

/**
 * Removes a creator and every take of theirs, from the database and from the
 * version-controlled roster.
 *
 * This is how a creator's opt-out gets honoured — outreach promises removal on
 * request, so it needs to be one command, not a manual database edit.
 *
 *   npm run creator:remove -- --id creator-beestv
 *   npm run creator:remove -- --id creator-beestv --yes
 */
async function main() {
  const idIndex = process.argv.indexOf("--id");
  const id = idIndex === -1 ? undefined : process.argv[idIndex + 1];
  const confirmed = process.argv.includes("--yes");

  if (!id) {
    console.error("Usage: npm run creator:remove -- --id creator-something [--yes]");
    process.exit(1);
  }

  const repo = getRepo();
  const creators = await repo.listCreators();

  // Ids do not always match the display name — older ones came from the seed
  // file — so accept a name or handle too rather than making callers guess.
  const needle = id.toLowerCase();
  const matches = creators.filter(
    (c) =>
      c.id.toLowerCase() === needle ||
      c.name.toLowerCase() === needle ||
      c.handle?.toLowerCase() === needle ||
      c.name.toLowerCase().includes(needle) ||
      c.id.toLowerCase().includes(needle),
  );

  if (matches.length === 0) {
    console.error(`Nothing matches "${id}". List them with: npm run creator:list`);
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error(
      `"${id}" matches several creators — be more specific:\n` +
        matches.map((c) => `  ${c.id}  (${c.name})`).join("\n"),
    );
    process.exit(1);
  }

  const creator = matches[0];

  const takes = (await repo.listTakes()).filter((t) => t.creatorId === creator.id);

  if (!confirmed) {
    console.log(
      `Would remove ${creator.name} (${creator.handle}) and ${takes.length} take(s).\n` +
        "Re-run with --yes to confirm.",
    );
    return;
  }

  await repo.deleteCreators([creator.id]);

  const seedPath = path.join(process.cwd(), "src", "data", "seed.json");
  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as { creators: Creator[] };
  const before = seed.creators.length;
  seed.creators = seed.creators.filter((c) => c.id !== creator.id);
  if (seed.creators.length !== before) {
    writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  }

  console.log(
    `removed ${creator.name} and ${takes.length} take(s) from ${repo.kind}` +
      (seed.creators.length !== before ? " and from seed.json (commit the change)" : ""),
  );
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
