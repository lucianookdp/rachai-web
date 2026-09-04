import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/useTheme';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t('header.toggleTheme')}
      title={t('header.toggleTheme')}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
    >
      {isDark ? <Sun className="h-5 w-5" strokeWidth={2} /> : <Moon className="h-5 w-5" strokeWidth={2} />}
    </button>
  );
}
