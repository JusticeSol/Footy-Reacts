"use client";

import { useState } from "react";
import { TakeCard } from "./TakeCard";
import type { HydratedTake } from "@/lib/types";

/**
 * The takes on a match page, cut so the first screen is every creator once.
 *
 * Takes arrive interleaved by creator, so the opening run is already one from
 * each before anyone repeats. Cutting at that point is the product's own
 * promise — every creator's take on this match — while a channel's fifteenth
 * upload of the weekend is depth the reader can ask for.
 *
 * Every card is rendered and the surplus hidden with CSS rather than left out:
 * it keeps the whole page in the HTML for search engines, and makes revealing
 * instant.
 */

/** Never fewer than this, however few creators covered the match. */
const MIN_VISIBLE = 6;
/** Never more than this, however many creators did. */
const MAX_VISIBLE = 12;

function firstRoundLength(takes: HydratedTake[]): number {
  const seen = new Set<string>();
  for (let i = 0; i < takes.length; i += 1) {
    if (seen.has(takes[i].creatorId)) return i;
    seen.add(takes[i].creatorId);
  }
  return takes.length;
}

export function TakeList({ takes }: { takes: HydratedTake[] }) {
  const [expanded, setExpanded] = useState(false);

  const visible = Math.min(Math.max(firstRoundLength(takes), MIN_VISIBLE), MAX_VISIBLE);
  const surplus = takes.length - visible;

  return (
    <>
      <div className="grid gap-4 px-4 py-6 sm:grid-cols-2 sm:px-5 sm:py-8">
        {takes.map((take, i) => (
          <div key={take.id} className={!expanded && i >= visible ? "hidden" : undefined}>
            <TakeCard take={take} />
          </div>
        ))}
      </div>

      {surplus > 0 && (
        <div className="px-4 pb-8 sm:px-5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="w-full border border-ink bg-paper py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors hover:bg-red hover:text-paper"
          >
            {expanded ? "Show fewer" : `Show ${surplus} more take${surplus === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </>
  );
}
