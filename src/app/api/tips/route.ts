import { NextResponse } from "next/server";
import { isAddress, isHex, type Hex } from "viem";
import { getRepo } from "@/lib/repo";
import {
  TIP_AMOUNTS,
  creatorKey,
  explorerTxUrl,
  takeKey,
  tipsEnabled,
  toUnits,
} from "@/lib/chain/config";
import { privyUserId, relayTip } from "@/lib/chain/server";

export const dynamic = "force-dynamic";

/**
 * Relays a fan's signed tip.
 *
 * The browser sends only which take, how much, and the signature. The creator
 * and video keys are derived here from our own records, so a client cannot
 * point a tip at something that is not a take on the site — and if its
 * signature was built for different keys, USDC rejects it onchain.
 */

// Per-user throttle. In-memory, so it resets per serverless instance: enough
// to stop a runaway client draining relayer gas on testnet, not a real limit.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 20;
const recent = new Map<string, number[]>();

function throttled(userId: string): boolean {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(userId, hits);
  return hits.length > MAX_PER_WINDOW;
}

interface TipBody {
  takeId?: string;
  from?: string;
  amount?: number;
  validBefore?: string;
  salt?: string;
  signature?: string;
}

export async function POST(request: Request) {
  if (!tipsEnabled) return NextResponse.json({ error: "tips are not enabled" }, { status: 404 });

  const userId = await privyUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in to tip" }, { status: 401 });
  if (throttled(userId)) {
    return NextResponse.json({ error: "too many tips — try again in a few minutes" }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as TipBody;
  const { takeId, from, amount, validBefore, salt, signature } = body;

  if (
    !takeId ||
    !from ||
    !isAddress(from) ||
    !TIP_AMOUNTS.includes(amount as (typeof TIP_AMOUNTS)[number]) ||
    !validBefore ||
    !/^\d+$/.test(validBefore) ||
    !salt ||
    !isHex(salt) ||
    salt.length !== 66 ||
    !signature ||
    !isHex(signature)
  ) {
    return NextResponse.json({ error: "malformed tip" }, { status: 400 });
  }

  // An authorization valid for days could be sat on and replayed later by
  // anyone holding it; the client asks for one hour.
  const expiry = BigInt(validBefore);
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (expiry <= now || expiry > now + 7200n) {
    return NextResponse.json({ error: "tip authorization has a bad expiry" }, { status: 400 });
  }

  const repo = getRepo();
  const [takes, creators] = await Promise.all([repo.listTakes(), repo.listCreators()]);
  const take = takes.find((t) => t.id === takeId);
  const creator = take && creators.find((c) => c.id === take.creatorId);
  if (!take || take.source !== "youtube" || !creator?.youtubeChannelId) {
    return NextResponse.json({ error: "that take cannot be tipped" }, { status: 404 });
  }

  try {
    const relayed = await relayTip({
      creatorKey: creatorKey(creator.youtubeChannelId),
      takeKey: takeKey(take.externalId),
      from: from as Hex,
      value: toUnits(amount as number),
      validBefore: expiry,
      salt: salt as Hex,
      signature: signature as Hex,
    });

    return NextResponse.json({
      ok: true,
      txHash: relayed.txHash,
      receiptUrl: explorerTxUrl(relayed.txHash),
      held: relayed.held,
      creator: creator.name,
      amount,
    });
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[tips] relay failed for ${takeId}: ${message}`);
    // The common failure is a balance the fan does not have; say so plainly.
    const friendly = /transfer amount exceeds balance|exceeds balance/i.test(message)
      ? "not enough test money for that tip"
      : "the tip did not go through";
    return NextResponse.json({ error: friendly }, { status: 502 });
  }
}
