import { loadEnv } from "./env";
import { getRepo, TAG_MIN_CONFIDENCE } from "../src/lib/repo";

loadEnv();

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://footy-reacts.vercel.app";

/**
 * Prints a ready-to-send outreach message per creator.
 *
 * Each one names that creator's own video, the fixture page it sits on and
 * another creator alongside them — a message that proves the thing already
 * exists needs no pitch. Creators with nothing on the site are skipped rather
 * than sent a message that cannot show them anything.
 *
 *   npm run outreach                     every creator with takes
 *   npm run outreach -- --creator aftv   just one
 */
async function main() {
  const filterIndex = process.argv.indexOf("--creator");
  const filter = filterIndex === -1 ? undefined : process.argv[filterIndex + 1]?.toLowerCase();

  const repo = getRepo();
  const [creators, takes, fixtures, teams] = await Promise.all([
    repo.listCreators(),
    repo.listTakes(),
    repo.listFixtures(),
    repo.listTeams(),
  ]);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]));
  const visible = takes.filter((t) => !t.unmatched && t.confidence >= TAG_MIN_CONFIDENCE);

  const label = (fixtureId: string) => {
    const f = fixtureById.get(fixtureId);
    if (!f) return null;
    const home = teamById.get(f.homeTeamId)?.shortName ?? "?";
    const away = teamById.get(f.awayTeamId)?.shortName ?? "?";
    const score = f.score ? `${f.score.home}-${f.score.away}` : "v";
    return { text: `${home} ${score} ${away}`, url: `${SITE}/match/${f.slug}`, id: f.id };
  };

  let printed = 0;

  for (const creator of creators) {
    if (filter && !creator.name.toLowerCase().includes(filter) && !creator.id.includes(filter)) {
      continue;
    }

    const theirs = visible
      .filter((t) => t.creatorId === creator.id)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

    if (theirs.length === 0) {
      console.log(`\n--- ${creator.name}: nothing on the site yet, skipped\n`);
      continue;
    }

    const take = theirs[0];
    const fixture = label(take.fixtureId);
    if (!fixture) continue;

    // Another creator on the same fixture: the point of the page is that they
    // are not on it alone.
    const alongside = visible
      .filter((t) => t.fixtureId === fixture.id && t.creatorId !== creator.id)
      .map((t) => creators.find((c) => c.id === t.creatorId)?.name)
      .find((name): name is string => Boolean(name));

    const onPage = visible.filter((t) => t.fixtureId === fixture.id).length;

    console.log(`\n${"=".repeat(72)}`);
    console.log(`TO: ${creator.name}  ${creator.handle ?? ""}`);
    console.log(`SUBJECT: Your ${fixture.text} reaction is on Footy Reacts`);
    console.log("-".repeat(72));
    console.log(
      `Hi,\n\n` +
        `I built Footy Reacts — every creator's pre- and post-match take on one\n` +
        `page per fixture, so fans stop hunting across YouTube and X on matchday.\n\n` +
        // No quotes around the title: creators punctuate their own titles with
        // them constantly, and nesting reads as a typo.
        `Your video —\n` +
        `  ${take.title}\n` +
        `— is on the ${fixture.text} page${alongside ? `, next to ${alongside}'s` : ""}:\n` +
        `${fixture.url}\n\n` +
        `There are ${onPage} takes on that match so far. Everything is embedded straight\n` +
        `from your channel — plays count as views on your video, with your ads and\n` +
        `your revenue. I never re-upload anything.\n\n` +
        `Two questions:\n` +
        `1. Happy for me to keep featuring you? If not, say the word and I'll remove\n` +
        `   you the same day.\n` +
        `2. Anything you'd want displayed differently?\n\n` +
        `Joe\n` +
        `x.com/affanyjoe`,
    );
    printed += 1;
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log(`${printed} message(s) ready.`);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
