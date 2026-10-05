import { loadEnv } from "./env";
import type { Hex } from "viem";
import type { Tip } from "../src/lib/types";

loadEnv();

/**
 * Refills the tip cache from the chain.
 *
 * Tips are recorded the moment the relayer confirms them; this catches any that
 * were confirmed but not recorded (the store was down, the tip table was not
 * there yet). It reads TipJar's Tipped events, maps their keys back to our
 * takes, and stores whatever is missing. Dry run unless --write is passed.
 *
 *   npm run tips:reconcile                         scan from the deploy block
 *   npm run tips:reconcile -- --from 68300000      scan from a block
 *   npm run tips:reconcile -- --tx 0xabc… --write  record specific transactions
 *
 * Monad's public RPC answers eth_getLogs for at most 100 blocks at a time, so a
 * scan is many small requests run a few at once — about 2,000 per day elapsed.
 * Pass --tx when the hash is known; it costs one request.
 */

const CHUNK = 100n;
const CONCURRENCY = 6;

function flagValues(flag: string): string[] {
  return process.argv.flatMap((a, i) => (a === flag && process.argv[i + 1] ? [process.argv[i + 1]] : []));
}

async function main() {
  // After loadEnv: these read NEXT_PUBLIC_TIPJAR_ADDRESS when imported.
  const { parseEventLogs } = await import("viem");
  const { creatorKey, takeKey, tipJarAbi } = await import("../src/lib/chain/config");
  const { publicClient, tipJar } = await import("../src/lib/chain/server");
  const { getRepo } = await import("../src/lib/repo");

  const write = process.argv.includes("--write");
  const address = tipJar();
  const repo = getRepo();

  type Tipped = { blockNumber: bigint; transactionHash: Hex; logIndex: number; args: { creatorKey: Hex; takeKey: Hex; from: Hex; value: bigint; held: boolean } };
  const events: Tipped[] = [];

  const txs = flagValues("--tx") as Hex[];
  if (txs.length > 0) {
    for (const hash of txs) {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const logs = parseEventLogs({ abi: tipJarAbi, eventName: "Tipped", logs: receipt.logs }).filter(
        (l) => l.address.toLowerCase() === address.toLowerCase(),
      );
      events.push(...(logs as unknown as Tipped[]));
    }
  } else {
    const deployBlock = process.env.TIPJAR_DEPLOY_BLOCK;
    const from = BigInt(flagValues("--from")[0] ?? deployBlock ?? "");
    const latest = await publicClient.getBlockNumber();
    const to = BigInt(flagValues("--to")[0] ?? latest);

    const ranges: Array<[bigint, bigint]> = [];
    for (let start = from; start <= to; start += CHUNK) {
      ranges.push([start, start + CHUNK - 1n > to ? to : start + CHUNK - 1n]);
    }
    console.log(`scanning ${from}–${to}: ${ranges.length} requests`);

    let done = 0;
    const worker = async () => {
      for (let r = ranges.shift(); r; r = ranges.shift()) {
        const logs = await publicClient.getContractEvents({
          address,
          abi: tipJarAbi,
          eventName: "Tipped",
          fromBlock: r[0],
          toBlock: r[1],
        });
        events.push(...(logs as unknown as Tipped[]));
        done += 1;
        if (done % 250 === 0) process.stdout.write(`  ${done} requests, ${events.length} tips so far\n`);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  // Printed before touching the store, so a scan is never wasted: these can be
  // fed back with --tx if the store step fails.
  for (const e of events) console.log(`  found ${e.transactionHash} (block ${e.blockNumber})`);

  // Map onchain keys back to our records.
  const [creators, takes, stored] = await Promise.all([repo.listCreators(), repo.listTakes(), repo.listTipIds()]);
  const creatorByKey = new Map(
    creators.filter((c) => c.youtubeChannelId).map((c) => [creatorKey(c.youtubeChannelId!), c]),
  );
  const takeByKey = new Map(takes.filter((t) => t.source === "youtube").map((t) => [takeKey(t.externalId), t]));

  const blockTimes = new Map<bigint, string>();
  const missing: Tip[] = [];
  let unknown = 0;

  for (const e of events) {
    const id = `${e.transactionHash}:${e.logIndex}`;
    if (stored.has(id)) continue;
    const creator = creatorByKey.get(e.args.creatorKey);
    const take = takeByKey.get(e.args.takeKey);
    if (!creator || !take || take.creatorId !== creator.id) {
      unknown += 1;
      continue;
    }
    if (!blockTimes.has(e.blockNumber)) {
      const block = await publicClient.getBlock({ blockNumber: e.blockNumber });
      blockTimes.set(e.blockNumber, new Date(Number(block.timestamp) * 1000).toISOString());
    }
    missing.push({
      id,
      takeId: take.id,
      creatorId: creator.id,
      from: e.args.from.toLowerCase(),
      amountUnits: Number(e.args.value),
      held: e.args.held,
      txHash: e.transactionHash,
      blockNumber: Number(e.blockNumber),
      createdAt: blockTimes.get(e.blockNumber)!,
    });
  }

  console.log(
    `\n${events.length} tips onchain · ${events.length - missing.length - unknown} already stored · ` +
      `${missing.length} missing · ${unknown} not matching any take (test tips, or removed creators)`,
  );
  for (const tip of missing) {
    const take = takes.find((t) => t.id === tip.takeId)!;
    console.log(`  $${tip.amountUnits / 1e6}  ${tip.createdAt.slice(0, 16)}  ${take.title.slice(0, 60)}`);
  }

  if (missing.length === 0) return;
  if (!write) {
    console.log("\nDry run — re-run with --write to store them.");
    return;
  }
  const added = await repo.recordTips(missing);
  console.log(`\nstored ${added} tip(s) in ${repo.kind}`);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
