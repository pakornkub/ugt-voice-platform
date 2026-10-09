// Server-written text that is stored in Thai (timeline actions/actors/notes, notification titles and
// messages, chat sender labels, redaction labels) — shown in EN by mapping known phrases on the client.
// Stored rows are never rewritten (decisions.md 2026-10-09 "Every screen bilingual TH/EN").
// Unknown text (free-text notes, names) passes through unchanged.
import type { Language } from '../context/LanguageContext';

/** Exact phrase → English. */
const EXACT: Record<string, string> = {};

/** Patterns with captured parts carried over, e.g. tracking codes and names. */
const PATTERNS: ReadonlyArray<readonly [RegExp, (...groups: string[]) => string]> = [];

export function localizeServerText(text: string | null | undefined, lang: Language): string {
  if (!text) return text ?? '';
  if (lang === 'th') return text;
  const exact = EXACT[text];
  if (exact) return exact;
  for (const [pattern, toEn] of PATTERNS) {
    const match = pattern.exec(text);
    if (match) return toEn(...match.slice(1));
  }
  return text;
}
