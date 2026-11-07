import Link from "next/link";
import { Pocket } from "@/components/illustrations/Pocket";

export default function NotFound() {
  return (
    <div className="cp-card mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <Pocket mood="thinking" className="h-24 w-24" />
      <h1 className="text-xl font-semibold text-ink">Nothing in this pocket</h1>
      <p className="text-sm text-ink-soft">That page doesn&apos;t exist.</p>
      <Link href="/" className="mt-2 rounded-full bg-grape px-5 py-2 text-sm font-semibold text-white">
        Back to dashboard
      </Link>
    </div>
  );
}
