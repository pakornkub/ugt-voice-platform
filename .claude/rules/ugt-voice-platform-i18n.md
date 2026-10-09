---
paths:
  - 'src/app/**/*.tsx'
  - 'src/components/**/*.tsx'
  - 'src/context/**/*.tsx'
---

# UI language — bilingual TH/EN (project rule, not plugin-owned)

Decision 2026-10-08 (`docs/DESIGN.md` §10, `docs/project-context/decisions.md`) supersedes
the "Thai only / no i18n catalog" line in `ugt-nextjs-design.md`:

- UI copy is bilingual. Use `useLanguage()` from `src/context/LanguageContext.tsx`
  (`lang === 'en' ? … : …` inline, or `t('key')` for entries in `DICTIONARY`). Default is `th`;
  the preference lives in localStorage (`voiceplatform_lang_preference_v2`).
- Do **not** add `next-intl` or a second translation substrate — the hand-rolled context is kept
  on purpose so upstream (`pisanu90853-cmd/UGTVoice-platform`) ports stay line-for-line.
- Helpers that return display text take a `lang` argument (`getStatusBadgeText(status, lang)`,
  `getUrgencyBadgeText(urgency, lang)`); don't hard-code Thai in new shared helpers.
- Everything else in `ugt-nextjs-design.md` still applies (hand-built Tailwind, no shadcn kit).
- **Every screen is bilingual** (owner, 2026-10-09) — new UI copy goes through
  `const { tr } = useTr()` (`src/context/useTr.ts`, `tr('English', 'ไทย')`); static tables carry
  `*En` / `{ th, en }` fields. Server Actions keep writing Thai (or codes) into the DB — when you add
  or change fixed server text that is shown to users, add its EN to `src/services/serverText.ts`
  (and its test) so `localizeServerText` keeps EN screens English.
