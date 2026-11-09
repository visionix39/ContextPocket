"use client";

import { useState } from "react";
import { ArrowRight, Layers, ListChecks, PenLine } from "lucide-react";
import type { Question, QuestionKind, QuestionSet } from "@/lib/api";
import { Flashcard } from "./Flashcard";
import { McqCard } from "./McqCard";
import { SessionSummary, type Verdict } from "./SessionSummary";
import { ShortAnswerCard } from "./ShortAnswerCard";

const KIND_META: Record<QuestionKind, { label: string; icon: typeof ListChecks; cls: string }> = {
  mcq: { label: "Multiple choice", icon: ListChecks, cls: "bg-lavender/30 text-grape" },
  short: { label: "Short answer", icon: PenLine, cls: "bg-aqua/30 text-cyan-800" },
  flashcard: { label: "Flashcard", icon: Layers, cls: "bg-sunny/40 text-amber-800" },
};

export function StudySession({ set }: { set: QuestionSet }) {
  const [filter, setFilter] = useState<QuestionKind | "all">("all");
  const [round, setRound] = useState(0); // bump to remount cards on restart
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<number, Verdict>>({});
  const [answeredCurrent, setAnsweredCurrent] = useState(false);

  const queue: Question[] = filter === "all" ? set.questions : set.questions.filter((q) => q.kind === filter);
  const total = queue.length;
  const finished = index >= total;
  const q = queue[index];

  const restart = (next: QuestionKind | "all" = filter) => {
    setFilter(next);
    setIndex(0);
    setResults({});
    setAnsweredCurrent(false);
    setRound((r) => r + 1);
  };

  const onAnswer = (verdict: Verdict) => {
    if (!q) return;
    setResults((r) => ({ ...r, [q.id]: verdict }));
    setAnsweredCurrent(true);
  };

  const next = () => {
    setIndex((i) => i + 1);
    setAnsweredCurrent(false);
  };

  const kindsPresent = (["mcq", "short", "flashcard"] as QuestionKind[]).filter((k) => set.counts[k]);

  if (total === 0) {
    return <p className="cp-card p-8 text-center text-ink-soft">This set has no questions of that type.</p>;
  }

  if (finished) {
    return <SessionSummary questions={queue} results={results} onRestart={() => restart()} />;
  }

  const meta = KIND_META[q.kind];
  const Icon = meta.icon;
  const done = Object.keys(results).length;

  return (
    <div className="space-y-5">
      {/* filter + progress */}
      <div className="flex flex-wrap items-center gap-2">
        {kindsPresent.length > 1 && (
          <div className="inline-flex rounded-full bg-white p-1 shadow-soft">
            {(["all", ...kindsPresent] as const).map((k) => (
              <button
                key={k}
                onClick={() => restart(k)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === k ? "bg-grape text-white" : "text-ink-soft hover:text-grape"}`}
              >
                {k === "all" ? "Mixed" : KIND_META[k].label}
              </button>
            ))}
          </div>
        )}
        <span className="ml-auto text-xs font-semibold text-ink-soft">
          {index + 1} / {total}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white shadow-inner">
        <div className="h-full rounded-full bg-gradient-to-r from-grape to-aqua transition-all duration-500" style={{ width: `${(done / total) * 100}%` }} />
      </div>

      {/* card */}
      <article key={`${round}-${q.id}`} className="cp-card animate-pop p-6 md:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${meta.cls}`}>
            <Icon className="h-3.5 w-3.5" /> {meta.label}
          </span>
          {/* the concept is the MCQ answer and the flashcard front, so only show it for short answers */}
          {q.kind === "short" && <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{q.concept}</span>}
          <span className="ml-auto text-[11px] text-ink-soft/70" title="Difficulty">
            {"●".repeat(q.difficulty)}
            {"○".repeat(3 - q.difficulty)}
          </span>
        </div>

        {q.kind === "mcq" && <McqCard q={q} onAnswer={onAnswer} />}
        {q.kind === "short" && <ShortAnswerCard q={q} onAnswer={onAnswer} />}
        {q.kind === "flashcard" && <Flashcard q={q} onAnswer={onAnswer} />}

        <div className="mt-6 flex items-center justify-between">
          <button onClick={next} className="text-xs font-semibold text-ink-soft hover:text-grape" hidden={answeredCurrent}>
            Skip
          </button>
          {answeredCurrent && (
            <button
              onClick={next}
              autoFocus
              className="animate-pop ml-auto inline-flex items-center gap-2 rounded-full bg-grape px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-grape-dark"
            >
              {index + 1 === total ? "See results" : "Next"} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
