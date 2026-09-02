# Handoff

Last updated: 2026-09-03

## In progress

- Nothing in progress. CI/CD chunk (`ugt-nextjs-cicd-setup`) is complete this
  session — see Done below. **This was the last module in the fixed pipeline
  order.** Only the harness-install step remains (CLAUDE.md block, `.claude/rules`
  merge/index, `.claude/settings.json`) — per explicit instruction this chunk did
  NOT run it; that is the orchestrating session's next step, not a new chunk to
  delegate. No project-root `CLAUDE.md` exists yet — confirm before assuming the
  harness is installed.

## Next

- Harness install (CLAUDE.md block, `.claude/settings.json` merge) — the one
  remaining step of `ugt-nextjs-full-setup`'s own sequence, done by the
  orchestrating session directly, not another chunk.
- Redesign `ExportAnalyticsModal`'s SQL Query Studio as preset reports before
  wiring it to a real SQL Server (decision already made — see
  `docs/project-context/decisions.md`) — not started.
- The big remaining rewiring, unchanged across every chunk so far: switch
  `src/services/api.ts`'s localStorage call sites over to the Prisma Server
  Actions in `lib/actions/` (see Open Questions).

## Open Questions

- Real Keycloak client values needed from the org Keycloak admin (issuer/realm, Client ID
  `ugt-voicecare`, client secret, redirect URI registration). Exact request + return-value
  table is in `docs/admin-handoff.md` §2. Until then the SSO button fails at
  `authClient.signIn.social()` (verified: fails gracefully, resets to a clickable button, no
  crash — see troubleshooting.md if this changes).
- Real SQL Server values still needed from Admin/DBA (unchanged from the database chunk) —
  `docs/admin-handoff.md` §1. Migrations (`20260902000000_init`, `20260902010000_auth_rbac`,
  `20260902020000_add_mail_templates`, `20260902030000_add_attachments`) are ready to
  `prisma migrate resolve --applied` once real `DATABASE_URL` lands — see that doc for the
  exact command sequence. **New this chunk**: `/api/health` now does a real
  `SELECT 1` check and returns 503/`degraded` while `DATABASE_URL` is a placeholder — so the
  Jenkins Deploy stage's health poll (and the `prisma migrate deploy` step just before it)
  will not succeed until real SQL Server values land. Expected, not a bug — see
  `docs/project-context/decisions.md`.
- Real SMTP relay values needed from Admin/IT (host/port, sender address, auth) —
  `docs/admin-handoff.md` §3. Until then `sendMail()` in `lib/email.ts` throws on every call
  (by design — `SMTP_HOST` is a placeholder).
- Real Jenkins/SonarQube/Docker-host values needed from Admin/DevOps — project name, ports,
  basePath and app URLs are now DECIDED (see Done below), but real host port
  allocation, real app host/domain, Jenkins host, and which VCS this repo will be pushed to
  are still open — `docs/admin-handoff.md` §5, "ค่าที่ต้องส่งกลับ" table.
- **This repo has no git remote configured** (local-only) — the CI/CD chunk could not verify
  a GitHub-style webhook flow works; `docs/admin-handoff.md` §5.2/§5.3 flags this explicitly
  and asks the admin/user which VCS hosting to push to before the Jenkins Multibranch
  Pipeline job can be created.
