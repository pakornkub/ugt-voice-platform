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

- **This project has no shadcn/ui / Base UI / org kit installed.** Do not
  import from `components/ui/*`, `next-intl`, or any shadcn primitive — none
  of that exists here. See `docs/design-questions.md` #1 for the open
  decision on whether to add it (as a substrate for brand-new pages only,
  never by touching existing ones) — until that's answered, follow the
  pattern below.
- **Match the existing hand-built pattern**: Tailwind utility classes
  directly (no CSS-in-JS, no raw `<style>`), `lucide-react` icons, Thai UI
  copy hardcoded in JSX (no i18n catalog). Colors follow the role/status
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
- If a future chunk (e.g. `ugt-nextjs-auth-setup`) decides to adopt shadcn/ui
  for brand-new pages only, that decision and its resulting pattern belong
  in `docs/DESIGN.md` §10 first — this rule file should be updated to match
  in the same change, not left describing a stale state.
