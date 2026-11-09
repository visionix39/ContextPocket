"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { StudySession } from "@/components/study/StudySession";
import { Pocket } from "@/components/illustrations/Pocket";

function StudySetInner() {
  const { id } = useParams<{ id: string }>();
  const setId = Number(id);
  const { data: set, error } = useSWR(Number.isFinite(setId) ? `study-set-${setId}` : null, () => api.studySet(setId));

  if (error) {
    return (
      <div className="cp-card flex flex-col items-center gap-3 p-10 text-center">
        <Pocket mood="sleepy" className="h-24 w-24" />
        <p className="text-ink-soft">That practice set doesn&apos;t exist any more.</p>
        <Link href="/study" className="rounded-full bg-grape px-5 py-2 text-sm font-semibold text-white">
          Back to study
        </Link>
      </div>
    );
  }
  if (!set) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-ink-soft">
        <Pocket mood="thinking" className="h-20 w-20 animate-bounce-soft" />
        Loading your set…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start gap-3">
        <Link href="/study" className="mt-1 rounded-full p-2 text-ink-soft hover:bg-white hover:text-grape" aria-label="Back to study">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink md:text-3xl">{set.title}</h1>
          <p className="text-sm text-ink-soft">
            {set.subject ?? "All classes"} · {set.question_count} questions
            {set.generator === "rules" ? " · built from your notes" : ` · written by ${set.model ?? "local LLM"}`}
          </p>
        </div>
      </header>
      <StudySession set={set} />
    </div>
  );
}

export default function StudySetPage() {
  return (
    <Suspense fallback={<div className="h-40" />}>
      <StudySetInner />
    </Suspense>
  );
}
