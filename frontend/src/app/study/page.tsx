"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { GeneratorPanel } from "@/components/GeneratorPanel";
import { SetCard } from "@/components/SetCard";
import { EmptyState } from "@/components/EmptyState";

function StudyPageInner() {
  const params = useSearchParams();
  const initialSubject = params.get("subject") ?? undefined;
  const { data: sets } = useSWR("study-sets", () => api.studySets());

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Study</h1>
        <p className="mt-1 text-ink-soft">Turn your notes into quizzes and flashcards. Every question shows exactly where it came from.</p>
      </header>

      <GeneratorPanel key={initialSubject ?? "all"} initialSubject={initialSubject} />

      <section>
        <h2 className="mb-4 text-xl font-semibold text-ink">Your practice sets</h2>
        {sets && sets.length === 0 ? (
          <EmptyState
            title="No practice sets yet"
            body="Pick a class above and generate your first set. You can mix multiple choice, short answers and flashcards."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">{(sets ?? []).map((s, i) => <SetCard key={s.id} set={s} index={i} />)}</div>
        )}
      </section>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<div className="h-40" />}>
      <StudyPageInner />
    </Suspense>
  );
}
