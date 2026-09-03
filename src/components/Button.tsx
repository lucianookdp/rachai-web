import { motion, type HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary';
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base =
    'rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-teal to-violet text-white shadow-sm hover:opacity-90'
      : 'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]';

  return <motion.button whileTap={{ scale: 0.97 }} className={`${base} ${styles} ${className}`} {...props} />;
}
