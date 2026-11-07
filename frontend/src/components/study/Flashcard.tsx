"use client";

import { useState } from "react";
import { RotateCw, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Question } from "@/lib/api";
import { styleFor } from "@/lib/colors";
import { SourcePeek } from "./SourcePeek";

export function Flashcard({ q, onAnswer }: { q: Question; onAnswer: (verdict: "correct" | "missed", answer: string) => void }) {
  const [flipped, setFlipped] = useState(false);
  const [rated, setRated] = useState<"correct" | "missed" | null>(null);
  const s = styleFor(q.source.color);

  const rate = (v: "correct" | "missed") => {
    if (rated) return;
    setRated(v);
    onAnswer(v, v === "correct" ? "got it" : "still learning");
  };

  return (
    <div className="space-y-5">
      <div className={`cp-flip h-64 w-full cursor-pointer select-none sm:h-72 ${flipped ? "is-flipped" : ""}`} onClick={() => setFlipped((f) => !f)}>
        <div className="cp-flip-inner h-full w-full">
          <div className={`cp-flip-face flex flex-col items-center justify-center rounded-3xl ${s.bg} p-8 text-center shadow-card`}>
            <span className="mb-3 rounded-full bg-white/70 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink/70">{q.concept}</span>
            <p className="text-xl font-semibold leading-snug text-ink md:text-2xl">{q.prompt}</p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-ink/60">
              <RotateCw className="h-3.5 w-3.5" /> tap to flip
            </span>
          </div>
          <div className="cp-flip-face cp-flip-back flex flex-col items-center justify-center rounded-3xl border-2 border-line bg-white p-8 text-center shadow-card">
            <p className="text-base leading-relaxed text-ink md:text-lg">{q.answer}</p>
          </div>
        </div>
      </div>

      {flipped && !rated && (
        <div className="animate-pop flex items-center justify-center gap-3">
          <button
            onClick={() => rate("missed")}
            className="inline-flex items-center gap-2 rounded-full bg-coral/25 px-5 py-2.5 text-sm font-semibold text-rose-900 transition hover:bg-coral/40"
          >
            <ThumbsDown className="h-4 w-4" /> Still learning
          </button>
          <button
            onClick={() => rate("correct")}
            className="inline-flex items-center gap-2 rounded-full bg-mint/40 px-5 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-mint/60"
          >
            <ThumbsUp className="h-4 w-4" /> Got it
          </button>
        </div>
      )}
      {rated && (
        <div className="animate-pop">
          <SourcePeek q={q} quote={q.answer !== q.evidence} />
        </div>
      )}
    </div>
  );
}
