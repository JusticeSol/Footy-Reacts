import Link from "next/link";
import type { MatchdaySummary } from "@/lib/store";
import { dayHeading } from "@/lib/format";

/**
 * Matchday navigation — the archive made browsable.
 *
 * Every match page is permanent and reachable by URL, but until now nothing on
 * the site linked back to a played matchday, so the archive was invisible.
 *
 * Reads as a fixture-list header rather than pagination: the round number in
 * display type, its date range in mono, arrows at the edges.
 */
export function MatchdayNav({
  matchdays,
  active,
}: {
  matchdays: MatchdaySummary[];
  active: number;
}) {
  const index = matchdays.findIndex((m) => m.matchday === active);
  const previous = index > 0 ? matchdays[index - 1] : null;
  const next = index >= 0 && index < matchdays.length - 1 ? matchdays[index + 1] : null;
  const current = matchdays[index];

  const dates = current
    ? current.firstKickoff.slice(0, 10) === current.lastKickoff.slice(0, 10)
      ? dayHeading(current.firstKickoff)
      : `${dayHeading(current.firstKickoff).split(" ").slice(1).join(" ")} — ${dayHeading(
          current.lastKickoff,
        )
          .split(" ")
          .slice(1)
          .join(" ")}`
    : "";

  const arrow = "flex h-9 w-12 items-center justify-center border border-ink text-base transition-colors";

  return (
    <nav
      aria-label="Matchday"
      className="flex items-center justify-between gap-3 border-b border-ink bg-paper-2 px-4 py-3 sm:px-5"
    >
      {previous ? (
        <Link
          href={`/?md=${previous.matchday}`}
          className={`${arrow} bg-paper hover:bg-red hover:text-paper`}
          aria-label={`Matchday ${previous.matchday}`}
        >
          ←
        </Link>
      ) : (
        <span className={`${arrow} border-rule text-ink-3`} aria-hidden>
          ←
        </span>
      )}

      <div className="min-w-0 text-center">
        <p className="font-display text-xl leading-none sm:text-2xl">MATCHDAY {active}</p>
        <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-ink-3">
          {dates}
        </p>
      </div>

      {next ? (
        <Link
          href={`/?md=${next.matchday}`}
          className={`${arrow} bg-paper hover:bg-red hover:text-paper`}
          aria-label={`Matchday ${next.matchday}`}
        >
          →
        </Link>
      ) : (
        <span className={`${arrow} border-rule text-ink-3`} aria-hidden>
          →
        </span>
      )}
    </nav>
  );
}
