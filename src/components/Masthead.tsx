import Link from "next/link";

export function Masthead({ subtitle }: { subtitle?: string }) {
  return (
    <header className="bg-red text-paper">
      <div className="mx-auto flex max-w-5xl items-baseline gap-3 px-4 py-4 sm:py-5">
        <Link href="/" className="font-display text-3xl leading-none tracking-tight sm:text-4xl">
          RED REACT
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-80 sm:text-xs">
          {subtitle ?? "every take, by fixture"}
        </span>
      </div>
    </header>
  );
}
