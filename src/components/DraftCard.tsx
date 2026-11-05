"use client";

import { useState } from "react";
import type { Draft } from "@/lib/studio";

/** One editable draft: tweak the text, copy it, or open X with it filled in. */
export function DraftCard({ draft }: { draft: Draft }) {
  const [text, setText] = useState(draft.text);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be refused; the text is still there to select.
    }
  }

  return (
    <div className="border border-rule bg-paper-2 p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(8, text.split("\n").length + 2)}
        className="w-full resize-y border border-rule bg-paper p-2 text-base leading-snug"
      />
      <div className="mt-1 text-right font-mono text-xs text-ink-3">{text.length}/280</div>
      {draft.note && <p className="mt-1 text-xs text-ink-2">{draft.note}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button onClick={copy} className="bg-ink px-3 py-2 font-bold text-paper">
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-red px-3 py-2 font-bold text-paper"
        >
          Post on X
        </a>
        {draft.videoUrl && (
          <a href={draft.videoUrl} target="_blank" rel="noopener noreferrer" className="border border-ink px-3 py-2">
            Video
          </a>
        )}
        {draft.pageUrl && (
          <a href={draft.pageUrl} target="_blank" rel="noopener noreferrer" className="border border-ink px-3 py-2">
            Match page
          </a>
        )}
      </div>
    </div>
  );
}
