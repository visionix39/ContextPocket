/** The ContextPocket mascot: a friendly little pocket. */
export function Pocket({ className = "", mood = "happy" }: { className?: string; mood?: "happy" | "thinking" | "sleepy" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Pocket mascot">
      {/* pocket body */}
      <path d="M18 30 H102 L96 92 Q94 106 80 106 H40 Q26 106 24 92 Z" fill="#6C5CE7" />
      <path d="M18 30 H102 L100 44 H20 Z" fill="#4F3FD1" />
      {/* stitching */}
      <path d="M26 48 L31 90 Q32 98 40 98 H80 Q88 98 89 90 L94 48" stroke="#B9B4F0" strokeWidth="2" strokeDasharray="4 4" fill="none" />
      {/* peeking note */}
      <rect x="40" y="14" width="40" height="26" rx="4" fill="#FFF4CC" />
      <line x1="48" y1="24" x2="72" y2="24" stroke="#F2B59B" strokeWidth="3" strokeLinecap="round" />
      <line x1="48" y1="32" x2="64" y2="32" stroke="#F2B59B" strokeWidth="3" strokeLinecap="round" />
      {/* face */}
      {mood === "sleepy" ? (
        <>
          <path d="M44 66 Q50 70 56 66" stroke="#F7F7FB" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M64 66 Q70 70 76 66" stroke="#F7F7FB" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="50" cy="66" r="4" fill="#F7F7FB" />
          <circle cx="70" cy="66" r="4" fill="#F7F7FB" />
          <circle cx="51.5" cy="64.5" r="1.3" fill="#2E2B4A" />
          <circle cx="71.5" cy="64.5" r="1.3" fill="#2E2B4A" />
        </>
      )}
      {mood === "thinking" ? (
        <path d="M54 82 Q60 78 66 82" stroke="#F7F7FB" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M52 80 Q60 88 68 80" stroke="#F7F7FB" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      <circle cx="42" cy="76" r="4" fill="#F28B94" opacity="0.7" />
      <circle cx="78" cy="76" r="4" fill="#F28B94" opacity="0.7" />
    </svg>
  );
}
