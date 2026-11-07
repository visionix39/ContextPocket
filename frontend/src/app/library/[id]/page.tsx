"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { styleFor } from "@/lib/colors";
import { AskPanel } from "@/components/AskPanel";

function DocumentPageInner() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: doc, error } = useSWR(Number.isFinite(id) ? `document:${id}` : null, () => api.document(id));
  const { data: chunks } = useSWR(Number.isFinite(id) ? `chunks:${id}` : null, () => api.chunks(id));

  if (error) {
    return (
      <div className="cp-card p-8 text-center">
        <p className="text-ink">That document doesn&apos;t exist (anymore).</p>
        <Link href="/library" className="mt-3 inline-block text-sm font-semibold text-grape">
          ← Back to library
        </Link>
      </div>
    );
  }
  if (!doc) return <div className="cp-card h-40 animate-pulse" />;

  const s = styleFor(doc.color);

  return (
    <div className="space-y-8">
      <Link href="/library" className="inline-flex items-center gap-1 text-sm font-semibold text-grape hover:underline">
        <ArrowLeft className="h-4 w-4" /> Library
      </Link>
      <header className={`cp-card overflow-hidden`}>
        <div className={`h-2 ${s.bg}`} />
        <div className="flex items-start gap-4 p-6">
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${s.soft}`}>
            <FileText className={`h-6 w-6 ${s.text}`} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink">{doc.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              <Link href={`/subjects/${encodeURIComponent(doc.subject)}`} className="font-semibold text-grape">
                {doc.subject}
              </Link>{" "}
              · {doc.filename} · {doc.file_type.toUpperCase()}
              {doc.page_count ? ` · ${doc.page_count} pages` : ""} · {doc.chunk_count} passages ·{" "}
              {doc.char_count.toLocaleString()} characters
            </p>
          </div>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Ask about this file</h2>
        <AskPanel subject={doc.subject} placeholder={`Ask something covered in “${doc.title}”…`} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Passages</h2>
        <div className="grid gap-3">
          {(chunks ?? []).map((c) => (
            <article key={c.id} className="cp-card p-4">
              <header className="mb-1.5 flex items-center gap-2 text-xs text-ink-soft">
                <span className={`rounded-full px-2 py-0.5 font-semibold text-ink/80 ${s.soft}`}>#{c.index + 1}</span>
                {c.page && <span>p. {c.page}</span>}
                {c.heading && <span className="truncate">· {c.heading}</span>}
              </header>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">{c.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function DocumentPage() {
  return (
    <Suspense fallback={<div className="cp-card h-40 animate-pulse" />}>
      <DocumentPageInner />
    </Suspense>
  );
}
