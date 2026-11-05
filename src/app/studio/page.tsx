import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DraftCard } from "@/components/DraftCard";
import { getPostPack } from "@/lib/store";
import type { Draft } from "@/lib/studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio — Footy Reacts",
  robots: { index: false, follow: false },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://footy-reacts.vercel.app";

const SECTIONS: Array<{ kind: Draft["kind"]; heading: string; hint: string }> = [
  { kind: "post", heading: "After the whistle", hint: "Post with a short clip from the creator's video." },
  { kind: "pre", heading: "Before kickoff", hint: "Previews for games still to come." },
  { kind: "talk", heading: "What the fans are talking about", hint: "The day's story, as the channels see it." },
  { kind: "numbers", heading: "Numbers only we have", hint: "The one post with a link." },
];

/**
 * The X account's daily post pack: drafts built from the last two days of
 * takes, to edit and post from a phone. Gated by its own key, STUDIO_KEY,
 * because it is a working tool, not a page for readers.
 */
export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const secret = process.env.STUDIO_KEY;
  if (!secret || key !== secret) notFound();

  const pack = await getPostPack(SITE_URL);
  const inStreak = pack.day >= 1 && pack.day <= pack.streakLength;

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-3">Footy Reacts studio</p>
      <h1 className="mt-1 font-display text-4xl leading-none">
        {inStreak ? `Day ${pack.day} of ${pack.streakLength}` : pack.day < 1 ? "Streak starts 6 Nov" : "Streak done"}
      </h1>
      <p className="mt-2 text-sm text-ink-2">
        Drafts from the last two days of takes. Edit, copy, then attach your clip in X.
      </p>

      {pack.drafts.length === 0 && (
        <p className="mt-8 border-t border-rule pt-4 text-sm text-ink-2">
          Quiet day: nothing new from the creators in the last two days.
        </p>
      )}

      {SECTIONS.map(({ kind, heading, hint }) => {
        const drafts = pack.drafts.filter((d) => d.kind === kind);
        if (drafts.length === 0) return null;
        return (
          <section key={kind} className="mt-8">
            <h2 className="border-b border-ink pb-1 font-display text-xl uppercase">{heading}</h2>
            <p className="mt-1 text-xs text-ink-3">{hint}</p>
            <div className="mt-3 space-y-4">
              {drafts.map((d) => (
                <DraftCard key={d.id} draft={d} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
