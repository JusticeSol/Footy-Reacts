import { loadEnv } from "./env";
import { getRepo, TAG_MIN_CONFIDENCE } from "../src/lib/repo";

loadEnv();

/**
 * What is actually in the configured store right now. Read-only.
 *
 *   npm run db:status
 *   npm run db:status -- --fixture brentford-vs-chelsea-2026-09-18
 *
 * With --fixture it lists every take on that fixture, including the ones held
 * back below the confidence floor, which is what you want when something looks
 * wrong on a match page.
 */
async function main() {
  const repo = getRepo();

  const slugIndex = process.argv.indexOf("--fixture");
  if (slugIndex !== -1) {
    const slug = process.argv[slugIndex + 1];
    const fixture = await repo.getFixtureBySlug(slug);
    if (!fixture) {
      const all = await repo.listFixtures();
      console.error(`No fixture "${slug}". Known slugs:\n  ${all.map((f) => f.slug).join("\n  ")}`);
      process.exit(1);
    }

    const [takes, creators] = await Promise.all([repo.listTakes(), repo.listCreators()]);
    const creatorById = new Map(creators.map((c) => [c.id, c]));
    const mine = takes
      .filter((t) => t.fixtureId === fixture.id)
      .sort((a, b) => b.confidence - a.confidence);

    console.log(
      `${fixture.homeTeam.abbr} v ${fixture.awayTeam.abbr} — ${mine.length} takes stored\n`,
    );
    for (const t of mine) {
      const shown = t.unmatched || t.confidence < TAG_MIN_CONFIDENCE ? "hidden" : "SHOWN ";
      console.log(
        `  ${shown} ${t.confidence.toFixed(2)} ${t.phase.padEnd(4)} ` +
          `${creatorById.get(t.creatorId)?.name ?? t.creatorId}`,
      );
      console.log(`         ${t.title.slice(0, 82)}`);
    }
    return;
  }
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
