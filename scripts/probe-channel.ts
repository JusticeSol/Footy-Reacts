import { loadEnv } from "./env";
import {
  fetchChannelProfile,
  fetchRecentUploads,
  resolveChannelIdFromHandle,
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
  const args = process.argv.slice(2).filter((a) => a.startsWith("UC") || a.startsWith("@"));
  if (args.length === 0) {
    console.error('Usage: npm run probe -- UCxxxx | "@handle" [...]');
    process.exit(1);
  }

  // Handles are accepted too, since that is how a channel is usually named to
  // you — quote them in PowerShell, where a bare @word is splatting.
  const ids: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("UC")) {
      ids.push(arg);
      continue;
    }
    const resolved = await resolveChannelIdFromHandle(arg);
    if (!resolved) {
      console.log(`\n${arg}: handle did not resolve`);
      continue;
    }
    ids.push(resolved);
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
