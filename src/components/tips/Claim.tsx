"use client";

import dynamic from "next/dynamic";
import { useContext } from "react";
import { TipsReady } from "./context";

/** Holds the claim page's place until Privy has loaded, like TipButton. */
const ClaimWidget = dynamic(() => import("./ClaimWidget"), {
  ssr: false,
  loading: () => <Loading />,
});

export function Claim() {
  return useContext(TipsReady) ? <ClaimWidget /> : <Loading />;
}

function Loading() {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3" aria-busy="true">
      Loading…
    </p>
  );
}
