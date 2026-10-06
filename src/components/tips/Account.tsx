"use client";

import dynamic from "next/dynamic";
import { useContext } from "react";
import { TipsReady } from "./context";

/** Holds the account page's place until Privy has loaded, like TipButton. */
const AccountWidget = dynamic(() => import("./AccountWidget"), {
  ssr: false,
  loading: () => <Loading />,
});

export function Account() {
  return useContext(TipsReady) ? <AccountWidget /> : <Loading />;
}

function Loading() {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3" aria-busy="true">
      Loading…
    </p>
  );
}
