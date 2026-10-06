import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Masthead } from "@/components/Masthead";
import { Account } from "@/components/tips/Account";
import { TipsLoader } from "@/components/tips/TipsLoader";
import { tipsEnabled } from "@/lib/chain/flags";

export const metadata: Metadata = {
  title: "Your account — Footy Reacts",
  robots: { index: false },
};

export default function AccountPage() {
  if (!tipsEnabled) notFound();

  return (
    <main className="min-h-screen">
      <Masthead subtitle="your account" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-12">
        <h1 className="font-display text-4xl leading-none sm:text-6xl">YOUR ACCOUNT</h1>
        <div className="mt-8">
          <TipsLoader>
            <Account />
          </TipsLoader>
        </div>
      </div>
    </main>
  );
}
