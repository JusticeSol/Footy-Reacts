import Link from "next/link";
import type { HydratedFixture } from "@/lib/types";
import { kickoffTime } from "@/lib/format";

/**
 * One line of the Saturday results coupon: abbreviations in condensed display
 * type, everything numeric in mono, separated by hairlines.
 */
export function FixtureRow({ fixture }: { fixture: HydratedFixture }) {
  const { homeTeam, awayTeam, status, score, counts } = fixture;
  const total = counts.pre + counts.post;
  const decided = status === "finished" || status === "live";

  return (
    <Link
      href={`/match/${fixture.slug}`}
      className="group grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 border-b border-rule px-4 py-3 transition-colors hover:bg-paper-2 sm:gap-4 sm:px-5 sm:py-4"
    >
      <div className="font-mono text-xs text-ink-3">
        {status === "live" ? (
          <span className="flex items-center gap-1.5 font-bold text-live">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-live" />
            LIVE
          </span>
        ) : status === "postponed" ? (
          <span className="text-ink-3">P—P</span>
        ) : (
          kickoffTime(fixture.kickoffUtc)
        )}
      </div>

      <div className="flex items-center gap-2 font-display text-xl leading-none sm:gap-3 sm:text-2xl">
        <span className="min-w-0 truncate">{homeTeam.abbr}</span>
        {decided && score ? (
          <span className="font-mono text-base font-bold tabular-nums sm:text-lg">
            {score.home}–{score.away}
          </span>
        ) : (
          <span className="text-ink-3">v</span>
        )}
        <span className="min-w-0 truncate">{awayTeam.abbr}</span>
      </div>

      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider sm:text-xs">
        {total === 0 ? (
          <span className="text-ink-3">no takes yet</span>
        ) : (
          <>
            {counts.pre > 0 && (
              <span className="text-ink-2">
                {counts.pre} <span className="text-ink-3">pre</span>
              </span>
            )}
            {counts.post > 0 && (
              <span className="font-bold text-red">
                {counts.post} <span className="font-normal">post</span>
              </span>
            )}
          </>
        )}
        <span className="text-ink-3 transition-transform group-hover:translate-x-0.5">→</span>
      </div>
    </Link>
  );
}
