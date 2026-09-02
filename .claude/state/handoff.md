# Handoff

Last updated: 2026-09-02

## In progress

- Nothing in progress. Auth chunk (`ugt-nextjs-auth-setup`) is complete this session — see
  Done below.

## Next

- **`ugt-nextjs-mail-setup`** — wanted (confirmed). Real SMTP for notifications that are
  currently in-app only.
- **`ugt-nextjs-upload-setup`** — wanted (confirmed). Real file attachments, replacing
  `EmployeeSubmitForm`'s fake `Math.random()` attachment simulator.
- **`ugt-nextjs-cicd-setup`** — Jenkinsfile, SonarQube Quality Gate, Docker deploy. Also the
  point to redesign `ExportAnalyticsModal`'s SQL Studio as preset reports (decision already
  made — see `docs/project-context/decisions.md`), and to decide basePath/ports if this app
  goes under a shared org domain (currently assumed standalone — auth chunk's cookie
  prefix/`middleware.ts` already handle a future basePath, just unset for now).
- Harness install (CLAUDE.md block, `.claude/rules/*`) — do this after all modules above are
  in, per `ugt-nextjs-full-setup`'s own step 4.
- Each of the above chunks should end with `/ugt-handoff` again (per the user's chosen
  chunked run-shape) — install in this fixed order, never reorder.

## Open Questions

- Real Keycloak client values needed from the org Keycloak admin (issuer/realm, Client ID
  `ugt-voicecare`, client secret, redirect URI registration). Exact request + return-value
  table is in `docs/admin-handoff.md` §2. Until then the SSO button fails at
  `authClient.signIn.social()` (verified: fails gracefully, resets to a clickable button, no
  crash — see troubleshooting.md if this changes).
- Real SQL Server values still needed from Admin/DBA (unchanged from the database chunk) —
  `docs/admin-handoff.md` §1. Both migrations (`20260902000000_init`,
  `20260902010000_auth_rbac`) are ready to `prisma migrate resolve --applied` once real
  `DATABASE_URL` lands — see that doc for the exact command sequence.
- `src/services/api.ts`'s localStorage functions are still NOT wired to the Prisma
  `src/lib/actions/*` Server Actions — unchanged open question from the database chunk. Now
  that real session/actor ids exist (`auth.api.getSession()`), this is unblocked whenever
  someone picks it up; still not done automatically by this chunk (scope was "install auth",
  not "rewire the data layer").
- No linked-server employee/HR view was requested this chunk (`lib/directory.ts`/`lib/scope.ts`/
  `lib/approval-chain.ts` were not installed — see decisions.md). If a real HR employee view
  becomes available later, revisit whether directory enrichment (employee code/department/
  position) is worth adding to `user.appRole`'s assignment flow.

## Done (newest first)

- 2026-09-02 Installed authentication (`ugt-nextjs-auth-setup`): Better Auth + Keycloak SSO
  **only** (no LDAP/local password — confirmed earlier), custom RBAC (`Role`/`Permission`/
  `RolePermission`, gates `/admin/users`/`/admin/roles`/`/admin/audit-logs`), first-admin
  bootstrap at `/admin/setup` (no pre-seeded admin — first SSO login becomes Administrator +
  gets `appRole: 'admin'` automatically), `ActivityLogs` audit trail. **Installed hand-built
  Tailwind, not the skill's shadcn/DataTable/next-intl assets** — per the standing 2026-09-02
  design decision (`docs/DESIGN.md` §10) that this project's new pages must match the existing
  hand-built pattern; every UI file (login, admin pages/tables/modals, identity dropdown) was
  rewritten from the skill's shadcn templates into plain Tailwind + `lucide-react`, matching
  `RoleBasedAccessManagement.tsx`'s existing table/card/modal conventions (destructive delete =
  `window.confirm()`, not a custom dialog). **Retired `Navbar`'s free role-switcher dropdown**:
  added `user.appRole` (nullable `UserRole`, separate from the RBAC role — see decisions.md for
  why they're two systems) set only via `/admin/users`; `src/app/(shell)/layout.tsx` now does
  the real session/permission gate (no session → `/login`; no bootstrap admin → `/admin/setup`;
  no `appRole` yet → a waiting screen) and passes identity down through `ShellContext` into
  `Navbar`'s new identity/sign-out dropdown. `RoleBasedAccessManagement.tsx`'s "ทดสอบมุมมอง"
  preview-switch buttons and `WorkflowDiagram.tsx`'s step-click role-switch were removed (same
  retired mechanism); everything else in both components is untouched. The app's own 6 original
  feature tabs still use `RoleAccessConfigs`/`allowedTabs` exactly as before (now driven by the
  real `appRole` instead of free client state) — only the 3 new admin pages use the new RBAC
  permission system; this split is deliberate, see decisions.md. `SessionExpiredDialog`/the
  mid-page-401 event mechanism was skipped (no React Query or other client data-fetching layer
  in this app that needs it — see decisions.md). `src/middleware.ts` (not `proxy.ts` — this
  project pins `next@^15.5.0`) is the route guard. No central-employee-directory enrichment
  installed (`lib/directory.ts`/`scope.ts`/`approval-chain.ts` skipped — no linked-server HR
  view to read from yet). Real Keycloak client + SQL Server values are still placeholders — see
  Open Questions and `docs/admin-handoff.md` §1–2. Verified by hand in a real browser: `/`,
  `/submit`, `/admin/setup` all correctly bounce to `/login?from=...` when unauthenticated;
  `/api/health` still bypasses auth; clicking "เข้าสู่ระบบด้วยบัญชีองค์กร (SSO)" shows the
  loading state, then fails gracefully back to a clickable button against the placeholder
  Keycloak host (expected — no crash, no stuck spinner). `npm run build`/`lint`/`format:check`/
  `test` all pass (19 routes now, up from 13; 0 lint errors, 109 pre-existing warnings unchanged
  in nature; 4/4 tests pass including the updated `Navbar.test.tsx` path). Prisma migration
  `20260902010000_auth_rbac` generated offline (schema-to-schema diff, no live DB — same method
  as the initial migration) and `prisma generate` run.
- 2026-09-02 Ran `ugt-nextjs-design-setup` in **existing-project scan mode only** — wrote
  `docs/DESIGN.md` documenting the app's _existing_ hand-built design (indigo/slate + role
  colors emerald/blue/purple/rose, Topbar-classified hand-built shell in
  `src/app/(shell)/shell.tsx`+`Navbar.tsx`, no dark mode, no i18n catalog, Thai-only) as the
  agreement, with every gap vs. the org default recorded as a deliberate deviation in §9.
  Installed `.claude/rules/ugt-nextjs-design.md` describing the actual hand-built pattern.
- 2026-09-02 Installed test/lint tooling (`ugt-nextjs-test-lint-setup`): Vitest, ESLint flat
  config (`FlatCompat` shim — `next@^15.5.0` pin), Prettier, husky + lint-staged. Fixed all 21
  pre-existing ESLint errors repo-wide; 110 warnings left as-is (now 109, see this chunk).
- 2026-09-02 Installed the database layer (`ugt-nextjs-database-setup`): Prisma 7 +
  `@prisma/adapter-mssql`, schema at `prisma/schema.prisma`, initial migration generated
  offline (no live SQL Server). Parallel Prisma-backed Server Action surface under
  `src/lib/actions/` — not yet wired into components (still open, see Open Questions above).
- 2026-09-02 Migrated `ugt-voice-platform` ("UGT VoiceCare") from Vite+React SPA+Express to
  Next.js 15 App Router (Phase A — pure framework port, zero data-layer changes).
