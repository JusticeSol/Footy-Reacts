import { HighlightPlayer } from "@/components/HighlightPlayer";
import { sourceById } from "@/lib/highlights/sources";
import type { MatchHighlights } from "@/lib/highlights/select";
import { youtubeWatchUrl } from "@/lib/providers/youtube";
import type { Highlight } from "@/lib/types";

/**
 * Official highlights on the board and on match pages. Server components:
 * the pages choose which version a visitor's country can play, and only the
 * player itself runs in the browser.
 */

function credit(h: Highlight): string {
  return sourceById(h.sourceId)?.name ?? "YouTube";
}

function variant(h: Highlight): string {
  return `${h.extended ? "Extended highlights" : "Highlights"} · ${credit(h)}`;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 sm:text-xs">{children}</p>
  );
}

/** "Weekend goals": the league's own all-goals compilation for the matchday on the board. */
export function WeekendGoals({ highlight, matchday }: { highlight: Highlight; matchday: number }) {
  return (
    <section className="border-b border-ink px-4 py-5 sm:px-5 sm:py-6">
      <div className="mb-3 flex items-baseline justify-between gap-4 sm:max-w-3xl">
        <h2 className="font-display text-2xl uppercase leading-none sm:text-3xl">Weekend goals</h2>
        <Label>Matchday {matchday} · every goal</Label>
      </div>
      <div className="border border-rule sm:max-w-3xl">
        <HighlightPlayer
          videoId={highlight.videoId}
          title={highlight.title}
          thumbnailUrl={highlight.thumbnailUrl}
          durationSec={highlight.durationSec}
        />
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        Official · {credit(highlight)} · embedded from YouTube
      </p>
    </section>
  );
}

/** The match page's highlights: the version this visitor can play, plus the rest. */
export function MatchHighlightsSection({ picked }: { picked: MatchHighlights }) {
  const { main, more, watchOnYouTube } = picked;
  if (!main && !watchOnYouTube) return null;

  return (
    <section className="border-t border-rule px-4 py-5 sm:px-5 sm:py-6">
      <div className="mb-3 flex items-baseline justify-between gap-4 sm:max-w-3xl">
        <h2 className="font-display text-2xl uppercase leading-none sm:text-3xl">Highlights</h2>
        <Label>Official · embedded from YouTube</Label>
      </div>

      {main ? (
        <>
          <div className="border border-rule sm:max-w-3xl">
            <HighlightPlayer
              videoId={main.videoId}
              title={main.title}
              thumbnailUrl={main.thumbnailUrl}
              durationSec={main.durationSec}
            />
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">{variant(main)}</p>
          {more.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {more.map((h) => (
                <li key={h.id}>
                  <a
                    href={youtubeWatchUrl(h.videoId)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block border border-rule px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-2 hover:border-ink hover:text-ink"
                  >
                    {variant(h)} ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        watchOnYouTube && (
          // The rights holder has switched embedding off: send the visitor to them.
          <a
            href={youtubeWatchUrl(watchOnYouTube.videoId)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-4 border border-ink px-4 py-4 hover:bg-ink hover:text-paper"
          >
            <span>
              <span className="block font-display text-lg leading-tight">Watch the highlights on YouTube</span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider opacity-70">
                {credit(watchOnYouTube)} plays its highlights on YouTube only
              </span>
            </span>
            <span className="font-mono text-lg" aria-hidden>
              ↗
            </span>
          </a>
        )
      )}
    </section>
  );
}
