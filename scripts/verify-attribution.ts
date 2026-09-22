import { loadEnv } from "./env";
import { getRepo } from "../src/lib/repo";
import { fetchSnippets } from "../src/lib/providers/youtube";

loadEnv();

/**
 * Audits creator attribution: for every stored take, does the video actually
 * belong to the channel we credit it to?
 *
 * Attribution is meant to be correct by construction — a video is credited to
 * whichever creator's uploads playlist it was found in — but crediting the
 * wrong creator is the one error that would matter to the creators themselves,
 * so it is worth checking against YouTube rather than trusting the invariant.
 */
async function main() {
  const repo = getRepo();
  const [takes, creators] = await Promise.all([repo.listTakes(), repo.listCreators()]);
  const creatorById = new Map(creators.map((c) => [c.id, c]));

  const youtube = takes.filter((t) => t.source === "youtube");
  const snippets = await fetchSnippets(youtube.map((t) => t.externalId));

  let ok = 0;
  let mismatched = 0;
  let missing = 0;

  for (const take of youtube) {
    const snippet = snippets.get(take.externalId);
    const creator = creatorById.get(take.creatorId);
    if (!snippet || !creator) {
      missing += 1;
      continue;
    }

    if (creator.youtubeChannelId && snippet.channelId !== creator.youtubeChannelId) {
      mismatched += 1;
      console.log(
        `MISMATCH  credited to ${creator.name} but owned by ${snippet.channelTitle}\n` +
          `          ${snippet.title.slice(0, 76)}\n` +
          `          https://youtube.com/watch?v=${take.externalId}`,
      );
    } else {
      ok += 1;
    }
  }

  console.log(
    `\n${ok} correctly attributed, ${mismatched} mismatched` +
      (missing > 0 ? `, ${missing} unverifiable (video or creator gone)` : ""),
  );
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
