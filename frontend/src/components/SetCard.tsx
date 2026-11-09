"use client";

import Link from "next/link";
import { useState } from "react";
import { Bot, Layers, ListChecks, PenLine, Play, Trash2, Wand2 } from "lucide-react";
import { mutate } from "swr";
import { api, type QuestionSetSummary } from "@/lib/api";
import { styleFor } from "@/lib/colors";
import { SubjectIcon } from "@/lib/subjectIcon";

export function kindLabel(kind: string, n = 2) {
  const one = { mcq: "MCQ", short: "short answer", flashcard: "flashcard" }[kind] ?? kind;
  return n === 1 ? one : kind === "mcq" ? "MCQs" : `${one}s`;
}

export function SetCard({ set, index = 0 }: { set: QuestionSetSummary; index?: number }) {
  const s = styleFor(set.color);
  const [busy, setBusy] = useState(false);
  const date = new Date(set.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const remove = async () => {
    if (!confirm(`Delete “${set.title}”? This can't be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteSet(set.id);
      await mutate((key) => typeof key === "string" && key.startsWith("study-sets"));
      await mutate("health");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`cp-card animate-pop relative flex gap-4 p-4 ${busy ? "opacity-50" : ""}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${s.bg}`}>
        <SubjectIcon subject={set.subject ?? set.title} className="h-6 w-6 text-white drop-shadow" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-ink">{set.title}</h3>
            <p className="truncate text-xs text-ink-soft">
              {set.subject ?? "All classes"} · {date}
              {set.topic && <> · focus: {set.topic}</>}
            </p>
          </div>
          <button
            onClick={remove}
            className="rounded-full p-1.5 text-ink-soft/60 hover:bg-coral/20 hover:text-rose-700"
            title="Delete set"
            aria-label="Delete set"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          {set.counts.mcq ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-lavender/30 px-2 py-0.5 text-grape">
              <ListChecks className="h-3 w-3" /> {set.counts.mcq} MCQ
            </span>
          ) : null}
          {set.counts.short ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-aqua/30 px-2 py-0.5 text-cyan-800">
              <PenLine className="h-3 w-3" /> {set.counts.short} short
            </span>
          ) : null}
          {set.counts.flashcard ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sunny/40 px-2 py-0.5 text-amber-800">
              <Layers className="h-3 w-3" /> {set.counts.flashcard} cards
            </span>
          ) : null}
          <span
            className="ml-auto inline-flex items-center gap-1 text-ink-soft/70"
            title={set.generator === "rules" ? "Built from definitions in your notes (no LLM)" : `Written by ${set.model ?? "local LLM"}`}
          >
            {set.generator === "rules" ? <Wand2 className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
            {set.generator === "rules" ? "from your notes" : set.generator === "mixed" ? "LLM + notes" : "local LLM"}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-ink-soft">{set.question_count} questions</span>
          <Link
            href={`/study/${set.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-grape px-4 py-1.5 text-xs font-semibold text-white shadow-soft transition hover:bg-grape-dark"
          >
            <Play className="h-3.5 w-3.5" /> Study
          </Link>
        </div>
      </div>
    </div>
  );
}
