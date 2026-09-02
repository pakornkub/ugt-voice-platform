# Handoff

Last updated: 2026-09-03

## In progress

- Nothing in progress. All 7 `ugt-nextjs-full-setup` pipeline modules are installed
  (Database → Quality → Design → Auth → Mail → Upload → CI/CD), plus the harness layer
  (this chunk). The full-setup skill's own sequence is complete.

## Next

- **The big remaining rewiring, unchanged across every chunk since Database**: switch
  `src/services/api.ts`'s localStorage call sites over to the Prisma Server Actions in
  `lib/actions/*`. Nothing that depends on a live DB (mail sending, real uploads, real
  audit trail for app data) works end-to-end until this happens.
  **Explicitly deferred (2026-09-03, user decision) until real `DATABASE_URL` lands from
  DBA** — rewiring now would make every page hit a placeholder connection and break the
  app end-to-end with no fallback, destroying the only thing that's currently
  browser-testable. Do not start this rewiring without either a real SQL Server or a local
  Docker one the user has explicitly asked to set up first.
  Full audit done 2026-09-03 (see decisions.md for the complete file-by-function
  breakdown) — ready to execute the moment a DB exists:
  - 10 files still call `src/services/api.ts` 1:1 against an already-built Server Action
    (`shell.tsx`, `EmployeeSubmitForm.tsx`, `GatekeeperInbox.tsx`,
    `TrackingTimelineModal.tsx`, `SatisfactionModal.tsx`, `Navbar.tsx`,
    `AdminGatekeeperManagement.tsx`, `RoleBasedAccessManagement.tsx`).
  - **New gap found**: `resetGatekeeperConfigsToDefault`/`resetExecutivesToDefault`/
    `resetHrAdminsToDefault`/`resetRolePermissionsToDefault` have **no** Server Action
    equivalent in `lib/actions/*` yet — must be written as part of the rewiring, not just
    a call-site swap.
  - `getActiveGatekeeperDepartment`/`setActiveGatekeeperDepartment` is a per-browser UI
    preference with no natural DB shape — recommend converting to plain React state
    instead of adding a Server Action for it.
  - `getStatusBadgeText`/`getStatusColor`/`APP_TABS`/`INITIAL_ROLE_PERMISSIONS` don't touch
    storage at all — no migration needed, can keep importing from `api.ts` or get moved to
    a shared util, either is fine.
- Redesign `ExportAnalyticsModal`'s SQL Query Studio as preset reports before wiring it to
  a real SQL Server (decision already made — see `docs/project-context/decisions.md`).
- Push this repo to a real VCS host and pick one — currently local-only, which blocks the
  Jenkins Multibranch Pipeline job (see `docs/admin-handoff.md` §5).

## Open Questions

- **Everything is pending real infra values from Admin/IT/DBA** — SQL Server (§1),
  Keycloak client (§2), SMTP relay (§3), storage backup + reverse-proxy confirmation (§4),
  Jenkins/SonarQube/Docker host + VCS choice (§5). Full request list + exact
  "ค่าที่ต้องส่งกลับ" tables are all in `docs/admin-handoff.md` — send that file to the
  admin/DevOps team as-is, nothing else to prepare first.
- Retention duration for soft-deleted attachments — no cleanup job exists yet (org-wide
  decision on background-job placement still pending). Open question for Admin/Compliance
  once a retention job is actually built.
- No linked-server employee/HR directory was requested (`lib/directory.ts` etc. not
  installed). If a real HR employee view becomes available later, revisit whether
  `user.appRole` assignment should be enriched from it instead of staying admin-set.

## Done (newest first — older chunks condensed; full detail lives in git log + docs/project-context/)

