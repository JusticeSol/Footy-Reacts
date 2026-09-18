"use client";

import Image from "next/image";
import { useState } from "react";
import type { HydratedTake } from "@/lib/types";
import { runtime, timeAgo } from "@/lib/format";
import { youtubeEmbedUrl, youtubeWatchUrl } from "@/lib/providers/youtube";

/**
 * A single creator's take.
 *
 * The player is a facade: we render YouTube's thumbnail and only mount the
 * iframe on click. Twenty live iframes on a match page would cost megabytes
 * before anyone pressed play.
 *
 * We embed and never re-host — the creator keeps their own monetisation and we
 * are adding views, not taking them. SUPPORT is the seat already reserved for
 * the stablecoin payment rail.
 */
export function TakeCard({ take }: { take: HydratedTake }) {
  const [playing, setPlaying] = useState(false);
  const length = runtime(take.durationSec);

  return (
    <article className="border border-rule bg-paper">
      <div className="relative aspect-video w-full bg-ink">
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`${youtubeEmbedUrl(take.externalId)}&autoplay=1`}
            title={take.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full"
            aria-label={`Play: ${take.title}`}
          >
            {take.thumbnailUrl ? (
              <Image
                src={take.thumbnailUrl}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
              />
            ) : (
              <div className="absolute inset-0 bg-ink-2" />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red text-paper transition-transform group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-current" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
            {length && (
              <span className="absolute bottom-2 right-2 bg-ink/90 px-1.5 py-0.5 font-mono text-[10px] text-paper">
                {length}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          <span className="font-bold text-ink-2">{take.creator.name}</span>
          <span>·</span>
          <span>{timeAgo(take.publishedAt)}</span>
          {take.taggedBy === "manual" && <span className="text-red">· verified</span>}
        </div>

        <h3 className="mt-1.5 text-sm leading-snug font-medium text-ink sm:text-base">
          <a
            href={youtubeWatchUrl(take.externalId)}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {take.title}
          </a>
        </h3>

        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
            {take.creator.handle}
          </span>
          <button
            type="button"
            disabled
            title="Creator payouts arrive in Phase 2"
            className="cursor-not-allowed border border-rule px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3"
          >
            Support →
          </button>
        </div>
      </div>
    </article>
  );
}
