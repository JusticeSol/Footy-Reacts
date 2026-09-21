import { loadEnv } from "./env";

loadEnv();

/**
 * Setup-time helper: find a creator's channel id by name.
 *
 * Usage: npx tsx scripts/find-channel.ts "The United Stand"
 *
 * This uses search.list, which costs 100 quota units per call — which is why
 * the poller never touches it. Running this a handful of times while building
 * the roster is fine; doing it on a schedule is what would exhaust the quota.
 */
async function main() {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.error('Usage: npx tsx scripts/find-channel.ts "Channel Name"');
    process.exit(1);
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "channel");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("key", key);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube search ${res.status}: ${await res.text()}`);

  const body = (await res.json()) as {
    items?: Array<{
      snippet?: { channelId?: string; title?: string; customUrl?: string; description?: string };
      id?: { channelId?: string };
    }>;
  };

  console.log(`\nresults for "${query}":\n`);
  for (const item of body.items ?? []) {
    const id = item.id?.channelId ?? item.snippet?.channelId;
    console.log(`  ${item.snippet?.title}`);
    console.log(`    channelId: ${id}`);
    console.log(`    ${(item.snippet?.description ?? "").slice(0, 90)}`);
    console.log("");
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
