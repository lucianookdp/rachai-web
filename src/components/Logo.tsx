export function Logo({ className = 'h-8 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 200" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rachaí">
      <g transform="translate(24,20) scale(1.6)">
        <path
          d="M18 10 H82 A6 6 0 0 1 88 16 V38 L74 32 L62 40 L50 32 L38 40 L26 32 L12 38 V16 A6 6 0 0 1 18 10 Z"
          fill="#14B8A6"
        />
        <path
          d="M12 62 L26 68 L38 60 L50 68 L62 60 L74 68 L88 62 V84 A6 6 0 0 1 82 90 H18 A6 6 0 0 1 12 84 Z"
          fill="#8B5CF6"
        />
      </g>
      <text
        x="205"
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
