import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnv } from "./env";
import { getRepo } from "../src/lib/repo";
import { resolveChannelIdFromHandle, resolveUploadsPlaylistId } from "../src/lib/providers/youtube";
import type { Creator } from "../src/lib/types";

loadEnv();

/**
 * Adds a creator to the roster: writes them into src/data/seed.json (so the
 * roster is version controlled) and upserts them into the active store.
 *
 * Usage:
 *   npm run creator:add -- --name "AFTV" --handle "@AFTVMedia" --clubs ARS
 *   npm run creator:add -- --name "City Xtra" --channel UCxxxx --clubs MCI
 *
 * Quote the handle: in PowerShell a bare @word is the splatting operator and
 * never reaches this script.
 *
 * --clubs takes the three-letter abbreviations shown on the fixture board, so
 * you never need to look up an internal team id. Multiple clubs are comma
 * separated; a general channel with no single allegiance can be given none,
 * though the tagger leans on club affinity, so naming clubs improves tagging.
 */

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const name = arg("--name");
  const handle = arg("--handle");
  const channel = arg("--channel");
  const clubs = (arg("--clubs") ?? "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  if (!name || (!handle && !channel)) {
    console.error(
      'Usage: npm run creator:add -- --name "Channel Name" --handle "@handle" --clubs ARS,CHE\n' +
        "       (quote the handle — PowerShell eats a bare @word)\n" +
        "       (use --channel UC... instead of --handle when a handle will not resolve)",
    );
    process.exit(1);
  }

  const repo = getRepo();
  const teams = await repo.listTeams();

  // Map the abbreviations a human would type to internal team ids.
  const clubAffinity: string[] = [];
  for (const abbr of clubs) {
    const team = teams.find((t) => t.abbr.toUpperCase() === abbr);
    if (!team) {
      console.error(
        `Unknown club "${abbr}". Known: ${teams.map((t) => t.abbr).sort().join(", ")}`,
      );
      process.exit(1);
    }
    clubAffinity.push(team.id);
  }

  // Resolve the channel now so a bad handle fails here, loudly, rather than
  // silently skipping this creator on every future sync.
  let channelId = channel;
  if (!channelId && handle) {
    channelId = (await resolveChannelIdFromHandle(handle)) ?? undefined;
    if (!channelId) {
      console.error(
        `Handle ${handle} did not resolve.\n` +
          `Find the channel id with:  npm run find:channel -- "${name}"\n` +
          `then re-run with --channel UC...`,
      );
      process.exit(1);
    }
  }

  const uploadsPlaylistId = (await resolveUploadsPlaylistId(channelId!)) ?? undefined;
  if (!uploadsPlaylistId) {
    console.error(`Channel ${channelId} has no uploads playlist — is the id correct?`);
    process.exit(1);
  }

  const creator: Creator = {
    id: `creator-${slugify(name)}`,
    name,
    handle: handle ?? `@${slugify(name)}`,
    youtubeChannelId: channelId,
    uploadsPlaylistId,
    clubAffinity,
    claimed: false,
  };

  // Keep the roster in version control as well as in the database.
  const seedPath = path.join(process.cwd(), "src", "data", "seed.json");
  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as { creators: Creator[] };
  const i = seed.creators.findIndex((c) => c.id === creator.id);
  if (i === -1) seed.creators.push(creator);
  else seed.creators[i] = { ...seed.creators[i], ...creator };
  writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`, "utf8");

  await repo.upsertCreators([creator]);

  console.log(
    `added ${creator.name} (${creator.id})\n` +
      `  channel  ${channelId}\n` +
      `  uploads  ${uploadsPlaylistId}\n` +
      `  clubs    ${clubs.length > 0 ? clubs.join(", ") : "none"}\n` +
      `  store    ${repo.kind}\n\n` +
      `Run \`npm run sync:takes\` to pull their recent uploads.`,
  );
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
