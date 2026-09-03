import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const isPt = i18n.language === 'pt';

  return (
    <button
      type="button"
      onClick={() => setLanguage(isPt ? 'en' : 'pt')}
      aria-label={t('header.changeLanguage')}
      title={t('header.changeLanguage')}
      className="flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
    >
      {isPt ? 'EN' : 'PT'}
    </button>
  );
}
