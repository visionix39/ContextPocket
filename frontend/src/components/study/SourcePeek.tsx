import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { Question } from "@/lib/api";
import { styleFor } from "@/lib/colors";

/** Where a question came from: file, page, heading and the exact sentence. */
export function SourcePeek({ q, quote = true }: { q: Question; quote?: boolean }) {
  const s = styleFor(q.source.color);
  return (
    <div className={`rounded-2xl ${s.soft} p-4 text-sm`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-ink/70">
        <BookOpen className="h-3.5 w-3.5" />
        <Link href={`/library/${q.source.document_id}`} className="hover:underline">
          {q.source.document_title}
        </Link>
        {q.source.page && <span>· p.{q.source.page}</span>}
        {q.source.heading && <span>· {q.source.heading}</span>}
      </div>
      {quote && <p className="mt-2 border-l-2 border-ink/20 pl-3 italic leading-relaxed text-ink/80">“{q.evidence}”</p>}
    </div>
  );
}
