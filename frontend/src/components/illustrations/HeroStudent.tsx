/** Student reading under a big sun — hero illustration for the dashboard. */
export function HeroStudent({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 300" className={className} role="img" aria-label="Student reading under the sun">
      {/* sun */}
      <path d="M90 290 A190 190 0 0 1 470 290 Z" fill="#FFE7A3" />
      <path d="M150 290 A130 130 0 0 1 410 290 Z" fill="#FFDD85" opacity="0.6" />
      {/* light rays */}
      <g stroke="#FFF4CC" strokeWidth="14" strokeLinecap="round" opacity="0.8">
        <line x1="400" y1="120" x2="470" y2="60" />
        <line x1="420" y1="180" x2="520" y2="150" />
      </g>
      {/* clouds */}
      <g className="animate-drift" fill="#B9B4F0">
        <ellipse cx="80" cy="60" rx="34" ry="14" />
        <ellipse cx="100" cy="50" rx="20" ry="14" />
        <ellipse cx="60" cy="54" rx="18" ry="12" />
      </g>
      <g className="animate-float-slow" fill="#B9B4F0">
        <ellipse cx="470" cy="40" rx="44" ry="16" />
        <ellipse cx="455" cy="28" rx="22" ry="16" />
        <ellipse cx="490" cy="30" rx="18" ry="13" />
      </g>
      <g className="animate-float" fill="#C8C4F5">
        <ellipse cx="330" cy="60" rx="26" ry="10" />
        <ellipse cx="340" cy="52" rx="14" ry="10" />
      </g>
      {/* floating dots */}
      <g className="animate-float" fill="#8F86F2">
        <circle cx="150" cy="120" r="7" />
        <circle cx="128" cy="140" r="4" />
      </g>
      <g className="animate-float-slow" fill="#8F86F2">
        <circle cx="440" cy="120" r="5" />
        <circle cx="455" cy="106" r="3" />
      </g>
      {/* plant left */}
      <g>
        <path d="M70 290 C 70 250, 50 230, 60 200" stroke="#3B3A52" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="52" cy="210" rx="11" ry="6" fill="#4F3FD1" transform="rotate(-30 52 210)" />
        <ellipse cx="74" cy="235" rx="11" ry="6" fill="#6C5CE7" transform="rotate(25 74 235)" />
        <ellipse cx="58" cy="258" rx="10" ry="6" fill="#6C5CE7" transform="rotate(-20 58 258)" />
        <circle cx="64" cy="196" r="5" fill="#4F3FD1" />
      </g>
      {/* leaf right */}
      <g>
        <path d="M500 290 C 505 250, 520 240, 540 230" stroke="#3B3A52" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M506 262 C 480 250, 478 225, 500 215 C 520 230, 520 252, 506 262 Z" fill="#6C5CE7" />
        <path d="M520 248 C 540 232, 560 236, 556 260 C 540 268, 526 262, 520 248 Z" fill="#8F86F2" />
      </g>
      {/* ground shadow */}
      <ellipse cx="280" cy="286" rx="120" ry="10" fill="#2E2B4A" opacity="0.9" />
      {/* student */}
      <g>
        {/* legs crossed */}
        <path d="M200 272 C 215 240, 260 236, 290 252 C 318 236, 352 244, 360 272 Z" fill="#2E2B4A" />
        <path d="M225 274 c 10 -14, 35 -14, 50 -2 c 15 -12, 42 -12, 52 2 Z" fill="#3B3858" />
        {/* feet */}
        <ellipse cx="236" cy="275" rx="14" ry="6" fill="#F2B59B" />
        <ellipse cx="330" cy="275" rx="14" ry="6" fill="#F2B59B" />
        {/* torso hoodie */}
        <path d="M232 262 C 226 215, 236 180, 280 176 C 324 180, 334 215, 328 262 Z" fill="#6C5CE7" />
        <path d="M262 262 C 258 230, 262 205, 280 200 C 298 205, 302 230, 298 262 Z" fill="#F7F7FB" />
        {/* arms */}
        <path d="M236 212 C 222 232, 230 250, 252 256" stroke="#6C5CE7" strokeWidth="18" strokeLinecap="round" fill="none" />
        <path d="M324 212 C 338 232, 330 250, 308 256" stroke="#6C5CE7" strokeWidth="18" strokeLinecap="round" fill="none" />
        {/* tablet / notes */}
        <rect x="250" y="236" width="60" height="40" rx="6" fill="#2E2B4A" />
        <rect x="256" y="242" width="48" height="28" rx="3" fill="#B9B4F0" />
        <line x1="262" y1="250" x2="296" y2="250" stroke="#6C5CE7" strokeWidth="3" strokeLinecap="round" />
        <line x1="262" y1="258" x2="286" y2="258" stroke="#6C5CE7" strokeWidth="3" strokeLinecap="round" />
        {/* hands */}
        <circle cx="252" cy="258" r="8" fill="#F2B59B" />
        <circle cx="308" cy="258" r="8" fill="#F2B59B" />
        {/* neck + head */}
        <rect x="270" y="166" width="20" height="16" rx="6" fill="#F2B59B" />
        <circle cx="280" cy="142" r="30" fill="#F2B59B" />
        {/* hair bob */}
        <path d="M250 142 C 246 106, 314 106, 310 142 L 310 162 C 304 148, 300 138, 296 130 C 286 136, 268 136, 262 128 C 258 138, 254 150, 250 162 Z" fill="#2E2B4A" />
        {/* face */}
        <circle cx="270" cy="148" r="2.6" fill="#2E2B4A" />
        <circle cx="290" cy="148" r="2.6" fill="#2E2B4A" />
        <path d="M274 160 Q 280 165, 286 160" stroke="#2E2B4A" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="264" cy="156" r="4" fill="#F28B94" opacity="0.6" />
        <circle cx="296" cy="156" r="4" fill="#F28B94" opacity="0.6" />
      </g>
    </svg>
  );
}
