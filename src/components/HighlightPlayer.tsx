"use client";

import Image from "next/image";
import { sizedThumbnail } from "@/lib/thumbnails";
import { useState } from "react";
import { runtime } from "@/lib/format";
import { youtubeEmbedUrl } from "@/lib/providers/youtube";

/**
 * An official highlights video. A facade like TakeCard: YouTube's thumbnail
 * until the visitor presses play, then the real player. Always the rights
 * holder's own upload, embedded and never re-hosted, so the views and the ad
 * revenue stay theirs.
 */
export function HighlightPlayer({
  videoId,
  title,
  thumbnailUrl,
  durationSec,
}: {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  durationSec?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const length = runtime(durationSec);

  return (
    <div className="relative aspect-video w-full bg-ink">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`${youtubeEmbedUrl(videoId)}&autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full"
          aria-label={`Play: ${title}`}
        >
          {thumbnailUrl ? (
            <Image
              src={sizedThumbnail(thumbnailUrl, "player")}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
          ) : (
            <div className="absolute inset-0 bg-ink-2" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red text-paper transition-transform group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current" aria-hidden>
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
  );
}
