import type { Language } from '../../context/LanguageContext';

/** Picks the English or Thai variant of a value for the active UI language. */
export const pick = <T>(lang: Language, en: T, th: T): T => (lang === 'en' ? en : th);
