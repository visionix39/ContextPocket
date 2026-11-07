export type PaletteName =
  | "coral" | "aqua" | "lavender" | "sunny" | "mint" | "peach" | "sky" | "rose";

export const PALETTE: PaletteName[] = ["coral", "aqua", "lavender", "sunny", "mint", "peach", "sky", "rose"];

/** Tailwind class fragments per palette colour. Keep literal so Tailwind can see them. */
export const COLOR_STYLES: Record<PaletteName, { bg: string; text: string; soft: string; ring: string; dot: string }> = {
  coral:    { bg: "bg-coral",    text: "text-coral",    soft: "bg-coral/20",    ring: "ring-coral/40",    dot: "bg-coral" },
  aqua:     { bg: "bg-aqua",     text: "text-aqua",     soft: "bg-aqua/25",     ring: "ring-aqua/40",     dot: "bg-aqua" },
  lavender: { bg: "bg-lavender", text: "text-lavender", soft: "bg-lavender/25", ring: "ring-lavender/40", dot: "bg-lavender" },
  sunny:    { bg: "bg-sunny",    text: "text-sunny",    soft: "bg-sunny/30",    ring: "ring-sunny/40",    dot: "bg-sunny" },
  mint:     { bg: "bg-mint",     text: "text-mint",     soft: "bg-mint/25",     ring: "ring-mint/40",     dot: "bg-mint" },
  peach:    { bg: "bg-peach",    text: "text-peach",    soft: "bg-peach/30",    ring: "ring-peach/40",    dot: "bg-peach" },
  sky:      { bg: "bg-sky",      text: "text-sky",      soft: "bg-sky/30",      ring: "ring-sky/40",      dot: "bg-sky" },
  rose:     { bg: "bg-rose",     text: "text-rose",     soft: "bg-rose/30",     ring: "ring-rose/40",     dot: "bg-rose" },
};

export function styleFor(color: string) {
  return COLOR_STYLES[(color as PaletteName) in COLOR_STYLES ? (color as PaletteName) : "lavender"];
}

/** Same hash as the backend's pick_color so colours agree before a doc exists. */
export function colorForSubject(subject: string): PaletteName {
  let h = 0;
  for (const ch of subject.toLowerCase()) h += ch.codePointAt(0) ?? 0;
  return PALETTE[h % PALETTE.length];
}
