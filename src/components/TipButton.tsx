"use client";

import dynamic from "next/dynamic";
import { useContext } from "react";
import type { HydratedTake } from "@/lib/types";
import { TipsReady } from "./tips/context";

/**
 * The Support seat on a take card. Deliberately free of Privy imports: until
 * PrivyRoot has loaded in the background it shows a placeholder, then swaps in
 * the real widget. Keeps the SDK out of every card's first paint.
 */
const TipWidget = dynamic(() => import("./tips/TipWidget"), {
  ssr: false,
  loading: () => <Placeholder />,
});

export function TipButton({ take }: { take: HydratedTake }) {
  const ready = useContext(TipsReady);
  return ready ? <TipWidget take={take} /> : <Placeholder />;
}

const pill = "border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider";

function Placeholder() {
  return (
    <span className={`${pill} border-rule text-ink-3`} aria-busy="true">
      Support →
    </span>
  );
}

export function DisabledSupport() {
  return (
    <button
      type="button"
      disabled
      title="Creator payouts arrive in Phase 2"
      className={`cursor-not-allowed ${pill} border-rule text-ink-3`}
    >
      Support →
    </button>
  );
}
