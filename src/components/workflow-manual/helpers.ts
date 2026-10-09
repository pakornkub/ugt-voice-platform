import type { Language } from '../../context/LanguageContext';
import type { Bilingual } from './types';

/** Picks the English or Thai variant of a value for the active UI language. */
export const pick = <T>(lang: Language, en: T, th: T): T => (lang === 'en' ? en : th);

/** Resolves a {@link Bilingual} value for the active UI language. */
export const localize = <T>(lang: Language, value: Bilingual<T>): T => value[lang];
