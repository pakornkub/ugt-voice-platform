# Handoff

Last updated: 2026-10-08

## In progress

- **Upstream port** (`pisanu90853-cmd/UGTVoice-platform` `8d885a3` + `d20ca0b`, decisions
  2026-10-08): phase 1 (shared layer — types/mockData/api/AI routes/shell/Prisma/docs) done on
  branch `claude/port-upstream-p1-shared-a9eea4`, not merged yet. Phase 2 = port the component
  groups (employee UI, gatekeeper/exec UI, admin UI); `// PHASE 2` comments in `shell.tsx` mark
  the Navbar/TrackingTimelineModal props + `RecentSearchesPanel` still to wire. Leftover SLA /
  9-category wording in component text is for those sessions to replace.

## Next

- **localStorage → Server Action rewiring** (`src/services/api.ts` → `lib/actions/*`) —
  **deferred until a real `DATABASE_URL` exists** (user decision 2026-09-03; rewiring against
  the placeholder breaks every page with no fallback). Don't start without a real SQL Server
  or a local Docker one the user explicitly asks for. Full file-by-function audit is in
  `docs/project-context/decisions.md` (2026-09-03). Gaps beyond call-site swaps:
  - `reset{GatekeeperConfigs,Executives,HrAdmins,RolePermissions}ToDefault` have **no**
    Server Action yet — write them as part of the rewiring.
  - `get/setActiveGatekeeperDepartment` → plain React state, not a Server Action.
  - `src/app/(shell)/shell.tsx`'s `eslint-disable react-hooks/set-state-in-effect` on the
    mount-time localStorage read goes away with this rewiring.
  - Other tickets actions still have no session/permission guard — copy the chain from
    `sendAnonymousChatMessage` (`requireChatAccess`) and add department scoping for gatekeepers.
  - `resolveLoginEmail()` in `lib/actions/tickets.ts` uses the upstream mock
    `employeeDirectory` — swap for the HR employee view when DBA provides it.
- Redesign `ExportAnalyticsModal`'s SQL Query Studio as preset reports before wiring it to a
  real SQL Server (decided — see `decisions.md`).
- Create the Jenkins Multibranch Pipeline job + VCS→Jenkins webhook against
  `github.com/pakornkub/ugt-voice-platform` (`docs/admin-handoff.md` §5 — the VCS-choice row
  there is now answered: GitHub).
- `/setup-matt-pocock-skills` has not been run (no `docs/agents/`, no `## Agent skills` block
  in `CLAUDE.md`) — run it before the first `/grill-with-docs`/`/to-spec` feature.

## Open Questions

- **Real infra values from Admin/IT/DBA** — SQL Server (§1), Keycloak client (§2), SMTP
  relay (§3), storage backup + reverse proxy (§4), Jenkins/SonarQube/Docker host (§5). Full
  request list in `docs/admin-handoff.md` — send it as-is.
- `.claude/settings.json` has an **uncommitted** local change that empties `enabledPlugins`
  (drops `ugt-nextjs-standard-mattpocock@ugt`) — owner to decide: commit it or revert
  (`git checkout -- .claude/settings.json`). Teammates won't get the bundle if committed.
- Retention duration for soft-deleted attachments — no cleanup job yet. Admin/Compliance.
- No HR employee directory installed — revisit `user.appRole` enrichment if one appears.

## Done (newest first — older chunks condensed; full detail in git log + docs/project-context/)

- 2026-10-08 **Upgraded Next.js 15.5 → 16.4** (`c02b8c9`): `next` + `eslint-config-next`
  16.4.0, `FlatCompat`/`@eslint/eslintrc` removed (`eslint.config.mjs`), `src/middleware.ts`
  → `src/proxy.ts` exporting `proxy()`. Fixed 3 new React Compiler lint errors in
  `RoleBasedAccessManagement.tsx`, `GatekeeperInbox.tsx` (`activeDeptFilter` derived),
  `shell.tsx`. build (22 routes) / lint (0 errors) / format / test (4/4) pass; proxy
  redirect + CSP verified in the browser. `/code-review` was **not** run before merge.
  First full push of `main` to `origin` (13 commits).
- 2026-09-03 Installed the harness layer (`CLAUDE.md`, `.claude/settings.json`,
  `.claude/state/model-mode.md`); wrote the missing `.claude/rules/ugt-nextjs-auth.md`.
  full-setup `verify.mjs` 16/16.
- 2026-09-03 Installed CI/CD (`ugt-nextjs-cicd-setup`): Jenkinsfile, SonarQube config,
  Dockerfile + compose files (incl. ClamAV/storage), `/api/health` DB check.
- 2026-09-02 Installed real file attachments (`ugt-nextjs-upload-setup`) — not wired into
  any page yet (forms still use the fake attachment simulator).
- 2026-09-02 Installed workflow email (`ugt-nextjs-mail-setup`) — hooked into
  `lib/actions/tickets.ts`, unreached until the rewiring.
- 2026-09-02 Installed auth (`ugt-nextjs-auth-setup`): Better Auth + Keycloak SSO only,
  RBAC for admin pages, `/admin/setup` bootstrap; role from `user.appRole`.
- 2026-09-02 `ugt-nextjs-design-setup` (existing-project scan) → `docs/DESIGN.md`.
- 2026-09-02 Test/lint tooling (Vitest, ESLint, Prettier, husky+lint-staged).
- 2026-09-02 Database layer (Prisma 7 + `@prisma/adapter-mssql`, `lib/actions/`).
- 2026-09-02 Migrated Vite+React SPA+Express → Next.js App Router (Phase A).
