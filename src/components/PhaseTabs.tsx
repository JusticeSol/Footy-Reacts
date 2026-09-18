import Link from "next/link";
import type { Phase } from "@/lib/types";

/**
 * The two halves of a matchday. The active one goes full red like a raised
 * board — server-rendered links, so the phase lives in the URL and is
 * shareable ("send me the post-match takes").
 */
export function PhaseTabs({
  slug,
  active,
  counts,
}: {
  slug: string;
  active: Phase;
  counts: { pre: number; post: number };
}) {
  const tabs: Array<{ phase: Phase; label: string; count: number }> = [
    { phase: "pre", label: "Pre-Match", count: counts.pre },
    { phase: "post", label: "Post-Match", count: counts.post },
  ];

  return (
    <div className="grid grid-cols-2 border-y border-ink">
      {tabs.map((tab, i) => {
        const isActive = tab.phase === active;
        return (
          <Link
            key={tab.phase}
            href={`/match/${slug}?phase=${tab.phase}`}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={[
              "flex items-baseline justify-center gap-2 py-3 font-display text-lg uppercase tracking-wide transition-colors sm:text-xl",
              i === 0 ? "border-r border-ink" : "",
              isActive ? "bg-red text-paper" : "bg-paper text-ink-2 hover:bg-paper-2",
            ].join(" ")}
          >
            {tab.label}
            <span className="font-mono text-xs opacity-70">{tab.count}</span>
          </Link>
        );
      })}
    </div>
  );
}
