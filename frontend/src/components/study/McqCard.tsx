"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { Question } from "@/lib/api";
import { SourcePeek } from "./SourcePeek";

export function McqCard({ q, onAnswer }: { q: Question; onAnswer: (verdict: "correct" | "missed", answer: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const done = picked !== null;
  const correct = picked === q.answer;

  const pick = (opt: string) => {
    if (done) return;
    setPicked(opt);
    onAnswer(opt === q.answer ? "correct" : "missed", opt);
  };

  return (
    <div className="space-y-5">
      <p className="text-lg font-medium leading-relaxed text-ink md:text-xl">{q.prompt}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {q.options.map((opt, i) => {
          const isAnswer = opt === q.answer;
          const isPicked = opt === picked;
          let cls = "border-line bg-white hover:border-grape hover:bg-grape-soft";
          if (done && isAnswer) cls = "border-emerald-400 bg-mint/30 text-emerald-900";
          else if (done && isPicked) cls = "animate-shake border-rose-400 bg-coral/25 text-rose-900";
          else if (done) cls = "border-line bg-white opacity-60";
          return (
            <button
              key={opt}
              onClick={() => pick(opt)}
              disabled={done}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium transition ${cls}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canvas text-xs font-bold text-ink-soft">
                {done && isAnswer ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : done && isPicked ? <X className="h-3.5 w-3.5 text-rose-700" /> : String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      {done && (
        <div className="animate-pop space-y-3">
          <p className={`text-sm font-semibold ${correct ? "text-emerald-700" : "text-rose-700"}`}>
            {correct ? "Nice! That's right." : `Not quite — the answer is “${q.answer}”.`}
          </p>
          {q.explanation && <p className="text-sm leading-relaxed text-ink-soft">{q.explanation}</p>}
          <SourcePeek q={q} />
        </div>
      )}
    </div>
  );
}
