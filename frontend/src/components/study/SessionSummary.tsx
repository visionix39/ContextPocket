import Link from "next/link";
import { RotateCcw } from "lucide-react";
import type { Question } from "@/lib/api";
import { Confetti, Trophy } from "../illustrations/Trophy";
import { Pocket } from "../illustrations/Pocket";

export type Verdict = "correct" | "partial" | "missed";

export function SessionSummary({
  questions,
  results,
  onRestart,
}: {
  questions: Question[];
  results: Record<number, Verdict>;
  onRestart: () => void;
}) {
  const tally = { correct: 0, partial: 0, missed: 0 };
  for (const q of questions) {
    const v = results[q.id];
    if (v) tally[v] += 1;
  }
  const answered = tally.correct + tally.partial + tally.missed;
  const pct = answered ? Math.round(((tally.correct + tally.partial * 0.5) / answered) * 100) : 0;

  // group by concept so weak spots are visible (Milestone 3 turns this into real tracking)
  const byConcept = new Map<string, { correct: number; total: number }>();
  for (const q of questions) {
    const v = results[q.id];
    if (!v) continue;
    const c = byConcept.get(q.concept) ?? { correct: 0, total: 0 };
    c.total += 1;
    if (v === "correct") c.correct += 1;
    else if (v === "partial") c.correct += 0.5;
    byConcept.set(q.concept, c);
  }
  const shaky = [...byConcept.entries()].filter(([, c]) => c.correct / c.total < 0.75).map(([name]) => name);
  const great = pct >= 80;

  return (
    <div className="cp-card relative overflow-hidden p-8 text-center md:p-10">
      {great && <Confetti />}
      <div className="mx-auto flex max-w-lg flex-col items-center">
        {great ? <Trophy className="h-40 w-40 animate-float" /> : <Pocket mood={pct >= 50 ? "happy" : "thinking"} className="h-32 w-32 animate-float" />}
        <h2 className="mt-4 text-2xl font-semibold text-ink">
          {great ? "Brilliant session!" : pct >= 50 ? "Solid work — keep going" : "Good start. Let's revisit a few"}
        </h2>
        <p className="mt-1 text-ink-soft">
          You scored <span className="font-bold text-grape">{pct}%</span> across {answered} {answered === 1 ? "question" : "questions"}.
        </p>

        <div className="mt-6 grid w-full grid-cols-3 gap-3">
          <Stat label="Got it" value={tally.correct} cls="bg-mint/30 text-emerald-900" />
          <Stat label="Partly" value={tally.partial} cls="bg-sunny/40 text-amber-900" />
          <Stat label="Missed" value={tally.missed} cls="bg-coral/25 text-rose-900" />
        </div>

        {shaky.length > 0 && (
          <div className="mt-6 w-full rounded-2xl bg-canvas p-4 text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Worth another look</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {shaky.map((c) => (
                <span key={c} className="rounded-full bg-lavender/40 px-3 py-1 text-sm font-semibold text-grape">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-2 rounded-full bg-grape px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-grape-dark"
          >
            <RotateCcw className="h-4 w-4" /> Study again
          </button>
          <Link href="/study" className="rounded-full bg-grape-soft px-5 py-2.5 text-sm font-semibold text-grape transition hover:bg-lavender/60">
            Back to sets
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`rounded-2xl ${cls} p-3`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}
