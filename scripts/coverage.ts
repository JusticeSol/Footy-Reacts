import { loadEnv } from "./env";
import { getRepo } from "../src/lib/repo";

loadEnv();

/**
 * Which clubs have a creator covering them, and which do not.
 *
 * Breadth matters more than depth: a fan landing on their club's page and
 * finding it empty does not come back, however many takes another club has.
 */
async function main() {
  const repo = getRepo();
  const [teams, creators, takes] = await Promise.all([
    repo.listTeams(),
    repo.listCreators(),
    repo.listTakes(),
  ]);

  const takesByTeam = new Map<string, number>();
  const fixtures = await repo.listFixtures();
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]));
  for (const take of takes) {
    const fixture = fixtureById.get(take.fixtureId);
    if (!fixture) continue;
    for (const id of [fixture.homeTeamId, fixture.awayTeamId]) {
      takesByTeam.set(id, (takesByTeam.get(id) ?? 0) + 1);
    }
  }

  // Only clubs actually appearing in synced fixtures count. The team table can
  // still hold leftovers from the seed — a club that is not in this season's
  // competition is not a coverage gap.
  const inCompetition = new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]));
  const orphans = teams.filter((t) => !inCompetition.has(t.id));

  const rows = teams
    .filter((team) => inCompetition.has(team.id))
    .map((team) => ({
      team,
      creators: creators.filter((c) => c.clubAffinity.includes(team.id)).map((c) => c.name),
      takes: takesByTeam.get(team.id) ?? 0,
    }))
    .sort((a, b) => a.creators.length - b.creators.length || a.team.shortName.localeCompare(b.team.shortName));

  console.log(`${rows.length} clubs in this season's fixtures, ${creators.length} creators\n`);
  for (const row of rows) {
    const mark = row.creators.length === 0 ? "GAP " : "    ";
    console.log(
      `${mark}${row.team.abbr}  ${row.team.shortName.padEnd(20)} ` +
        `${String(row.takes).padStart(3)} takes   ${row.creators.join(", ") || "—"}`,
    );
  }

  const gaps = rows.filter((r) => r.creators.length === 0);
  console.log(`\n${gaps.length} clubs with no creator: ${gaps.map((g) => g.team.shortName).join(", ")}`);

  if (orphans.length > 0) {
    console.log(
      `\nnot in this season's fixtures (ignored): ${orphans.map((t) => t.shortName).join(", ")}`,
    );
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
