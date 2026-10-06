import Image from "next/image";
import { Money } from "./Money";
import type { HydratedTake, TipTotal } from "@/lib/types";

/**
 * The best-backed takes on this match, one per creator, where fans' tips meet
 * the aggregator. A spotlight above the list rather than a re-sort of it: the
 * list stays round-robin, so a well-tipped channel cannot own the page.
 */
export function MostSupported({ top }: { top: Array<{ take: HydratedTake; total: TipTotal }> }) {
  if (top.length === 0) return null;

  return (
    <section className="border-b border-rule px-4 py-5 sm:px-5" aria-labelledby="most-supported">
      <h2
        id="most-supported"
        className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3"
      >
        Most supported
      </h2>
      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {top.map(({ take, total }, i) => (
          <li key={take.id}>
            <a
              href={`#take-${take.id}`}
              className="group flex gap-3 border border-rule bg-paper p-2 transition-colors hover:border-ink"
            >
              <span className="relative aspect-video w-24 shrink-0 bg-ink">
                {take.thumbnailUrl && (
                  <Image src={take.thumbnailUrl} alt="" fill sizes="96px" className="object-cover" />
                )}
                <span className="absolute left-0 top-0 bg-red px-1 font-mono text-[10px] font-bold text-paper">
                  {i + 1}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block truncate font-mono text-[10px] font-bold uppercase tracking-wider text-ink-2">
                  {take.creator.name}
                </span>
                <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink group-hover:underline">
                  {take.title}
                </span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  <Money units={total.totalUnits} /> from {total.fans} {total.fans === 1 ? "fan" : "fans"}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
