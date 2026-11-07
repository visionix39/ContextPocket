"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BookMarked, GraduationCap, Layers3, Pencil, Sparkles, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { useProfile } from "@/lib/useProfile";
import { HeroStudent } from "@/components/illustrations/HeroStudent";
import { NewSubjectCard, SubjectCard } from "@/components/SubjectCard";
import { StatTile } from "@/components/StatTile";
import { DocumentCard } from "@/components/DocumentCard";
import { EmptyState } from "@/components/EmptyState";

export default function DashboardPage() {
  const { name, setName } = useProfile();
  const [editing, setEditing] = useState(false);
  const { data: subjects } = useSWR("subjects", api.subjects);
  const { data: docs } = useSWR("documents", () => api.documents());
  const { data: health } = useSWR("health", api.health);

  const recent = (docs ?? []).slice(0, 4);

  return (
    <div className="space-y-10">
      {/* hero */}
      <section className="cp-card relative overflow-hidden">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="p-8 md:p-10">
            <h1 className="text-3xl font-semibold leading-tight text-ink md:text-4xl">
              Welcome back,
              <br />
              {editing ? (
                <input
                  autoFocus
                  defaultValue={name}
                  onBlur={(e) => {
                    setName(e.target.value);
                    setEditing(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  className="w-56 rounded-lg border border-lavender bg-canvas px-2 text-grape outline-none"
                  aria-label="Your name"
                />
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="group inline-flex items-center gap-2 font-bold text-grape"
                  title="Change your name"
                >
                  {name}!
                  <Pencil className="h-4 w-4 opacity-0 transition group-hover:opacity-60" />
                </button>
              )}
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-soft">
              Quiz yourself on your own notes, search a class, or ask a question across everything you&apos;ve uploaded.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/study"
                className="inline-flex items-center gap-2 rounded-full bg-grape px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-grape-dark"
              >
                <GraduationCap className="h-4 w-4" /> Quiz me
              </Link>
              <Link
                href="/ask"
                className="inline-flex items-center gap-2 rounded-full bg-grape-soft px-5 py-2.5 text-sm font-semibold text-grape transition hover:bg-lavender/60"
              >
                <Sparkles className="h-4 w-4" /> Ask my notes
              </Link>
              <Link
                href="/library"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink-soft shadow-soft transition hover:text-grape"
              >
                <Upload className="h-4 w-4" /> Upload notes
              </Link>
            </div>
          </div>
          <div className="relative h-64 md:h-80">
            <HeroStudent className="absolute inset-x-0 bottom-0 h-full w-full" />
          </div>
        </div>
      </section>

      {/* stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={BookMarked} label="Classes" value={subjects?.length ?? "–"} tone="lavender" />
        <StatTile icon={Upload} label="Files" value={health?.documents ?? "–"} tone="aqua" />
        <StatTile
          icon={Layers3}
          label="Passages indexed"
          value={health?.chunks ?? "–"}
          hint={health ? health.embedding_model.split("/").pop() : undefined}
          tone="sunny"
        />
        <StatTile
          icon={GraduationCap}
          label="Practice questions"
          value={health?.questions ?? "–"}
          hint={health ? `${health.question_sets} ${health.question_sets === 1 ? "set" : "sets"}` : undefined}
          tone="mint"
        />
      </section>

      {/* classes */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-ink">Your classes</h2>
          <Link href="/library" className="text-sm font-semibold text-grape hover:underline">
            Manage library →
          </Link>
        </div>
        {subjects && subjects.length === 0 ? (
          <EmptyState
            title="Your shelf is empty"
            body="Upload lecture notes, articles or docs. ContextPocket will split them into passages you can search and quiz yourself on."
            cta={{ href: "/library", label: "Upload your first notes" }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(subjects ?? []).map((s, i) => (
              <SubjectCard
                key={s.subject}
                subject={s.subject}
                color={s.color}
                documentCount={s.document_count}
                chunkCount={s.chunk_count}
                index={i}
              />
            ))}
            {subjects && <NewSubjectCard />}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-ink">Recently added</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {recent.map((d) => (
              <DocumentCard key={d.id} doc={d} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
