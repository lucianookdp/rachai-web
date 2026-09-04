export function Logo({ className = 'h-8 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 200" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rachaí">
      <defs>
        <linearGradient id="logo-g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        <linearGradient id="logo-g2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        {/* A coin split by a jagged crack — "rachar" (to crack/split) a coin,
            standing in for splitting a bill. Both halves share this zigzag
            boundary so they tile the circle with no gap or overlap. */}
        <clipPath id="logo-crack-left">
          <path d="M0 0 H100 L60 90 L140 110 L100 188 H0 Z" />
        </clipPath>
        <clipPath id="logo-crack-right">
          <path d="M200 0 H100 L60 90 L140 110 L100 188 H200 Z" />
        </clipPath>
      </defs>
      <g transform="translate(20,4)">
        <circle cx="100" cy="100" r="88" fill="url(#logo-g1)" clipPath="url(#logo-crack-left)" />
        <circle cx="100" cy="100" r="88" fill="url(#logo-g2)" clipPath="url(#logo-crack-right)" />
        <circle cx="100" cy="100" r="88" fill="none" stroke="var(--bg)" strokeWidth="3" />
      </g>
      <text
        x="215"
        y="122"
        fontFamily="Manrope, Inter, 'Segoe UI', sans-serif"
        fontWeight="800"
        fontSize="64"
        className="fill-[var(--text)]"
      >
        rachaí
      </text>
    </svg>
  );
}
