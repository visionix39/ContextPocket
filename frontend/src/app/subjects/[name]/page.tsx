"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { api } from "@/lib/api";
import { colorForSubject, styleFor } from "@/lib/colors";
import { SubjectIcon } from "@/lib/subjectIcon";
import { AskPanel } from "@/components/AskPanel";
import { DocumentCard } from "@/components/DocumentCard";
import { UploadDropzone } from "@/components/UploadDropzone";
import { EmptyState } from "@/components/EmptyState";

function SubjectPageInner() {
  const params = useParams<{ name: string }>();
  const subject = decodeURIComponent(params.name);
  const { data: docs } = useSWR("documents", () => api.documents());
  const { data: subjects } = useSWR("subjects", api.subjects);

  const mine = (docs ?? []).filter((d) => d.subject === subject);
  const color = mine[0]?.color ?? colorForSubject(subject);
  const s = styleFor(color);
  const passages = mine.reduce((n, d) => n + d.chunk_count, 0);

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-grape hover:underline">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <header className={`cp-tile relative overflow-hidden p-8 ${s.bg}`}>
        <div className="flex items-center gap-5">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white shadow-soft">
            <SubjectIcon subject={subject} className={`h-9 w-9 ${s.text}`} />
          </span>
          <div>
            <h1 className="text-3xl font-semibold text-ink">{subject}</h1>
            <p className="mt-1 text-sm font-medium text-ink/70">
              {mine.length} {mine.length === 1 ? "file" : "files"} · {passages} passages
            </p>
            <p className="mt-2 text-xs text-ink/60">A revision queue for this class arrives in the next milestone.</p>
          </div>
          <Link
            href={`/study?subject=${encodeURIComponent(subject)}`}
            className="ml-auto hidden items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-grape shadow-soft transition hover:bg-grape hover:text-white sm:inline-flex"
          >
            <GraduationCap className="h-4 w-4" /> Make a quiz
          </Link>
        </div>
        <Link
          href={`/study?subject=${encodeURIComponent(subject)}`}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-grape shadow-soft sm:hidden"
        >
          <GraduationCap className="h-4 w-4" /> Make a quiz
        </Link>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Ask about {subject}</h2>
        <AskPanel subject={subject} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Files</h2>
        {docs && mine.length === 0 ? (
          <EmptyState title={`Nothing in ${subject} yet`} body="Upload notes below to start this class." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mine.map((d) => (
              <DocumentCard key={d.id} doc={d} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Add more to {subject}</h2>
        <UploadDropzone subjects={(subjects ?? []).map((x) => x.subject)} defaultSubject={subject} />
      </section>
    </div>
  );
}

export default function SubjectPage() {
  return (
    <Suspense fallback={<div className="cp-card h-40 animate-pulse" />}>
      <SubjectPageInner />
    </Suspense>
  );
}
