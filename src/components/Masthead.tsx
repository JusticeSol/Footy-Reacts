import Link from "next/link";
import { ContactMenu } from "./ContactMenu";

export function Masthead({ subtitle }: { subtitle?: string }) {
  return (
    <header className="bg-red text-paper">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:py-5">
        <Link href="/" className="font-display text-3xl leading-none tracking-tight sm:text-4xl">
          FOOTY REACTS
        </Link>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] opacity-80 min-[420px]:inline sm:text-xs">
          {subtitle ?? "every take, by fixture"}
        </span>
        <ContactMenu />
      </div>
    </header>
  );
}
