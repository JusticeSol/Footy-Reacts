import { NextResponse } from "next/server";
import { isAddress, type Hex } from "viem";
import { getRepo } from "@/lib/repo";
import { explorerTxUrl, tipsEnabled } from "@/lib/chain/config";
import { privyUserId, usdcBalance } from "@/lib/chain/server";
import type { Tip } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * A signed-in fan's or creator's account: balance, tips sent, tips received.
 *
 * The balance is read from the chain, so it is always the true figure. The
 * history comes from the tip cache, which covers tips on takes; money that
 * reached the account another way (a claim for a channel not on the roster,
 * a test top-up) is in the balance but has no line here.
 */

interface Line {
  amountUnits: number;
  at: string;
  creator: string;
  take: string;
  matchUrl: string | null;
  receiptUrl: string;
  held: boolean;
}

export async function POST(request: Request) {
  if (!tipsEnabled) return NextResponse.json({ error: "not available" }, { status: 404 });
  if (!(await privyUserId(request))) return NextResponse.json({ error: "sign in first" }, { status: 401 });

  const { address } = (await request.json().catch(() => ({}))) as { address?: string };
  if (!address || !isAddress(address)) return NextResponse.json({ error: "malformed address" }, { status: 400 });

  const repo = getRepo();
  const [balance, creators, takes, fixtures] = await Promise.all([
    usdcBalance(address as Hex),
    repo.listCreators(),
    repo.listTakes(),
    repo.listFixtures(),
  ]);

  const mine = creators.filter((c) => c.payoutAddress?.toLowerCase() === address.toLowerCase());
  const [sent, received] = await Promise.all([
    repo.listTipsBy({ from: address }),
    repo.listTipsBy({ creatorIds: mine.map((c) => c.id) }),
  ]);

  const creatorById = new Map(creators.map((c) => [c.id, c]));
  const takeById = new Map(takes.map((t) => [t.id, t]));
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]));

  const toLine = (tip: Tip): Line => {
    const take = takeById.get(tip.takeId);
    const fixture = take && fixtureById.get(take.fixtureId);
    return {
      amountUnits: tip.amountUnits,
      at: tip.createdAt,
      creator: creatorById.get(tip.creatorId)?.name ?? "a creator",
      take: take?.title ?? "a take",
      matchUrl: fixture && take ? `/match/${fixture.slug}?phase=${take.phase}#take-${take.id}` : null,
      receiptUrl: explorerTxUrl(tip.txHash),
      held: tip.held,
    };
  };
  const newestFirst = (a: Line, b: Line) => Date.parse(b.at) - Date.parse(a.at);

  return NextResponse.json({
    balanceUnits: Number(balance),
    channels: mine.map((c) => c.name),
    sent: sent.map(toLine).sort(newestFirst),
    received: received.map(toLine).sort(newestFirst),
  });
}
