import Link from "next/link";
import { styleFor } from "@/lib/colors";
import { SubjectIcon } from "@/lib/subjectIcon";

export function SubjectCard({
  subject,
  color,
  documentCount,
  chunkCount,
  index = 0,
}: {
  subject: string;
  color: string;
  documentCount: number;
  chunkCount: number;
  index?: number;
}) {
  const s = styleFor(color);
  return (
    <Link
      href={`/subjects/${encodeURIComponent(subject)}`}
      className={`cp-tile animate-pop flex aspect-square flex-col items-center justify-center gap-4 p-5 text-center ${s.bg}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-soft">
        <SubjectIcon subject={subject} className={`h-7 w-7 ${s.text}`} />
      </span>
      <span className="text-balance text-lg font-semibold leading-tight text-ink">{subject}</span>
      <span className="text-xs font-medium text-ink/60">
        {documentCount} {documentCount === 1 ? "file" : "files"} · {chunkCount} passages
      </span>
    </Link>
  );
}

export function NewSubjectCard() {
  return (
    <Link
      href="/library"
      className="cp-tile flex aspect-square flex-col items-center justify-center gap-3 border-2 border-dashed border-grape/40 bg-white/60 p-5 text-center text-grape hover:border-grape"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-grape-soft text-3xl font-light">+</span>
      <span className="text-base font-semibold">Add a class</span>
      <span className="text-xs text-ink-soft">Upload notes to start</span>
    </Link>
  );
}
