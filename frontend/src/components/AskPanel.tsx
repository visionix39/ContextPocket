"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2, MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import { ApiError, api, type AskResponse } from "@/lib/api";
import { Pocket } from "./illustrations/Pocket";
import { SourceCard } from "./SourceCard";

const EXAMPLES = [
  "Explain backpropagation in my own notes' words",
  "What does dropout do and why does it help?",
  "Summarise the key ideas about convolution",
];

/** Turn "[2]" citations in the answer into clickable chips. */
function renderWithCitations(text: string, onJump: (n: number) => void): ReactNode[] {
  const parts = text.split(/(\[\d+(?:,\s*\d+)*\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
    if (!m) return <span key={i}>{part}</span>;
    return m[1].split(/,\s*/).map((num, j) => (
      <button
        key={`${i}-${j}`}
        onClick={() => onJump(Number(num))}
        className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-grape px-1.5 align-text-bottom text-[11px] font-bold text-white hover:bg-grape-dark"
        title={`Jump to source ${num}`}
      >
        {num}
      </button>
    ));
  });
}

export function AskPanel({ subject, placeholder }: { subject?: string; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [focus, setFocus] = useState<number | null>(null);

  const submit = async (e?: FormEvent, override?: string) => {
    e?.preventDefault();
    const query = (override ?? q).trim();
    if (!query) return;
    setQ(query);
    setLoading(true);
    setError(null);
    setFocus(null);
    try {
      setResult(await api.ask(query, { subject, k: 5 }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong talking to the backend.");
    } finally {
      setLoading(false);
    }
  };

  const jump = (n: number) => {
    setFocus(n);
    document.getElementById(`source-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="cp-card p-4">
        <label htmlFor="question" className="sr-only">
          Ask a question
        </label>
        <div className="flex items-end gap-3">
          <Pocket mood={loading ? "thinking" : "happy"} className="hidden h-12 w-12 shrink-0 sm:block" />
          <textarea
            id="question"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) void submit(e);
            }}
            rows={2}
            placeholder={placeholder ?? (subject ? `Ask anything about ${subject}…` : "Ask anything about your notes…")}
            className="min-h-12 flex-1 resize-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm outline-none ring-grape/30 focus:ring-2"
          />
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-grape text-white shadow-soft transition hover:bg-grape-dark disabled:opacity-40"
            aria-label="Ask"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        {!result && !loading && (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                type="button"
                key={ex}
                onClick={() => void submit(undefined, ex)}
                className="rounded-full bg-grape-soft px-3 py-1 text-xs font-medium text-grape hover:bg-lavender/60"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </form>

      {error && <div className="rounded-2xl bg-coral/20 p-4 text-sm text-ink">{error}</div>}

      {result && (
        <section className="space-y-4">
          <div className="cp-card animate-pop p-5">
            <div className="mb-3 flex items-center gap-2">
              <MessageCircleQuestion className="h-4 w-4 text-grape" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Answer</span>
              <span
                className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  result.mode === "llm" ? "bg-mint/30 text-emerald-800" : "bg-sunny/40 text-amber-800"
                }`}
                title={
                  result.mode === "llm"
                    ? `Generated locally by ${result.model}, grounded in your notes`
                    : "Extractive mode: sentences pulled straight from your notes. Start Ollama for written answers."
                }
              >
                <Sparkles className="h-3 w-3" />
                {result.mode === "llm" ? `Local LLM · ${result.model}` : "From your notes"}
              </span>
            </div>
            <p className="text-[15px] leading-relaxed text-ink">{renderWithCitations(result.answer, jump)}</p>
          </div>

          {result.sources.length > 0 && (
            <div>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Sources from your library
              </h3>
              <div className="grid gap-3">
                {result.sources.map((hit, i) => (
                  <SourceCard key={hit.chunk_id} hit={hit} n={i + 1} highlighted={focus === i + 1} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
