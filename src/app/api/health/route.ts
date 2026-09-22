import { NextResponse } from "next/server";
import { getRepo } from "@/lib/repo";

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

  return NextResponse.json({ store: repo.kind, env, read }, { status: read.ok ? 200 : 500 });
}
