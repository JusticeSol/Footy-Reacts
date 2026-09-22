import { loadEnv } from "./env";
import { getRepo } from "../src/lib/repo";

loadEnv();

/** Every creator, their stored take count, handle and resolved channel. */
async function main() {
  const repo = getRepo();
  const [takes, creators] = await Promise.all([repo.listTakes(), repo.listCreators()]);

  const counts = new Map<string, number>();
  for (const t of takes) counts.set(t.creatorId, (counts.get(t.creatorId) ?? 0) + 1);

  const rows = creators.slice().sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));

  console.log("takes  creator                         handle                 channel");
  for (const c of rows) {
    console.log(
      `${String(counts.get(c.id) ?? 0).padStart(5)}  ${c.name.padEnd(30)} ` +
        `${(c.handle ?? "—").padEnd(22)} ${c.youtubeChannelId ?? "—"}`,
    );
  }

  // Two creators pointing at one channel means one of them is mis-resolved,
  // and every video from it is credited to whichever polled last.
  const byChannel = new Map<string, string[]>();
  for (const c of creators) {
    if (!c.youtubeChannelId) continue;
    const list = byChannel.get(c.youtubeChannelId) ?? [];
    list.push(c.name);
    byChannel.set(c.youtubeChannelId, list);
  }
  for (const [channel, names] of byChannel) {
    if (names.length > 1) {
      console.log(`\nCOLLISION: ${names.join(" and ")} share channel ${channel}`);
    }
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
