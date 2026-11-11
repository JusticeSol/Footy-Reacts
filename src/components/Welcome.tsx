"use client";

import { useEffect, useState } from "react";

const SEEN = "fr-welcome-seen";

/**
 * One line for a first-time visitor saying what the page is for. Rendered on
 * the server so it is there on first paint and for crawlers; a returning
 * visitor's browser hides it. Storage can be blocked, in which case it shows.
 */
export function Welcome() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN) === "1") setHidden(true);
      else localStorage.setItem(SEEN, "1");
    } catch {
      // Private mode or blocked storage: keep showing it.
    }
  }, []);

  if (hidden) return null;

  return (
    <div className="border-b border-ink bg-paper-2">
      <p className="mx-auto max-w-5xl px-4 py-3 text-sm text-ink-2 sm:px-5">
        <span className="font-display text-base uppercase text-ink">Tap a match</span> to watch every
        fan channel&apos;s reaction, before kickoff and after the whistle.
      </p>
    </div>
  );
}
