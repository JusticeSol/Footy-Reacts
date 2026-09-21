import { loadEnv } from "./env";
import { getRepo } from "../src/lib/repo";
import { fetchDurations, fetchRecentUploads } from "../src/lib/providers/youtube";
import { prefilter } from "../src/lib/tagger";

loadEnv();

/**
 * Read-only diagnostic: what did the poller actually see, and what would the
 * tagger do with it? Writes nothing. Use when a sync reports uploads seen but
 * no takes added.
 *
 * Usage: npm run debug:uploads [hours]
 */
async function main() {
  const hours = Number(process.argv[2] ?? 48);
  const since = new Date(Date.now() - hours * 3_600_000);
  const repo = getRepo();

  const [teamList, fixtures, creators] = await Promise.all([
    repo.listTeams(),
    repo.listFixtures(),
    repo.listCreators(),
  ]);
  const teams = new Map(teamList.map((t) => [t.id, t]));

  console.log(`store=${repo.kind} fixtures=${fixtures.length} window=${hours}h\n`);

  for (const creator of creators) {
    if (!creator.uploadsPlaylistId) {
      console.log(`--- ${creator.name}: no uploads playlist cached, skipping\n`);
      continue;
    }

    let videos;
    try {
      videos = await fetchRecentUploads(creator.uploadsPlaylistId, { since });
    } catch (err) {
      console.log(`--- ${creator.name}: ${(err as Error).message.slice(0, 120)}\n`);
      continue;
    }

    console.log(`--- ${creator.name} (${videos.length} uploads in window)`);
    if (videos.length === 0) {
      console.log("");
      continue;
    }

    const durations = await fetchDurations(videos.map((v) => v.videoId));

    for (const v of videos) {
      const secs = durations.get(v.videoId);
      const length = secs === undefined ? "?" : `${Math.floor(secs / 60)}m${secs % 60}s`;
      const short = secs !== undefined && secs < 90 ? " [DROPPED: under 90s]" : "";

      const candidates = prefilter(v, creator.clubAffinity, fixtures, teams);
      const best = candidates[0];
      const verdict = best
        ? `${best.phase} ${best.score.toFixed(2)} → ${
            teams.get(best.fixture.homeTeamId)?.abbr ?? "?"
          } v ${teams.get(best.fixture.awayTeamId)?.abbr ?? "?"}`
        : "NO FIXTURE MATCH";

      console.log(`  ${length.padEnd(7)}${short.padEnd(24)} ${verdict}`);
      console.log(`     ${v.title.slice(0, 88)}`);
      console.log(`     published ${v.publishedAt}`);
    }
    console.log("");
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
