"use client";

import { useLinkStatus } from "next/link";

/**
 * A red bar along the bottom of the link that was tapped, while its page
 * loads. Goes inside a <Link> with `relative` set. A route-level loading.tsx
 * would show more, but it streams the response, so a missing match answered
 * 200 instead of 404.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-red"
    />
  );
}
