import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Masthead } from "@/components/Masthead";
import { Claim } from "@/components/tips/Claim";
import { TipsLoader } from "@/components/tips/TipsLoader";
import { tipsEnabled } from "@/lib/chain/flags";

export const metadata: Metadata = {
  title: "Collect your tips — Footy Reacts",
  description: "Fans can tip your reactions on Footy Reacts. Prove the channel is yours and collect them.",
};

export default function ClaimPage() {
  if (!tipsEnabled) notFound();

  return (
    <main className="min-h-screen">
      <Masthead subtitle="for creators" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-12">
        <h1 className="font-display text-4xl leading-none sm:text-6xl">COLLECT YOUR TIPS</h1>
        <p className="mt-4 max-w-xl text-ink-2">
          Fans on Footy Reacts can tip the reactions you post. If you haven&apos;t signed up, their tips are held
          for you — nobody else can take them. Prove the channel is yours and they&apos;re yours, along with every
          tip after.
        </p>
        <p className="mt-2 max-w-xl font-mono text-[10px] uppercase tracking-wider text-ink-3">
          Test money during the demo · unclaimed tips go back to fans after 90 days
        </p>
        <div className="mt-8">
          <TipsLoader>
            <Claim />
          </TipsLoader>
        </div>
      </div>
    </main>
  );
}
