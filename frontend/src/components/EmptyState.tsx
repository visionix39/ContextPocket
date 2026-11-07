import Link from "next/link";
import { EmptyShelf } from "./illustrations/EmptyShelf";

export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="cp-card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <EmptyShelf className="h-40 w-full max-w-xs" />
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="max-w-md text-sm text-ink-soft">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-2 rounded-full bg-grape px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-grape-dark"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
