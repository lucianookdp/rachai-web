import type { ReactNode } from 'react';

export function Field({
  label,
  hint,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-[var(--text-muted)]">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-[var(--text-muted)]">{hint}</span>}
    </label>
  );
}
