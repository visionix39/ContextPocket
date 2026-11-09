"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { AskPanel } from "@/components/AskPanel";
import { styleFor } from "@/lib/colors";

export default function AskPage() {
  const { data: subjects } = useSWR("subjects", api.subjects);
  const [subject, setSubject] = useState<string | undefined>(undefined);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Ask your notes</h1>
        <p className="mt-1 text-ink-soft">
          Answers come only from material you&apos;ve uploaded, with the exact passages they came from.
        </p>
      </header>

      {subjects && subjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Scope</span>
          <button
            onClick={() => setSubject(undefined)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${!subject ? "bg-grape text-white" : "bg-white text-ink-soft"}`}
          >
            All classes
          </button>
          {subjects.map((s) => (
            <button
              key={s.subject}
              onClick={() => setSubject(subject === s.subject ? undefined : s.subject)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                subject === s.subject ? "bg-grape text-white" : `${styleFor(s.color).soft} text-ink/80`
              }`}
            >
              {s.subject}
            </button>
          ))}
        </div>
      )}

      <AskPanel key={subject ?? "all"} subject={subject} />
    </div>
  );
}
