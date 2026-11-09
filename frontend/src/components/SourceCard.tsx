"use client";

import Link from "next/link";
import { useState } from "react";
import type { SearchHit } from "@/lib/api";
import { styleFor } from "@/lib/colors";

export function SourceCard({ hit, n, highlighted }: { hit: SearchHit; n: number; highlighted?: boolean }) {
  const s = styleFor(hit.color);
  const [open, setOpen] = useState(false);
  const long = hit.text.length > 420;
  const text = open || !long ? hit.text : hit.text.slice(0, 420).trimEnd() + "…";
  const pct = Math.max(4, Math.min(100, Math.round(hit.score * 100)));

  return (
    <article
      id={`source-${n}`}
      className={`cp-card animate-pop p-4 transition ${highlighted ? "ring-2 ring-grape" : ""}`}
      style={{ animationDelay: `${n * 40}ms` }}
    >
      <header className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-grape text-[11px] font-bold text-white">
          {n}
        </span>
        <Link href={`/library/${hit.document_id}`} className="font-semibold text-ink hover:text-grape">
          {hit.document_title}
        </Link>
        {hit.page && <span className="text-ink-soft">p. {hit.page}</span>}
        {hit.heading && <span className="truncate text-ink-soft">· {hit.heading}</span>}
        <span className={`ml-auto rounded-full px-2 py-0.5 font-semibold text-ink/80 ${s.soft}`}>{hit.subject}</span>
      </header>
      <p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">{text}</p>
      <footer className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className={`h-full rounded-full ${s.bg}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-medium text-ink-soft" title="cosine similarity">
          match {hit.score.toFixed(2)}
        </span>
        {long && (
          <button onClick={() => setOpen(!open)} className="text-[11px] font-semibold text-grape hover:underline">
            {open ? "Show less" : "Read more"}
          </button>
        )}
      </footer>
    </article>
  );
}
