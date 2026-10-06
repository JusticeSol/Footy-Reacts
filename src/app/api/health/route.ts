import { NextResponse } from "next/server";
import { getRepo } from "@/lib/repo";
import { tipsEnabled } from "@/lib/chain/flags";

export const dynamic = "force-dynamic";

/**
 * Diagnostic for "it works locally but not deployed".
 *
 * Reports which configuration reached this environment and whether a real read
 * succeeds, because a failed page render only ever shows an opaque digest.
 *
 * Secret-gated like the cron routes, and it reports the *presence and shape* of
 * credentials, never their values.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(request.url).searchParams.get("key") === secret;
}

function describe(value: string | undefined): string {
  if (value === undefined) return "MISSING";
  if (value === "") return "EMPTY STRING";
  const trimmed = value.trim();
  const notes: string[] = [`${value.length} chars`];
  if (trimmed !== value) notes.push("HAS SURROUNDING WHITESPACE");
  if (/^["']|["']$/.test(trimmed)) notes.push("WRAPPED IN QUOTES");
  return notes.join(", ");
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const env = {
    SUPABASE_URL: describe(url),
    // Never the value — only enough to spot a truncated or quoted paste.
    SUPABASE_SERVICE_ROLE_KEY: describe(key),
    urlLooksValid: url ? /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim()) : false,
    keyLooksLikeJwt: key ? key.trim().split(".").length === 3 : false,
  };

  const repo = getRepo();
  let read: { ok: boolean; fixtures?: number; takes?: number; error?: string };

  try {
    const [fixtures, takes] = await Promise.all([repo.listFixtures(), repo.listTakeKeys()]);
    read = { ok: true, fixtures: fixtures.length, takes: takes.size };
  } catch (err) {
    read = { ok: false, error: (err as Error).message };
  }

  // Presence and shape only, as above. NEXT_PUBLIC_ values are compiled in at
  // build time, so "MISSING" here after setting one means: redeploy.
  const tips = {
    enabled: tipsEnabled,
    NEXT_PUBLIC_TIPS_ENABLED: process.env.NEXT_PUBLIC_TIPS_ENABLED ?? "MISSING",
    NEXT_PUBLIC_TIPJAR_ADDRESS: describe(process.env.NEXT_PUBLIC_TIPJAR_ADDRESS),
    NEXT_PUBLIC_PRIVY_APP_ID: describe(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
    PRIVY_APP_SECRET: describe(process.env.PRIVY_APP_SECRET),
    RELAYER_PRIVATE_KEY: describe(process.env.RELAYER_PRIVATE_KEY),
    VERIFIER_PRIVATE_KEY: describe(process.env.VERIFIER_PRIVATE_KEY),
    YOUTUBE_API_KEY: describe(process.env.YOUTUBE_API_KEY),
  };

  return NextResponse.json({ store: repo.kind, env, tips, read }, { status: read.ok ? 200 : 500 });
}
