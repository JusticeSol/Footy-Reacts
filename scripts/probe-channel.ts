import { loadEnv } from "./env";
import {
  fetchChannelProfile,
  fetchRecentUploads,
  resolveUploadsPlaylistId,
} from "../src/lib/providers/youtube";

loadEnv();

/**
 * Vet a channel before adding it: real title, handle, and what it has actually
 * posted recently.
 *
 * Added because two creators went in looking fine and turned out to be a
 * Sunday-league team's channel and a dormant one. A channel id reveals
 * neither; recent titles reveal both.
 *
 *   npm run probe -- UCpHumbIRd4VuwfRtc6YXGBQ [more ids...]
 */
async function main() {
  const ids = process.argv.slice(2).filter((a) => a.startsWith("UC"));
  if (ids.length === 0) {
    console.error("Usage: npm run probe -- UCxxxx [UCyyyy ...]");
    process.exit(1);
  }

  for (const channelId of ids) {
    const profile = await fetchChannelProfile(channelId);
    const playlistId = await resolveUploadsPlaylistId(channelId);

    console.log(`\n${profile?.title ?? "(unknown)"}  ${profile?.handle ?? ""}`);
    console.log(`  ${channelId}`);

    if (!playlistId) {
      console.log("  no uploads playlist");
      continue;
    }

    // Two weeks: long enough that a live club channel cannot look dormant.
    const since = new Date(Date.now() - 14 * 86_400_000);
    const videos = await fetchRecentUploads(playlistId, { since, maxPages: 1 });

    console.log(`  ${videos.length} uploads in the last 14 days`);
    for (const v of videos.slice(0, 5)) {
      console.log(`    ${v.publishedAt.slice(0, 10)}  ${v.title.slice(0, 68)}`);
    }
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
