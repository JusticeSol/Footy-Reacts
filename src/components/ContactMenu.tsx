"use client";

import { useEffect, useRef, useState } from "react";
import { CONTACTS } from "@/lib/contact";

/**
 * Contact details, one tap from the masthead.
 *
 * Sits in the red bar so it is reachable from every page without taking space
 * from the fixtures. Renders nothing when no contacts are configured, so the
 * site never shows an empty menu.
 */
export function ContactMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (CONTACTS.length === 0) return null;

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 border border-paper/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-paper transition-colors hover:bg-paper hover:text-red sm:text-xs"
      >
        Contact
        <span className={`text-[8px] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          ▼
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 border border-ink bg-paper shadow-[4px_4px_0_0_rgba(22,19,15,0.15)]"
        >
          {CONTACTS.map((contact) => (
            <a
              key={`${contact.label}-${contact.value}`}
              role="menuitem"
              href={contact.href}
              target={contact.href.startsWith("http") ? "_blank" : undefined}
              rel={contact.href.startsWith("http") ? "noreferrer" : undefined}
              className="flex flex-col gap-0.5 border-b border-rule px-3 py-2.5 last:border-b-0 hover:bg-paper-2"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3">
                {contact.label}
              </span>
              <span className="truncate text-sm text-ink">{contact.value}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
