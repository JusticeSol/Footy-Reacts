import Link from "next/link";
import { COMPETITIONS, PREMIER_LEAGUE, type Competition } from "@/lib/competitions";

/**
 * The board's competition switch. Deliberately quieter than the phase tabs:
 * it picks which board you are looking at, then gets out of the way. The
 * choice lives in the URL (`/?c=ucl`), so a shared link opens the same board.
 */
export function CompetitionTabs({ active }: { active: Competition }) {
  return (
    <nav aria-label="Competition" className="grid grid-cols-2 border-b border-ink">
      {COMPETITIONS.map((c, i) => {
        const isActive = c.id === active.id;
        return (
          <Link
            key={c.id}
            href={c.id === PREMIER_LEAGUE.id ? "/" : `/?c=${c.key}`}
            aria-current={isActive ? "page" : undefined}
            className={[
              "py-2.5 text-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors sm:text-xs",
              i === 0 ? "border-r border-ink" : "",
              isActive ? "bg-ink text-paper" : "bg-paper text-ink-3 hover:bg-paper-2 hover:text-ink",
            ].join(" ")}
          >
            {c.name}
          </Link>
        );
      })}
    </nav>
  );
}
