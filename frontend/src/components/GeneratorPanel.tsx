"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { Layers, ListChecks, PenLine, Sparkles, Wand2 } from "lucide-react";
import { ApiError, api, type QuestionKind } from "@/lib/api";
import { styleFor } from "@/lib/colors";
import { Pocket } from "./illustrations/Pocket";

const KINDS: { kind: QuestionKind; label: string; icon: typeof ListChecks; tone: string }[] = [
  { kind: "mcq", label: "Multiple choice", icon: ListChecks, tone: "bg-lavender/30 text-grape ring-grape/40" },
  { kind: "short", label: "Short answer", icon: PenLine, tone: "bg-aqua/30 text-cyan-800 ring-cyan-700/40" },
  { kind: "flashcard", label: "Flashcards", icon: Layers, tone: "bg-sunny/40 text-amber-800 ring-amber-600/40" },
];
const COUNTS = [5, 10, 15, 20];
const LOADING_LINES = ["Reading your notes…", "Finding the key ideas…", "Writing questions…", "Double-checking sources…"];

export function GeneratorPanel({ initialSubject }: { initialSubject?: string }) {
  const router = useRouter();
  const { data: subjects } = useSWR("subjects", api.subjects);
  const { data: health } = useSWR("health", api.health);
  const [subject, setSubject] = useState<string | undefined>(initialSubject);
  const { data: docs } = useSWR(subject ? `documents?subject=${subject}` : null, () => api.documents(subject));
  const [docId, setDocId] = useState<number | undefined>(undefined);
  const [kinds, setKinds] = useState<QuestionKind[]>(["mcq", "short", "flashcard"]);
  const [count, setCount] = useState(10);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1400);
    return () => clearInterval(t);
  }, [loading]);

  const toggleKind = (k: QuestionKind) =>
    setKinds((cur) => (cur.includes(k) ? (cur.length > 1 ? cur.filter((x) => x !== k) : cur) : [...cur, k]));

  const pickSubject = (s: string | undefined) => {
    setSubject(s);
    setDocId(undefined);
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const set = await api.generateSet({
        kinds,
        count,
        subject: docId ? undefined : subject,
        document_ids: docId ? [docId] : undefined,
        topic: topic.trim() || undefined,
      });
      await mutate((key) => typeof key === "string" && key.startsWith("study-sets"));
      await mutate("health");
      router.push(`/study/${set.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong talking to the backend.");
      setLoading(false);
    }
  };

  const noNotes = subjects && subjects.length === 0;

  return (
    <section className="cp-card relative overflow-hidden p-6 md:p-8">
      <div className="grid gap-8 md:grid-cols-[1fr_200px]">
        <div className="space-y-6">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
              <Wand2 className="h-5 w-5 text-grape" /> Make a new practice set
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {health?.ollama_available
                ? `Questions are written by your local LLM (${health.ollama_model}) and checked against your notes.`
                : "Questions are built from the definitions and explanations in your own notes, so every one has a source."}
            </p>
          </div>

          {/* scope */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">From</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => pickSubject(undefined)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${!subject ? "bg-grape text-white" : "bg-canvas text-ink-soft hover:bg-grape-soft"}`}
              >
                All classes
              </button>
              {(subjects ?? []).map((s) => (
                <button
                  key={s.subject}
                  onClick={() => pickSubject(s.subject)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    subject === s.subject ? "bg-grape text-white" : `${styleFor(s.color).soft} text-ink/80 hover:brightness-95`
                  }`}
                >
                  {s.subject}
                </button>
              ))}
            </div>
            {subject && docs && docs.length > 1 && (
              <select
                value={docId ?? ""}
                onChange={(e) => setDocId(e.target.value ? Number(e.target.value) : undefined)}
                className="mt-2 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-grape sm:w-auto"
                aria-label="Limit to one file"
              >
                <option value="">Every file in {subject}</option>
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* kinds */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Question types</div>
            <div className="flex flex-wrap gap-2">
              {KINDS.map(({ kind, label, icon: Icon, tone }) => {
                const on = kinds.includes(kind);
                return (
                  <button
                    key={kind}
                    onClick={() => toggleKind(kind)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      on ? `${tone} ring-2` : "bg-canvas text-ink-soft/70 hover:bg-grape-soft"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* count + topic */}
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">How many</div>
              <div className="inline-flex rounded-full bg-canvas p-1">
                {COUNTS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${count === n ? "bg-white text-grape shadow-soft" : "text-ink-soft"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Focus on (optional)</div>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. backpropagation, amanah, memory in agents"
                className="w-full rounded-full border border-line bg-canvas px-4 py-2 text-sm text-ink outline-none focus:border-grape"
              />
            </div>
          </div>

          {error && <p className="rounded-xl bg-coral/20 px-4 py-2 text-sm text-rose-800">{error}</p>}

          <button
            onClick={generate}
            disabled={loading || noNotes}
            className="inline-flex items-center gap-2 rounded-full bg-grape px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-grape-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? LOADING_LINES[line] : noNotes ? "Upload notes first" : `Generate ${count} questions`}
          </button>
        </div>

        <div className="hidden items-center justify-center md:flex">
          <Pocket mood={loading ? "thinking" : "happy"} className={`h-40 w-40 ${loading ? "animate-bounce-soft" : "animate-float"}`} />
        </div>
      </div>
    </section>
  );
}
