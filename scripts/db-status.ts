import { loadEnv } from "./env";
import { getRepo } from "../src/lib/repo";

loadEnv();

/** What is actually in the configured store right now. Read-only. */
async function main() {
  const repo = getRepo();
  const [teams, fixtures, creators, takeKeys, recent] = await Promise.all([
    repo.listTeams(),
    repo.listFixtures(),
    repo.listCreators(),
    repo.listTakeKeys(),
    repo.getRecentTakes(8),
  ]);

  console.log(`store        ${repo.kind}`);
  console.log(`teams        ${teams.length}`);
  console.log(`fixtures     ${fixtures.length}`);
  console.log(`creators     ${creators.length} (${creators.filter((c) => c.uploadsPlaylistId).length} with uploads playlist resolved)`);
  console.log(`takes stored ${takeKeys.size}`);
  console.log(`takes shown  ${recent.length} of the most recent (above the confidence floor)\n`);

  for (const { take, fixture } of recent) {
    console.log(
      `  ${take.phase.toUpperCase().padEnd(4)} ${fixture.homeTeam.abbr} v ${fixture.awayTeam.abbr}  ` +
        `${take.confidence.toFixed(2)} ${take.taggedBy.padEnd(9)} ${take.creator.name}`,
    );
    console.log(`       ${take.title.slice(0, 80)}`);
  }

  for (const c of creators.filter((c) => !c.uploadsPlaylistId)) {
    console.log(`\n  unresolved creator: ${c.name} (${c.handle})`);
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
