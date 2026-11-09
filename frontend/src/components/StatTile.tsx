import type { LucideIcon } from "lucide-react";

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "lavender",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "lavender" | "aqua" | "sunny" | "mint" | "coral";
}) {
  const tones: Record<string, string> = {
    lavender: "bg-lavender/30 text-grape",
    aqua: "bg-aqua/30 text-cyan-800",
    sunny: "bg-sunny/40 text-amber-800",
    mint: "bg-mint/30 text-emerald-800",
    coral: "bg-coral/25 text-rose-800",
  };
  return (
    <div className="cp-card flex items-center gap-4 p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-none text-ink">{value}</div>
        <div className="mt-1 truncate text-xs font-medium uppercase tracking-wider text-ink-soft">{label}</div>
        {hint && <div className="mt-0.5 truncate text-[11px] text-ink-soft/80">{hint}</div>}
      </div>
    </div>
  );
}
