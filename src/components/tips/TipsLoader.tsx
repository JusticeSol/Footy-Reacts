"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { tipsEnabled } from "@/lib/chain/flags";

/**
 * Loads Privy after the page has rendered, not as part of it.
 *
 * Privy's SDK is large: imported statically it put ~500 kB on every match page
 * and made a cold dev server take minutes to show anything. Instead the page
 * renders and hydrates without it, and PrivyRoot is fetched in the background.
 * Mounting it re-renders what this wraps once, shortly after load, before
 * anyone has had time to interact with it.
 *
 * Wrap only the parts of a page that show take cards — not the root layout.
 * Turbopack compiles a dynamic import's target wherever the import appears, so
 * in the layout it added a minute to the cold compile of every page, including
 * ones with nothing to tip.
 *
 * With tips switched off nothing is fetched at all.
 */
type Root = ComponentType<{ children: ReactNode }>;

export function TipsLoader({ children }: { children: ReactNode }) {
  const [Root, setRoot] = useState<Root | null>(null);

  useEffect(() => {
    if (!tipsEnabled) return;
    let cancelled = false;
    import("@/components/tips/PrivyRoot")
      .then((mod) => {
        if (!cancelled) setRoot(() => mod.default);
      })
      .catch((err) => console.error("[tips] could not load sign-in:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  return Root ? <Root>{children}</Root> : <>{children}</>;
}
