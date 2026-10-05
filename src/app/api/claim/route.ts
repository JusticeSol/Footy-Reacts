import { NextResponse } from "next/server";
import { isAddress, type Hex } from "viem";
import { getRepo } from "@/lib/repo";
import { creatorKey, explorerTxUrl, tipsEnabled } from "@/lib/chain/config";
import { claimCode, claimState, privyUserId, submitClaim } from "@/lib/chain/server";
import { fetchChannelProfile, resolveChannelIdFromHandle } from "@/lib/providers/youtube";

export const dynamic = "force-dynamic";

/**
 * A creator claims the tips held for their channel.
 *
 *   start   { channel: "@handle" | "UC…" } → the channel, what is held for it,
 *           and the code to paste into its description
 *   verify  { channelId, payout } (signed in) → checks the description holds
 *           the code, then the verifier signs and the relayer submits the claim
 *
 * Works for any YouTube channel, not only ones on our roster: TipJar holds
 * tips by channel id. If the channel is a roster creator, it is marked claimed.
 *
 * Ownership is proven by editing the channel description — something only the
 * channel's owner can do — so no Google sign-in or OAuth review is needed.
 * The trust is in our verifier key, which is stated plainly in the write-up.
 */

// Each start costs YouTube quota; throttle per caller to keep that bounded.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 15;
const recent = new Map<string, number[]>();

function throttled(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > MAX_PER_WINDOW;
}

async function channelIdFor(input: string): Promise<string | null> {
  const trimmed = input.trim();
  if (/^UC[\w-]{22}$/.test(trimmed)) return trimmed;
  const handle = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  return resolveChannelIdFromHandle(handle);
}

export async function POST(request: Request) {
  if (!tipsEnabled) return NextResponse.json({ error: "not available" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    channel?: string;
    channelId?: string;
    payout?: string;
  };
  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (throttled(caller)) {
    return NextResponse.json({ error: "too many requests — try again in a few minutes" }, { status: 429 });
  }

  if (body.action === "start") {
    if (!body.channel) return NextResponse.json({ error: "enter your channel handle" }, { status: 400 });
    const channelId = await channelIdFor(body.channel);
    if (!channelId) return NextResponse.json({ error: "no YouTube channel by that handle" }, { status: 404 });

    const [profile, state, creators] = await Promise.all([
      fetchChannelProfile(channelId),
      claimState(creatorKey(channelId)),
      getRepo().listCreators(),
    ]);
    if (!profile) return NextResponse.json({ error: "no YouTube channel by that handle" }, { status: 404 });

    return NextResponse.json({
      channelId,
      title: profile.title,
      handle: profile.handle,
      avatarUrl: profile.avatarUrl,
      code: claimCode(channelId),
      heldUnits: Number(state.heldUnits),
      claimedBy: state.payout,
      onRoster: creators.some((c) => c.youtubeChannelId === channelId),
    });
  }

  if (body.action === "verify") {
    const userId = await privyUserId(request);
    if (!userId) return NextResponse.json({ error: "sign in first" }, { status: 401 });

    const { channelId, payout } = body;
    if (!channelId || !/^UC[\w-]{22}$/.test(channelId) || !payout || !isAddress(payout)) {
      return NextResponse.json({ error: "malformed claim" }, { status: 400 });
    }

    const ck = creatorKey(channelId);
    const state = await claimState(ck);
    if (state.payout) {
      return NextResponse.json({ error: "this channel has already been claimed" }, { status: 409 });
    }

    const profile = await fetchChannelProfile(channelId);
    if (!profile?.description?.includes(claimCode(channelId))) {
      return NextResponse.json(
        {
          error:
            "the code isn't in your channel description yet — YouTube can take a minute to update after you save",
        },
        { status: 422 },
      );
    }

    try {
      const { txHash, sweptUnits } = await submitClaim(ck, payout as Hex);

      const repo = getRepo();
      const creator = (await repo.listCreators()).find((c) => c.youtubeChannelId === channelId);
      if (creator) await repo.setCreatorPayout(creator.id, payout.toLowerCase());

      return NextResponse.json({
        ok: true,
        sweptUnits: Number(sweptUnits),
        receiptUrl: explorerTxUrl(txHash),
      });
    } catch (err) {
      console.error(`[claim] ${channelId} failed: ${(err as Error).message}`);
      return NextResponse.json({ error: "the claim did not go through" }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
