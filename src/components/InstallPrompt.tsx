"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// "Add to home screen" strip. Android/Chrome gets a real Install button (the
// browser's beforeinstallprompt event); iPhones have no such event, so they
// get the Share, then Add to Home Screen steps. Hidden on desktop, once
// installed (the app then runs "standalone") or after the reader dismisses it.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Mode = "native" | "ios" | "android" | null;

const DISMISSED = "fr-install-dismissed";

export function InstallPrompt() {
  const [mode, setMode] = useState<Mode>(null);
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED) === "1";
    } catch {}
    if (standalone || dismissed) return;

    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    setMode(ios ? "ios" : /Android/.test(ua) ? "android" : null);

    const onPrompt = (e: Event) => {
      e.preventDefault(); // show our own button instead of the browser's mini-bar
      setEvent(e as InstallEvent);
      setMode("native");
    };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mode) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {}
    setMode(null);
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") setMode(null);
    setEvent(null);
  };

  return (
    <div className="border-b border-ink bg-paper-2">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-5">
        <Image src="/icons/icon-192.png" alt="" width={36} height={36} className="shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base uppercase leading-tight">Put Footy Reacts on your home screen</p>
          {mode === "native" && <p className="text-xs text-ink-2">Opens like an app, straight to this week&apos;s takes.</p>}
          {mode === "ios" && (
            <p className="text-xs text-ink-2">
              In <strong>Safari</strong>, tap <strong>Share</strong> (the square with an arrow), then{" "}
              <strong>Add to Home Screen</strong>.
            </p>
          )}
          {mode === "android" && (
            <p className="text-xs text-ink-2">
              Open the browser menu (<strong>⋮</strong>), then <strong>Add to Home screen</strong> or{" "}
              <strong>Install app</strong>.
            </p>
          )}
        </div>
        {mode === "native" && (
          <button
            type="button"
            onClick={install}
            className="shrink-0 bg-red px-3 py-2 font-display text-sm uppercase text-paper hover:bg-red-dark"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 px-1 font-mono text-lg leading-none text-ink-3 hover:text-ink"
        >
          ×
        </button>
      </div>
    </div>
  );
}
