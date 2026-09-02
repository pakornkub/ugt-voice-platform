# Handoff

Last updated: 2026-09-02

## In progress

- Nothing in progress. Phase A (Next.js migration) is complete and verified this chunk.

## Next

- **`ugt-nextjs-database-setup`** — Prisma + SQL Server. Use `src/services/sqliteDb.ts`'s
  8-table schema as the starting draft, but move the `tickets` primary key from the
  human-readable tracking code to a surrogate ID per org convention. Swap every
  `src/services/api.ts` localStorage function for a real Server Action/Prisma call. Drop
  `sql.js`/`src/services/sqliteDb.ts` entirely once the real DB is wired in.
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

- None right now — all decisions needed to start the Database chunk are already recorded in
  `docs/project-context/decisions.md`.

## Done (newest first)

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
