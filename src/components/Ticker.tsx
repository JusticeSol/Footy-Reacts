import Link from "next/link";
import type { HydratedFixture, HydratedTake } from "@/lib/types";

/**
 * The vidiprinter. A black teletext strip announcing takes as the tagging
 * agent files them — the ingestion pipeline turned into matchday atmosphere.
 */
export function Ticker({
  items,
}: {
  items: Array<{ take: HydratedTake; fixture: HydratedFixture }>;
}) {
  if (items.length === 0) return null;

  // Duplicated so the -50% scroll loops seamlessly.
  const track = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-ink bg-ink py-2 text-paper">
      <div className="ticker-track">
        {track.map(({ take, fixture }, i) => (
          <Link
            key={`${take.id}-${i}`}
            href={`/match/${fixture.slug}?phase=${take.phase}`}
            className="group flex items-center gap-2 px-5 font-mono text-[11px] uppercase tracking-wider sm:text-xs"
          >
            <span className={take.phase === "post" ? "text-red" : "text-paper/50"}>
              {take.phase === "post" ? "FT" : "PRE"}
            </span>
            <span className="font-bold">
              {fixture.homeTeam.abbr} v {fixture.awayTeam.abbr}
            </span>
            <span className="opacity-60 group-hover:opacity-100">{take.creator.name}</span>
            <span className="opacity-30">///</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
