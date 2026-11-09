"use client";

import Link from "next/link";
import { FileText, FileType2, Trash2 } from "lucide-react";
import { useSWRConfig } from "swr";
import { api, type Document } from "@/lib/api";
import { styleFor } from "@/lib/colors";

export function DocumentCard({ doc }: { doc: Document }) {
  const s = styleFor(doc.color);
  const { mutate } = useSWRConfig();

  const remove = async () => {
    if (!window.confirm(`Remove “${doc.title}” from your library?`)) return;
    await api.deleteDocument(doc.id);
    await Promise.all([mutate("documents"), mutate("subjects"), mutate("health")]);
  };

  const Icon = doc.file_type === "pdf" ? FileText : FileType2;
  const date = new Date(doc.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="cp-card group flex items-center gap-4 p-4">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${s.soft}`}>
        <Icon className={`h-5 w-5 ${s.text}`} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/library/${doc.id}`} className="block truncate font-semibold text-ink hover:text-grape">
          {doc.title}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
          <Link
            href={`/subjects/${encodeURIComponent(doc.subject)}`}
            className={`rounded-full px-2 py-0.5 font-semibold text-ink/80 ${s.soft}`}
          >
            {doc.subject}
          </Link>
          <span className="uppercase">{doc.file_type}</span>
          {doc.page_count > 0 && <span>· {doc.page_count} pages</span>}
          <span>· {doc.chunk_count} passages</span>
          <span>· {date}</span>
          {doc.status === "failed" && <span className="font-semibold text-rose-700">· failed: {doc.error}</span>}
        </div>
      </div>
      <button
        onClick={remove}
        className="rounded-full p-2 text-ink-soft/60 opacity-0 transition hover:bg-coral/20 hover:text-rose-700 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Delete ${doc.title}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
