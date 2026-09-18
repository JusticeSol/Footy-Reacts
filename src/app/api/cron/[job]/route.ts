import { NextResponse } from "next/server";
import { runFixturesSync, runTakesSync } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron entry points: /api/cron/fixtures and /api/cron/takes.
 *
 * Auth is a shared secret, accepted as `Authorization: Bearer <secret>`
 * (what Vercel Cron sends) or `?key=<secret>` for a quick manual poke.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  return new URL(request.url).searchParams.get("key") === secret;
}

export async function GET(request: Request, ctx: { params: Promise<{ job: string }> }) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { job } = await ctx.params;
  const startedAt = Date.now();

  try {
    if (job === "fixtures") {
      const result = await runFixturesSync();
      return NextResponse.json({ job, ms: Date.now() - startedAt, ...result });
    }

    if (job === "takes") {
      const result = await runTakesSync();
      return NextResponse.json({ job, ms: Date.now() - startedAt, ...result });
    }

    return NextResponse.json({ error: `unknown job: ${job}` }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ job, error: (err as Error).message }, { status: 500 });
  }
}
