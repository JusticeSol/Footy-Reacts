import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-5xl px-4 py-10 sm:px-5">
      <p className="font-mono text-[10px] uppercase leading-relaxed tracking-wider text-ink-3">
        Footy Reacts embeds — it never re-hosts. Every view counts on the creator&apos;s own
        channel.
      </p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
          Privacy
        </Link>
      </p>
    </footer>
  );
}
