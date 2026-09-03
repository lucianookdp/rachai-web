import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pt from './locales/pt.json';

export const LANGUAGE_STORAGE_KEY = 'rachai-lang';

function detectInitialLanguage(): 'pt' | 'en' {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'pt' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: 'pt' | 'en') {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  void i18n.changeLanguage(lang);
}

export default i18n;
