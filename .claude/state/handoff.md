# Handoff

Last updated: 2026-09-02

## In progress

- Nothing in progress. Test/lint chunk (`ugt-nextjs-test-lint-setup`) is complete this
  session (Quality gate: done — see Done below).

## Next

- **`ugt-nextjs-design-setup`** — run in _existing-project scan mode_: document the current
  Tailwind indigo/slate theme and shell layout into `docs/DESIGN.md` as the agreement (not
  the org default look) — this is how "keep Design exactly as-is" gets satisfied formally.
- **`ugt-nextjs-auth-setup`** — Keycloak SSO only (confirmed), RBAC tied to real sessions,
  admin bootstrap via `/admin/setup`. This retires `Navbar`'s free role-switcher dropdown.
- **`ugt-nextjs-mail-setup`** — wanted (confirmed). Real SMTP for notifications that are
  currently in-app only.
- **`ugt-nextjs-upload-setup`** — wanted (confirmed). Real file attachments, replacing
  `EmployeeSubmitForm`'s fake `Math.random()` attachment simulator.
- **`ugt-nextjs-cicd-setup`** — Jenkinsfile, SonarQube Quality Gate, Docker deploy. Also the
  point to redesign `ExportAnalyticsModal`'s SQL Studio as preset reports (decision already
  made — see `docs/project-context/decisions.md`), and to decide basePath/ports if this app
  goes under a shared org domain (currently assumed standalone, no basePath).
- Harness install (CLAUDE.md block, `.claude/rules/*`) — do this after all modules above are
  in, per `ugt-nextjs-full-setup`'s own step 4.
- Each of the above chunks should end with `/ugt-handoff` again (per the user's chosen
  chunked run-shape) — install in this fixed order, never reorder.

## Open Questions

- Real SQL Server values needed from Admin/DBA (host, port, database name confirmation,
  login/password, TLS trust mode) — placeholders live in `.env.example`/`.env.local` now.
  Request + exact return-value table is in `docs/admin-handoff.md` §1. Once real values land:
  `npx prisma migrate resolve --applied 20260902000000_init` → `npx prisma generate` →
  `npx prisma db seed` (steps also listed in that doc).
- `src/services/api.ts`'s localStorage functions are NOT yet swapped to call the new
  `src/lib/actions/*` Server Actions — the Prisma-backed actions exist and are fully typed
  (mirror api.ts's signatures 1:1 for an easy swap) but no component has been rewired yet.
  Decide in a follow-up chunk whether that rewiring happens standalone or piggybacks on
  `ugt-nextjs-auth-setup` (since real `CreatedBy`/actor ids need a session anyway).

## Done (newest first)

- 2026-09-02 Installed test/lint tooling (`ugt-nextjs-test-lint-setup`): Vitest (jsdom,
  `vitest.config.ts`/`vitest.setup.ts`) + Testing Library, ESLint flat config
  (`eslint.config.mjs`), Prettier (`.prettierrc`/`.prettierignore`, incl.
  `prettier-plugin-tailwindcss`), husky + lint-staged pre-commit. Scripts:
  `lint`/`format`/`format:check`/`test`/`test:watch`/`test:coverage`/`build`/`prepare`. Two
  notable adaptations from the skill's default asset, both because this project pins
  `next@^15.5.0` (not the 16.x line the asset assumes): (1) `eslint-config-next` resolved to
  the 15.x line still ships legacy eslintrc-style config, not flat-config — `eslint.config.mjs`
  uses `@eslint/eslintrc`'s `FlatCompat` shim instead of a direct subpath import (see
  troubleshooting.md); (2) `eslint-config-next` was pinned to `^15.5.0` explicitly (npm installs
  latest — 16.x — by default, which is next-16-only). `vitest.config.ts`'s `resolve.alias` and
  `coverage.include` were hand-adjusted to this project's real layout (`@/lib/*` → root `lib/`
  before `@/*` → `src/`, matching tsconfig.json; `coverage.include` lists `src/app|components|
services/**` + `lib/**`, not the asset's default `app|components|lib|hooks` root-level
  guesses). `vitest.config.ts`'s `test.env` explicitly sets `GEMINI_API_KEY: ''` — an ambient
  real key was present in the dev shell and made the AI-route fallback test nondeterministic
  otherwise (see troubleshooting.md). Wrote 2 smoke tests (not full coverage — from-scratch
  install per the skill's own scope): `src/components/Navbar.test.tsx`,
  `src/app/api/ai/analyze-complaint/route.test.ts` (tests the no-`GEMINI_API_KEY` fallback
  branch). Also fixed all 21 pre-existing ESLint **errors** across the 11 components + both AI
  routes + `sqliteDb.ts` (`@typescript-eslint/no-explicit-any` — replaced with real types,
  mostly reusing/adding types in `src/types.ts`, e.g. new `AiTriageSuggestion`/
  `AiClusterInsights`/`AiRiskCluster`; `react/no-unescaped-entities` — escaped stray `"` in JSX
  text) and ran a repo-wide `prettier --write .` once (large mechanical diff, no logic changes
  — `next build`/`tsc --noEmit` confirmed clean before and after) since `npm run lint` and
  `npm run format:check` must both pass per the org standard and the codebase had never been
  formatted. 110 ESLint **warnings** remain (mostly unused lucide-react icon imports, a few
  `react-hooks/exhaustive-deps`) — left as-is, warnings don't fail the pipeline, and fixing them
  is unrelated cleanup outside this chunk's scope. `node <skill>/scripts/verify.mjs` passes (13
  checks, 0 warnings). `CI=true npm run test:coverage` confirmed to produce
  `test-results/junit.xml` + `coverage/lcov.info`; both gitignored. Trial pre-commit confirmed
  `.husky/pre-commit` → `npx lint-staged` fires and auto-formats staged files. `npm run build`
  reconfirmed clean (13 routes) after all of the above.