- Retention duration for soft-deleted attachments (`Attachments.IsDeleted = 1`) — no
  cleanup job exists yet (org-wide decision on background-job placement still pending, see
  `ugt-nextjs-upload-setup`'s own SKILL.md). Open question for Admin/Compliance once a
  retention job is actually built — see `docs/project-context/decisions.md`.
- `src/services/api.ts`'s localStorage functions are still NOT wired to the Prisma
  `lib/actions/tickets.ts`/`notifications.ts` Server Actions — unchanged open question from
  the database chunk, carried through every chunk since (mail, upload, and now CI/CD all
  built their integration points ready but unreached by any live call site).
  `FileUpload.tsx`/`/api/files*` are built and correct but not called by
  `EmployeeSubmitForm.tsx`/`TrackingTimelineModal.tsx` for the same reason.
- No linked-server employee/HR view was requested this chunk (`lib/directory.ts`/`lib/scope.ts`/
  `lib/approval-chain.ts` were not installed — see decisions.md). If a real HR employee view
  becomes available later, revisit whether directory enrichment (employee code/department/
  position) is worth adding to `user.appRole`'s assignment flow.

## Done (newest first)

- 2026-09-03 Installed CI/CD (`ugt-nextjs-cicd-setup`) — the last module in the fixed
  pipeline order: `Jenkinsfile` (10-stage declarative pipeline: Checkout → Install →
  Code Quality (lint/format:check/tsc, parallel) → Unit Tests → Build → OWASP Dependency
  Check → SonarQube Analysis → Quality Gate `abortPipeline: true` → Docker Build →
  Deploy), `sonar-project.properties` (`sonar.sources`/`sonar.tests` set to this
  project's real layout — `src/app,src/components,src/services,lib`, not the skill's
  generic `app,components,lib,hooks` default), `Dockerfile` (3-stage Node 22 Alpine,
  `output: 'standalone'`), `docker-compose.yml`/`docker-compose.dev.yml`,
  `owasp-suppressions.xml` (empty skeleton), `.dockerignore`, `.claude/rules/ugt-nextjs-ci.md`.
  **Shared-identity interview answered this chunk** (no `AskUserQuestion` tool available —
  same situation as every prior chunk, decided + documented per Auto Mode, see decisions.md):
  project name `ugt-voicecare`, display name "UGT VoiceCare", **no basePath** (standalone
  deploy — formally resolves the open question the upload chunk left, confirming the
  auth chunk's earlier assumption), ports 3000 (prod, placeholder pending real
  allocation)/3001 (dev), app URLs `http://localhost:3000`/`:3001` (placeholder pending
  real host — see `docs/admin-handoff.md` §5), no Sentry (no `@sentry/*` package in this
  project). **Applied the Upload chunk's deferred ClamAV/storage wiring in this same
  chunk** (per that chunk's own §4.4 instruction) using its exact
  `assets/compose-and-dockerfile.snippet.md`: both compose files now bind-mount
  `/home/docker02/appdata/ugt-voicecare(-dev)/storage:/app/storage`, add a `clamav`
  service (`clamav/clamav:stable`, `clamdscan --ping` healthcheck, `start_period: 300s`
  for the ~1 GB first-boot signature download, signature-DB volume at
  `.../clamav-db:/var/lib/clamav`), and `app` now has `depends_on: clamav: condition:
service_healthy`; the Dockerfile creates `/app/storage` before `USER nextjs`; the
  Jenkinsfile's `[VOLUME]` `mkdir -p` line now prepares `storage` and `clamav-db` for
  both prod and dev paths — `SCANNER_UNAVAILABLE`/`scanAvailable: false` should no
  longer be the norm once this stack actually runs. **Extended (not replaced)**
  `src/app/api/health/route.ts` — added a real `checks.database` (`prisma.$queryRaw`,
  200/503) and the org-contract `status: 'healthy'|'degraded'` literal, on top of
  keeping the upload chunk's existing `aiAvailable`/`scanAvailable` fields (chose this
  over the skill's generic asset, which would have dropped those fields — see
  decisions.md). Consequence: this endpoint returns 503 until real `DATABASE_URL`
  lands, which will also fail the Deploy stage's health poll — expected, not new (the
  `prisma migrate deploy` step earlier in Deploy already fails first for the same
  reason). `next.config.ts` now sets `output: process.env.CI ? 'standalone' : undefined`.
  `docs/admin-handoff.md` gained a new §5 (Jenkins/SonarQube/Docker host, keeping §1–4
  intact) plus a new row in the 1-minute overview table; flagged that this repo has no
  git remote yet, so the Jenkins Multibranch Pipeline/webhook steps need a VCS decision
  first. Created local, gitignored `.env`/`.env.dev` (mirrors of `.env.local` +
  `APP_PORT`) for `docker compose` testing per the skill's §4.5. Fixed a pre-existing
  `format:check` failure in `lib/storage.ts` (one stray whitespace-only line, unrelated
  to this chunk's own edits) while getting the whole repo prettier-clean again.
  `node <skill>/scripts/verify.mjs`: 21/22 checks green; the one red
  (`docs/admin-handoff.md rendered (no __*__ left)`) is **expected** — it flags
  `__KEYCLOAK_HOST__`/`__REALM__`/`__KEYCLOAK_CLIENT_SECRET__`/`__SUPPORT_CONTACT_EMAIL__`,
  which are literal placeholder tokens that genuinely exist in `.env.local`/
  `.env.example`/`lib/types/mail-templates.ts` from the auth/mail chunks — rewriting
  them would misrepresent the real placeholder names, same pattern as design-setup's 18
  and upload-setup's 9 intentionally-red checks. `npm run build`/`lint`/`format:check`/
  `test` all pass (22 routes, unchanged; 0 lint errors, 109 pre-existing warnings
  unchanged; 4/4 tests pass; `.next/standalone/server.js` confirmed present). Verified
  in a real browser: `/` still redirects to `/login` and renders unchanged; `/api/health`
  now correctly reports `{"status":"degraded",...,"checks":{"database":"error"}}`
  against the placeholder `DATABASE_URL` (fast failure, no hang).
- 2026-09-02 Installed real file attachments (`ugt-nextjs-upload-setup`): `lib/storage.ts`
  (Docker-volume I/O, generated `yyyy/mm/<uuid>` paths), `lib/virus-scan.ts` (ClamAV clamd
  INSTREAM client, fail-closed), `lib/attachment-access.ts` (`canReadAttachment` — real
  per-ticket scoping: admin all, submitter by email match, executive on
  `isDirectToExecutive`, gatekeeper by `RoleAccessConfigs` department scope), guarded
  Route Handlers `src/app/api/files/route.ts` (upload) and `src/app/api/files/[id]/route.ts`
  (download), and hand-built Tailwind widget `src/components/FileUpload.tsx` (no
  next-intl/org UI kit — same standing design decision as every prior chunk's new UI).
  New `attachment` model (`@@map("Attachments")`) replaces `Tickets.AttachmentsJson`, with
  a **real FK pair** (`ticketId` required + `timelineLogId` optional) instead of the skill's
  default polymorphic `entityType`/`entityId` — see decisions.md for why. Migration
  `20260902030000_add_attachments` generated offline (schema-to-schema diff, no live SQL
  Server — same method as the prior three). New `files:create`/`files:read` permissions and
  `files.upload`/`files.upload-rejected`/`files.download` audit actions. Virus scanning is
  **installed** (org default) but the ClamAV Docker service itself is **deferred** — see Next
  above — so every real upload today fails closed with `SCANNER_UNAVAILABLE`. **Not wired
  into any page** — `EmployeeSubmitForm.tsx`/`TrackingTimelineModal.tsx` still use their
  original `Math.random()` fake-attachment simulator, same scoping decision as the mail
  chunk's send hook. Fixed a real break the schema change caused:
  `lib/actions/mappers.ts`/`tickets.ts` referenced the now-removed `attachmentsJson` column
  — added `mapAttachment()` and wired the real `attachments` relation into `mapTicket`/
  `TICKET_INCLUDE` instead. Interview questions (max file size, reverse proxy, retention)
  had no `AskUserQuestion` tool available this session (same situation as the auth-setup
  chunk) — decided by the installer with reasoning recorded in decisions.md; flagged above
  as Open Questions for the user/Admin to confirm. `npm run build`/`lint`/`format:check`/
  `test` all pass (22 routes now, up from 20; 0 lint errors, 110 pre-existing warnings
  unchanged in nature; 4/4 tests pass). Verified in a real browser: `/` still redirects to
  `/login` and renders unchanged; `/api/health` now also reports `scanAvailable` (false,
  expected); `/api/files/*` correctly 401s when unauthenticated via the existing middleware.
- 2026-09-02 Installed workflow email (`ugt-nextjs-mail-setup`): `lib/email.ts`
  (`sendTemplatedMail`/`sendMail`, nodemailer transport, dev-mode redirect), `lib/mail-templates.ts`
  (render + escape), `lib/types/mail-templates.ts` (5 templates, one per `NotificationItem['type']`:
  `ticket.new_ticket`/`ticket.status_update`/`ticket.satisfaction_pending`/`ticket.direct_ceo_alert`/
  `ticket.sla_warning` — no `auth.password-reset`, this project is SSO-only). Admin editor at
  `/admin/mail-templates` (`src/app/(shell)/admin/mail-templates/page.tsx` +
  `src/components/MailTemplatesManager.tsx`, hand-built Tailwind — **not** the skill's shadcn
  `Card`/`Sheet`/`ConfirmActionDialog` assets, and **no i18n catalog** (`messages/mail.*.ts`
  skipped) — same standing 2026-09-02 design decision as every prior chunk's new pages; nav
  entry gated by `mail-templates:manage` in `Navbar.tsx`, same pattern as the 3 auth-chunk admin
  tabs. New permissions `mail-templates:manage` + `dev-mode:enable` in `lib/permissions.ts`, new
  audit actions `mail-templates.update`/`.reset` in `lib/audit-actions.ts`. New `appSetting`
  model (`@@map("AppSettings")`) in `prisma/schema.prisma`, migration
  `20260902020000_add_mail_templates` generated offline (schema-to-schema diff against git
  HEAD's schema, no live SQL Server — same method as the prior two migrations). **Scoping
  decision** (data layer is still localStorage, not DB-backed — see Open Questions): the mail-send
  hook is wired into `lib/actions/tickets.ts`'s `submitTicket`/`updateTicketWorkflow` (the
  Prisma Server Actions), not `src/services/api.ts` (client-side, can't call nodemailer/Prisma).
  These Server Actions are still not called by any component, so no real email goes out today —
  the wiring is correct and ready for when the call sites switch over. SMTP host/port/sender are
  still placeholders (`docs/admin-handoff.md` §3, new section appended, §1/§2 untouched).
  `npm run build`/`lint`/`format:check`/`test` all pass (20 routes now, up from 19; 0 lint
  errors, 109 pre-existing warnings unchanged; 4/4 tests pass). Verified in a real browser: `/`
  still redirects to `/login` and renders unchanged (indigo/slate card, no reskin); `/api/health`
  still bypasses auth.
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
  Open Questions and `docs/admin-handoff.md` §1–2. `npm run build`/`lint`/`format:check`/
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
