/** A chunky pastel trophy with a star, for the end-of-session screen. */
export function Trophy({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={className} role="img" aria-label="Trophy">
      <ellipse cx="80" cy="140" rx="44" ry="7" fill="#1F2235" opacity="0.08" />
      {/* handles */}
      <path d="M38 44 H22 Q14 44 16 56 Q20 80 46 86" stroke="#FBD98B" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M122 44 H138 Q146 44 144 56 Q140 80 114 86" stroke="#FBD98B" strokeWidth="9" fill="none" strokeLinecap="round" />
      {/* cup */}
      <path d="M40 30 H120 L114 80 Q110 104 80 106 Q50 104 46 80 Z" fill="#FBD98B" />
      <path d="M40 30 H120 L118 44 H42 Z" fill="#F2B59B" />
      {/* star */}
      <path
        d="M80 52 l6.5 13.5 14.8 2.1 -10.7 10.4 2.6 14.7 L80 85.8 l-13.2 6.9 2.6 -14.7 -10.7 -10.4 14.8 -2.1 Z"
        fill="white"
        opacity="0.95"
      />
      {/* stem + base */}
      <rect x="70" y="104" width="20" height="14" rx="4" fill="#F2B59B" />
      <rect x="52" y="116" width="56" height="16" rx="6" fill="#6C5CE7" />
      <rect x="58" y="120" width="44" height="4" rx="2" fill="#B9B4F0" />
      {/* sparkles */}
      <circle cx="30" cy="22" r="3" fill="#8EDCE6" />
      <circle cx="132" cy="18" r="4" fill="#F28B94" />
      <path d="M140 60 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#B9B4F0" />
      <path d="M18 100 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 Z" fill="#8ED1B3" />
    </svg>
  );
}

const PIECES = ["#F28B94", "#8EDCE6", "#B9B4F0", "#FBD98B", "#8ED1B3", "#FBC4A0", "#A9CCF5", "#F5B5D1"];

/** Lightweight CSS confetti burst (no library). */
export function Confetti({ count = 28 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="animate-confetti absolute block h-2.5 w-1.5 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: PIECES[i % PIECES.length],
            animationDelay: `${(i % 7) * 90}ms`,
            animationDuration: `${1400 + (i % 5) * 180}ms`,
          }}
        />
      ))}
    </div>
  );
}
