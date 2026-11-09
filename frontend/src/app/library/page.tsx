"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { UploadDropzone } from "@/components/UploadDropzone";
import { DocumentCard } from "@/components/DocumentCard";
import { EmptyState } from "@/components/EmptyState";
import { styleFor } from "@/lib/colors";

export default function LibraryPage() {
  const { data: docs, isLoading } = useSWR("documents", () => api.documents());
  const { data: subjects } = useSWR("subjects", api.subjects);
  const [filter, setFilter] = useState<string | null>(null);

  const visible = (docs ?? []).filter((d) => !filter || d.subject === filter);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Library</h1>
        <p className="mt-1 text-ink-soft">Everything you upload is parsed, chunked and embedded on this machine.</p>
      </header>

      <UploadDropzone subjects={(subjects ?? []).map((s) => s.subject)} />

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-lg font-semibold text-ink">Your files</h2>
          <button
            onClick={() => setFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${!filter ? "bg-grape text-white" : "bg-white text-ink-soft"}`}
          >
            All
          </button>
          {(subjects ?? []).map((s) => (
            <button
              key={s.subject}
              onClick={() => setFilter(filter === s.subject ? null : s.subject)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filter === s.subject ? "bg-grape text-white" : `${styleFor(s.color).soft} text-ink/80`
              }`}
            >
              {s.subject}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="cp-card h-20 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title={filter ? `Nothing in ${filter} yet` : "No files yet"}
            body="Drop a PDF or Markdown file above. Lecture notes, textbook chapters, docs you're studying — anything you want to be quizzed on later."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((d) => (
              <DocumentCard key={d.id} doc={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
