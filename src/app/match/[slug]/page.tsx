import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Masthead } from "@/components/Masthead";
import { PhaseTabs } from "@/components/PhaseTabs";
import { MostSupported } from "@/components/MostSupported";
import { TakeList } from "@/components/TakeList";
import { TipsLoader } from "@/components/tips/TipsLoader";
import { getFixtureBySlug, getTakes, getTipSummary } from "@/lib/store";
import { dayHeading, kickoffTime } from "@/lib/format";
import type { Phase } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const fixture = await getFixtureBySlug(slug);
  if (!fixture) return { title: "Match not found — Footy Reacts" };

  const scoreline = fixture.score
    ? `${fixture.homeTeam.shortName} ${fixture.score.home}-${fixture.score.away} ${fixture.awayTeam.shortName}`
    : `${fixture.homeTeam.shortName} v ${fixture.awayTeam.shortName}`;

  const total = fixture.counts.pre + fixture.counts.post;
  const description =
    total > 0
      ? `${total} creator takes on ${scoreline}, pre-match and post-match, on one page.`
      : `Every creator's take on ${scoreline}, pre-match and post-match, on one page.`;

  return {
    title: `${scoreline} — every take | Footy Reacts`,
    description,
    openGraph: { title: `${scoreline} — every take`, description, type: "article" },
    twitter: { card: "summary_large_image", title: `${scoreline} — every take`, description },
  };
}

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ phase?: string }>;
}) {
  const { slug } = await params;
  const { phase: phaseParam } = await searchParams;

  const fixture = await getFixtureBySlug(slug);
  if (!fixture) notFound();

  // Default to whichever half of the matchday the reader is actually in.
  const played = Date.now() > Date.parse(fixture.kickoffUtc) + 115 * 60_000;
  const phase: Phase =
    phaseParam === "pre" || phaseParam === "post" ? phaseParam : played ? "post" : "pre";

  const takes = await getTakes(fixture.id, phase);
  const tips = await getTipSummary(takes);

  return (
    <main className="min-h-screen">
      <Masthead subtitle={`${fixture.homeTeam.abbr} v ${fixture.awayTeam.abbr}`} />

      <div className="mx-auto max-w-5xl">
        <div className="border-b border-rule px-4 py-2 sm:px-5">
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:text-ink"
          >
            ← all fixtures
          </Link>
        </div>

        <section className="px-4 py-6 sm:px-5 sm:py-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 sm:text-xs">
            {dayHeading(fixture.kickoffUtc)} · {kickoffTime(fixture.kickoffUtc)}
            {fixture.matchday ? ` · MD${fixture.matchday}` : ""}
          </p>

          <div className="mt-3 flex items-center gap-3 sm:gap-5">
            <h1 className="font-display text-4xl leading-none sm:text-6xl">
              {fixture.homeTeam.shortName}
            </h1>
            {fixture.score ? (
              <span className="font-mono text-2xl font-bold tabular-nums text-red sm:text-4xl">
                {fixture.score.home}–{fixture.score.away}
              </span>
            ) : (
              <span className="font-display text-2xl text-ink-3 sm:text-4xl">v</span>
            )}
            <h1 className="font-display text-4xl leading-none sm:text-6xl">
              {fixture.awayTeam.shortName}
            </h1>
          </div>

          {fixture.status === "live" && (
            <p className="mt-2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-live">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-live" />
              in play
            </p>
          )}
        </section>

        <PhaseTabs slug={fixture.slug} active={phase} counts={fixture.counts} />

        {takes.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="font-display text-xl text-ink-2">
              {phase === "pre" ? "NO PREVIEWS FILED YET" : "NO REACTIONS FILED YET"}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
              {phase === "pre"
                ? "creators usually post from 48h before kickoff"
                : "reactions land within an hour of full time"}
            </p>
          </div>
        ) : (
          <>
            <MostSupported top={tips.top} />
            <TipsLoader>
              <TakeList takes={takes} tipTotals={tips.totals} />
            </TipsLoader>
          </>
        )}
      </div>
    </main>
  );
}
