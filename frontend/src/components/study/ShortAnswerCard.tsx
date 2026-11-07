"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { ApiError, api, type GradeResponse, type Question } from "@/lib/api";
import { SourcePeek } from "./SourcePeek";

const VERDICT = {
  correct: { label: "Got it!", cls: "bg-mint/40 text-emerald-900" },
  partial: { label: "Partly there", cls: "bg-sunny/50 text-amber-900" },
  missed: { label: "Not yet", cls: "bg-coral/30 text-rose-900" },
};

export function ShortAnswerCard({ q, onAnswer }: { q: Question; onAnswer: (verdict: GradeResponse["verdict"], answer: string) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResponse | null>(null);

  const check = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.grade(q.id, text);
      setResult(r);
      onAnswer(r.verdict, text);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't grade that right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-lg font-medium leading-relaxed text-ink md:text-xl">{q.prompt}</p>
      {!result ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) check();
            }}
            rows={4}
            placeholder="Write your answer in your own words…"
            className="w-full resize-none rounded-2xl border-2 border-line bg-white px-4 py-3 text-sm leading-relaxed text-ink outline-none focus:border-grape"
          />
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <button
            onClick={check}
            disabled={!text.trim() || busy}
            className="inline-flex items-center gap-2 rounded-full bg-grape px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-grape-dark disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Check my answer
          </button>
        </>
      ) : (
        <div className="animate-pop space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${VERDICT[result.verdict].cls}`}>{VERDICT[result.verdict].label}</span>
            <span className="text-xs text-ink-soft" title="How close your wording and key terms were to your notes">
              match {Math.round(result.similarity * 100)}% · key terms {Math.round(result.coverage * 100)}%
            </span>
          </div>
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-soft">You wrote</div>
            <p className="mt-1 whitespace-pre-wrap text-ink/80">{text}</p>
          </div>
          {result.missing_terms.length > 0 && (
            <p className="text-sm text-ink-soft">
              Worth mentioning:{" "}
              {result.missing_terms.map((t) => (
                <span key={t} className="mr-1.5 inline-block rounded-full bg-sunny/50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  {t}
                </span>
              ))}
            </p>
          )}
          <div className="rounded-2xl border-2 border-mint/70 bg-mint/15 p-4 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Your notes say</div>
            <p className="mt-1 leading-relaxed text-ink">{result.reference}</p>
          </div>
          <SourcePeek q={q} quote={result.reference !== q.evidence} />
        </div>
      )}
    </div>
  );
}
