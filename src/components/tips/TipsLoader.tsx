"use client";

import dynamic from "next/dynamic";
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
 * Two things the shape below exists for:
 * - The import sits behind next/dynamic with ssr:false. A bare import() in an
 *   effect still lands in the server bundle, so the dev server compiled the
 *   whole SDK twice — once for a server that never runs it.
 * - Wrap only the parts of a page that show take cards, not the root layout.
 *   The bundler compiles a dynamic import's target wherever it appears, so in
 *   the layout it added a minute to the cold compile of every page.
 *
 * With tips switched off nothing is fetched at all.
 */
type Root = ComponentType<{ children: ReactNode }>;

const LoadPrivy = dynamic(
  () =>
    import("./PrivyRoot").then(({ default: PrivyRoot }) => {
      // Renders nothing; exists to hand PrivyRoot back once its chunk arrives.
      return function Loaded({ onLoad }: { onLoad: (root: Root) => void }) {
        useEffect(() => onLoad(PrivyRoot), [onLoad]);
        return null;
      };
    }),
  { ssr: false },
);

export function TipsLoader({ children }: { children: ReactNode }) {
  const [Root, setRoot] = useState<Root | null>(null);

  return (
    <>
      {tipsEnabled && !Root && <LoadPrivy onLoad={(root) => setRoot(() => root)} />}
      {Root ? <Root>{children}</Root> : children}
    </>
  );
}
