/** Empty bookshelf with a sleepy mascot for empty states. */
export function EmptyShelf({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="Empty shelf">
      <rect x="30" y="150" width="260" height="10" rx="5" fill="#B9B4F0" />
      <rect x="30" y="90" width="260" height="10" rx="5" fill="#B9B4F0" />
      {/* books on the top shelf */}
      <rect x="60" y="54" width="16" height="36" rx="3" fill="#F28B94" />
      <rect x="80" y="46" width="14" height="44" rx="3" fill="#8EDCE6" />
      <rect x="98" y="58" width="18" height="32" rx="3" fill="#FBD98B" />
      <rect x="120" y="50" width="12" height="40" rx="3" fill="#8ED1B3" transform="rotate(8 126 70)" />
      {/* dashed slot for the missing book */}
      <rect x="150" y="48" width="18" height="42" rx="3" fill="none" stroke="#6C5CE7" strokeDasharray="4 4" strokeWidth="2" />
      <text x="159" y="75" textAnchor="middle" fontSize="18" fill="#6C5CE7">+</text>
      {/* mascot on the lower shelf */}
      <g transform="translate(200 96) scale(0.45)">
        <path d="M18 30 H102 L96 92 Q94 106 80 106 H40 Q26 106 24 92 Z" fill="#6C5CE7" />
        <path d="M18 30 H102 L100 44 H20 Z" fill="#4F3FD1" />
        <path d="M44 66 Q50 70 56 66" stroke="#F7F7FB" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M64 66 Q70 70 76 66" stroke="#F7F7FB" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M54 84 Q60 80 66 84" stroke="#F7F7FB" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
      <g className="animate-float" fill="#8F86F2">
        <text x="262" y="100" fontSize="14" fontWeight="700">z</text>
        <text x="272" y="88" fontSize="18" fontWeight="700">z</text>
      </g>
    </svg>
  );
}
