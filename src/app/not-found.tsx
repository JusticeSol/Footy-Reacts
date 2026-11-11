import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";

/** A dead link, usually an old or mistyped match: send the reader back to this week's games. */
export default function NotFound() {
  return (
    <main className="min-h-screen">
      <Masthead />
      <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-3">404</p>
        <h1 className="mt-2 font-display text-4xl uppercase leading-none sm:text-5xl">Off the pitch</h1>
        <p className="mx-auto mt-4 max-w-sm text-ink-2">
          This page doesn&apos;t exist. The match may have moved, or the link was mistyped.
        </p>
        <Link href="/" className="mt-8 inline-block bg-red px-5 py-3 font-bold text-paper">
          Back to this week&apos;s matches
        </Link>
      </div>
      <SiteFooter />
    </main>
  );
}
