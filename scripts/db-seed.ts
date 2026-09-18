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

  // Order matters: fixtures reference teams, takes reference both.
  await repo.upsertTeams(teams);
  await repo.upsertFixtures(fixtures);
  await repo.upsertCreators(creators);

  console.log(
    `[seed] ${teams.length} teams, ${fixtures.length} placeholder fixtures, ` +
      `${creators.length} creators`,
  );
}

main().catch((err: Error) => {
  console.error(`[seed] failed: ${err.message}`);
  process.exit(1);
});
