# Handoff

Last updated: 2026-09-02

## In progress

- Nothing in progress. Database chunk (`ugt-nextjs-database-setup`) is complete this
  session, pending only real SQL Server values from Admin/DBA (see Open Questions).

## Next

- **`ugt-nextjs-test-lint-setup`** — Vitest + ESLint + Prettier + pre-commit. No test/lint
  tooling exists yet.
- **`ugt-nextjs-design-setup`** — run in *existing-project scan mode*: document the current
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