- 2026-09-03 **Installed the harness layer** (`ugt-nextjs-full-setup` step 4, done by the
  orchestrating session directly, not a subagent chunk): root `CLAUDE.md` (mattpocock
  pipeline spans kept, superpowers spans/markers stripped; substituted project
  `ugt-voicecare`, no basePath, harness version 4.58.0 — 104 lines, well under the 200-line
  cap), `.claude/settings.json` (marketplace + `ugt-nextjs-standard-mattpocock@ugt` +
  the standard deny/ask permission lists — file didn't exist before), `.claude/state/model-mode.md`
  (default preset skeleton — didn't exist before). **Found and fixed a real gap**: the auth
  chunk never wrote `.claude/rules/ugt-nextjs-auth.md` (every other module did) — wrote it
  by hand, adapted from the skill's own template to this project's actual SSO-only,
  no-directory, `src/middleware.ts` (not `proxy.ts`) shape. `node
ugt-nextjs-full-setup/scripts/verify.mjs`: 16/16 passed. Re-ran every installed module's
  own `verify.mjs` as a final sweep — all failures found are the same already-documented
  class of false positive (checkers assume a root-level `app/`/`components/` layout and the
  org shadcn/next-intl kit; this project uses `src/app`/`src/components` and hand-built
  Tailwind throughout, both permanent, recorded decisions) or genuinely-pending infra
  placeholders — no new gaps beyond the one fixed. Pruned this file from ~225 lines back
  toward the skill's own ~60-line guidance (it's imported into every session via
  CLAUDE.md). `npm run build`/`lint`/`format:check`/`test` all pass, unchanged from the
  CI/CD chunk (22 routes, 0 lint errors, 4/4 tests).
- 2026-09-03 Installed CI/CD (`ugt-nextjs-cicd-setup`, last pipeline module): Jenkinsfile
  (10-stage), SonarQube config (sources adapted to this project's real `src/`-based
  layout), Dockerfile + both compose files, `.dockerignore`. Decided (no live infra yet, same
  pattern as every chunk): project `ugt-voicecare`, no basePath, ports 3000/3001 as
  placeholders, no Sentry. Applied the Upload chunk's deferred ClamAV/storage
  docker-compose wiring in this same chunk (its own §4.4 close-out step). Extended
  `/api/health` with a real DB check (`checks.database`, 200/503). Flagged: no git remote
  configured yet.
- 2026-09-02 Installed real file attachments (`ugt-nextjs-upload-setup`): storage I/O +
  ClamAV virus scan (fail-closed) + guarded upload/download routes + real `Attachments`
  table (replacing the `AttachmentsJson` bridge column). ClamAV Docker service itself
  deferred to the CI/CD chunk (done above). Not wired into any page yet — forms still use
  the fake attachment simulator (see Next).
- 2026-09-02 Installed workflow email (`ugt-nextjs-mail-setup`): 5 templates (1:1 with
  `NotificationItem['type']`), dev-mode redirect, admin editor at `/admin/mail-templates`.
  Send hook wired into the Prisma Server Actions (`lib/actions/tickets.ts`), correct but
  unreached until the localStorage→Server Action rewiring happens (see Next).
- 2026-09-02 Installed authentication (`ugt-nextjs-auth-setup`): Better Auth + Keycloak SSO
  only, custom RBAC for the 3 new admin pages (kept deliberately separate from the app's
  pre-existing `UserRole`/`RoleAccessConfigs` tab-visibility system — see decisions.md),
  first-admin bootstrap at `/admin/setup`. Retired `Navbar`'s free role-switcher dropdown —
  role now comes from `user.appRole`, admin-assigned via `/admin/users`. Guard is
  `src/middleware.ts` (cookie-presence only) + a real session/permission check in
  `src/app/(shell)/layout.tsx`.
- 2026-09-02 Ran `ugt-nextjs-design-setup` in existing-project scan mode: wrote
  `docs/DESIGN.md` documenting the app's existing hand-built design (indigo/slate + role
  colors, Topbar shell, no dark mode, Thai-only) as the permanent agreement — every gap vs.
  the org's shadcn/next-intl default recorded as a deliberate, grandfathered deviation.
  Later same day: loaded real Inter+Noto Sans Thai fonts, fixed `<html lang="en">` → `"th"`,
  and closed the "shadcn for new pages only?" question — no, every future page stays
  hand-built too.
- 2026-09-02 Installed test/lint tooling (`ugt-nextjs-test-lint-setup`): Vitest, ESLint flat
  config, Prettier, husky+lint-staged. Fixed all 21 pre-existing ESLint errors repo-wide.
- 2026-09-02 Installed the database layer (`ugt-nextjs-database-setup`): Prisma 7 +
  `@prisma/adapter-mssql`, full schema (`tickets` PK moved from tracking code to a
  surrogate id), offline-generated initial migration, parallel Server Action surface under
  `lib/actions/` — not yet wired into components (see Next, unchanged since this chunk).
- 2026-09-02 Migrated `ugt-voice-platform` ("UGT VoiceCare") from Vite+React SPA+Express to
  Next.js 15 App Router (Phase A — pure framework port, zero data-layer changes).
