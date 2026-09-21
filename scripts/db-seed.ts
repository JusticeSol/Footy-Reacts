import { loadEnv } from "./env";
import { getRepo } from "../src/lib/repo";
import seed from "../src/data/seed.json";
import type { Creator, Fixture, Team } from "../src/lib/types";

loadEnv();

/**
 * Pushes the creator roster (and the placeholder calendar) into whichever store
 * is configured. Creators are our own data — no API provides them — so this is
 * how they get into a fresh Supabase project.
 *
 * Run once after applying db/schema.sql, then `npm run sync:fixtures` replaces
 * the placeholder fixtures with the real calendar.
 */
async function main() {
  const repo = getRepo();
  console.log(`[seed] target store: ${repo.kind}`);

  if (repo.kind === "json") {
    console.warn(
      "[seed] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — " +
        "seeding the local JSON file instead of Supabase.",
    );
  }

  const teams = seed.teams as Team[];
  const fixtures = seed.fixtures as Fixture[];
  const creators = seed.creators as Creator[];

  // Order matters: fixtures reference teams.
  await repo.upsertTeams(teams);

  // The placeholder calendar exists so a keyless checkout renders something.
  // Pushing it into a real database would leave invented matches sitting beside
  // the synced ones forever — nothing overwrites them, since the provider
  // assigns different ids.
  if (repo.kind === "json") {
    await repo.upsertFixtures(fixtures);
  } else {
    await repo.deleteFixtures(fixtures.map((f) => f.id));
  }

  await repo.upsertCreators(creators);

  console.log(
    `[seed] ${teams.length} teams, ${creators.length} creators` +
      (repo.kind === "json"
        ? `, ${fixtures.length} placeholder fixtures`
        : `, placeholder fixtures skipped and removed (run sync:fixtures for the real calendar)`),
  );
}

main().catch((err: Error) => {
  console.error(`[seed] failed: ${err.message}`);
  process.exit(1);
});
