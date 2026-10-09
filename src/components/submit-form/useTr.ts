import { useLanguage, type Language } from '../../context/LanguageContext';

/** The active language plus a picker for inline bilingual copy: `tr(en, th)`. */
export function useTr(): { lang: Language; tr: (en: string, th: string) => string } {
  const { lang } = useLanguage();
  return { lang, tr: (en, th) => (lang === 'en' ? en : th) };
}