- 2026-09-02 Installed the database layer (`ugt-nextjs-database-setup`): Prisma 7 +
  `@prisma/adapter-mssql`, schema at `prisma/schema.prisma` (9 tables — `Tickets`,
  `TicketTimelineLogs`, `TicketEvaluations`, `DepartmentGatekeeperConfigs`,
  `GatekeeperOfficers`, `ExecutiveMembers`, `HrAdminMembers`, `Notifications`,
  `RoleAccessConfigs`), `prisma.config.ts`, `lib/prisma.ts`/`lib/env.ts` (root-level per the
  skill's convention, reachable from `src/` via a new `@/lib/*` -> `./lib/*` tsconfig path
  added ahead of the existing `@/*` -> `./src/*` rule — see tsconfig.json). Initial migration
  (`prisma/migrations/20260902000000_init/`) generated offline via `prisma migrate diff
--from-empty` (no live SQL Server available) and `prisma/seed.ts` mirrors today's
  `src/mockData.ts` demo data. Added a parallel Prisma-backed Server Action surface under
  `src/lib/actions/` (tickets, notifications, gatekeeper, executives, hr-admins, role-access)
  — not yet wired into components, see Open Questions. Moved the three
  `src/app/api/ai/*`+`health` routes off direct `process.env.GEMINI_API_KEY` onto `@/lib/env`.
  `node <skill>/scripts/verify.mjs` passes (13 checks, 1 expected warning for the two
  append-only log tables + Notifications' trimmed audit columns). Wrote
  `docs/admin-handoff.md` with the exact SQL Server request for Admin/DBA. sql.js/
  `src/services/sqliteDb.ts` untouched (still backs the SQL Studio export modal, as decided in
  Phase A — see decisions.md).
- 2026-09-02 Migrated `ugt-voice-platform` ("UGT VoiceCare") from Vite+React SPA+Express to
  Next.js 15 App Router (Phase A — pure framework port, zero data-layer changes). New
  `src/app/` tree (route group `(shell)` with one route per former tab, `shell-context.tsx`
  bridging Shell state to pages, `api/health` + `api/ai/*` Route Handlers replacing
  `server.ts`). Added `src/services/safeStorage.ts` to make the existing `localStorage`-based
  data layer SSR-safe. Fixed two pre-existing dead-code type bugs surfaced by Next's stricter
  build-time type-check (`ExportAnalyticsModal.tsx` `'breached'` → `'overdue'`,
  `GatekeeperInbox.tsx` dropped an unreachable `'rejected'` branch). Verified with a clean
  `next build` and a full browser walkthrough of every route/modal/AI button. Bootstrapped
  `docs/project-context/` (scan mode) and this handoff file.
