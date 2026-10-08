---
paths:
  - 'src/app/**/*.tsx'
  - 'src/components/**/*.tsx'
---

<!-- Owned by ugt-nextjs-design-setup — may be overwritten wholesale on /plugin update.
     ADAPTED from the skill's default asset: this project has NOT installed shadcn/ui or the
     org UI kit (see docs/DESIGN.md §9/§10 and docs/design-questions.md #1 — deliberate, not
     an oversight). The default asset assumes the org kit is present; this version reflects
     what is actually true here so it does not tell sessions to reach for components that do
     not exist in this codebase. -->

# Design rules (loads when touching any UI file)

**Before writing or changing UI, read `docs/DESIGN.md`** — it documents this
project's actual design (hand-built, pre-org-kit) as the agreement, and it
wins over code, habit, general shadcn/ui knowledge, and any beautification
skill (`frontend-design`, `impeccable`). The short version:

- **This project has no shadcn/ui / Base UI / org kit installed, and never
  will — including brand-new pages** (decided 2026-09-02, see
  `docs/DESIGN.md` §10 and `docs/design-questions.md` #1). Do not import
  from `components/ui/*`, `next-intl`, or any shadcn primitive — none of
  that exists here, and new pages (e.g. `ugt-nextjs-auth-setup`'s login/
  admin screens) must follow the hand-built pattern below too, not
  introduce a second component system.
- **Match the existing hand-built pattern**: Tailwind utility classes
  directly (no CSS-in-JS, no raw `<style>`), `lucide-react` icons, UI copy
  bilingual TH/EN via `useLanguage()` from `src/context/LanguageContext.tsx` (`lang === 'en' ? … : …`
  or `t()`; default Thai — decision 2026-10-08, `docs/DESIGN.md` §10; no `next-intl`). Colors follow the role/status
  mapping in `docs/DESIGN.md` §1 (indigo = primary/interactive, slate =
  neutral, emerald/blue/purple/rose = role colors) — reuse those, don't
  invent new ones without a reason.
- **Never silently reskin or restyle an existing component or page.** The
  standing project decision (`docs/project-context/decisions.md`,
  2026-09-02) is to keep the pre-migration design, UX, and workflow
  unchanged. If a change would alter how an existing screen looks or
  behaves, stop and ask — don't treat it as routine cleanup.
- Tables: this project hand-rolls `<table>`/grid layouts (no `DataTable`
  kit). Match the existing table components' structure
  (`GatekeeperInbox.tsx`, `AdminGatekeeperManagement.tsx`,
  `RoleBasedAccessManagement.tsx`, `MyTicketsList.tsx`) rather than
  inventing a new pattern per page.
- Dates/numbers: no central `lib/format.ts` exists yet — this project calls
  `toLocaleDateString`/`toLocaleString` inline (see `docs/DESIGN.md` §5).
  Match that pattern; don't introduce a new formatting convention ad hoc.
- Forms: this project uses per-field `useState` (see `EmployeeSubmitForm.tsx`)
  rather than zod + react-hook-form. Match it.
- `rounded-2xl`/`rounded-3xl` are used deliberately in several places
  (toast, mobile-simulator frame, dropdowns) — this is a recorded deviation
  from the org's radius rule (`docs/DESIGN.md` §9), not a mistake to "fix."
- Deviating from `docs/DESIGN.md` on purpose (new pattern, new color, new
  component style)? Add a dated มติ to its §10 — a silent deviation is a
  defect, same as the org standard says.
- This was genuinely considered and closed, not skipped: see
  `docs/DESIGN.md` §10 (2026-09-02) for the rejected alternative (shadcn/ui
  as a primitive layer for new pages only) and why it lost — consistency
  across every page won over getting a central `DataTable`/`FormDialog`.
  Don't re-litigate it without the user raising it again.
