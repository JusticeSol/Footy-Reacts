import { NextResponse } from "next/server";
import { isAddress, type Hex } from "viem";
import { explorerTxUrl, tipsChain, tipsEnabled, toUnits } from "@/lib/chain/config";
import { privyUserId, relayerAddress, sendTestUsdc, usdcBalance } from "@/lib/chain/server";

export const dynamic = "force-dynamic";

/**
 * "Get $5 test money" — tops a fan's wallet up from the relayer's treasury so
 * the tip flow can be tried without visiting a faucet.
 *
 * Testnet only, by construction: it refuses to run on any chain that is not
 * flagged as a testnet. It only tops up a wallet that is nearly empty, which
 * keeps one visitor from draining the treasury by asking repeatedly.
 */

const TOP_UP = 5;
const ONLY_BELOW = toUnits(1);
const COOLDOWN_MS = 10 * 60_000;
const lastTopUp = new Map<string, number>();

export async function POST(request: Request) {
  if (!tipsEnabled || !tipsChain.testnet) {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  const userId = await privyUserId(request);
  if (!userId) return NextResponse.json({ error: "sign in first" }, { status: 401 });

  const { address } = (await request.json().catch(() => ({}))) as { address?: string };
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "malformed address" }, { status: 400 });
  }

  const last = lastTopUp.get(userId);
  if (last && Date.now() - last < COOLDOWN_MS) {
    return NextResponse.json({ error: "you were topped up a moment ago" }, { status: 429 });
  }

  const balance = await usdcBalance(address as Hex);
  if (balance >= ONLY_BELOW) {
    return NextResponse.json({ error: "you still have test money to tip with" }, { status: 409 });
  }

  const treasury = await usdcBalance(await relayerAddress());
  if (treasury < toUnits(TOP_UP)) {
    console.error(`[faucet] treasury low: ${treasury} units`);
    return NextResponse.json({ error: "test money has run out — try again later" }, { status: 503 });
  }

  lastTopUp.set(userId, Date.now());
  try {
    const hash = await sendTestUsdc(address as Hex, toUnits(TOP_UP));
    return NextResponse.json({ ok: true, amount: TOP_UP, receiptUrl: explorerTxUrl(hash) });
  } catch (err) {
    lastTopUp.delete(userId);
    console.error(`[faucet] transfer failed: ${(err as Error).message}`);
    return NextResponse.json({ error: "could not send test money" }, { status: 502 });
  }
}
