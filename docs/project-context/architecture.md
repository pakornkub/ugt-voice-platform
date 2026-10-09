# Architecture — as-built

<!-- แผนที่ระบบตามที่เป็นจริงตอนนี้ — ทุกข้อชี้ไฟล์/โฟลเดอร์จริง (สารบัญ ไม่ใช่กระจก:
     อย่าลอก logic จากโค้ดมาเล่าซ้ำ) · อัปเดตผ่าน /ugt-handoff เมื่องานเปลี่ยนโครงสร้าง
     จุดที่จงใจต่างจากมาตรฐาน ugt-* แทรกตรงหัวข้อที่เกี่ยวด้วยป้าย
     "⚠ deviation: <อะไร> — <เหตุผล> (YYYY-MM-DD)" · คุม ~150 บรรทัด -->

## Module map

- `src/app/(shell)/` — Next.js App Router routes (one per tab) + `layout.tsx`/`shell.tsx`
  (client Shell: Navbar, toast, notifications drawer, tracking/satisfaction/export modals,
  mobile bottom nav) shared across every route.
- `src/app/shell-context.tsx` — React Context bridging the Shell's state/handlers down to
  each route's page component; also the tab-id ↔ URL-path maps (`TAB_TO_PATH`/`PATH_TO_TAB`).
- `src/app/api/` — Route Handlers: `health/route.ts`, `ai/suggest-category/route.ts`,
  `ai/analyze-complaint/route.ts`, `ai/cluster-insights/route.ts` (Gemini calls via
  `@google/genai`, shared `getGeminiClient()` + `generateGeminiContentWithFallback()` in
  `lib/gemini.ts`); read `GEMINI_API_KEY` via `@/lib/env`, not `process.env` directly.
- `src/context/LanguageContext.tsx` — TH/EN UI language (ported as-is from upstream, decision
  2026-10-08): `LanguageProvider` wraps the whole app in `src/app/layout.tsx`; `useLanguage()`
  → `lang`/`t()`/`getCategoryName()`/... ; preference in localStorage (`voiceplatform_lang_preference_v2`,
  default `th`).
- `lib/directory.ts` (server-only reads of the HR view `[thrygsd002].[ICTPortal_PRD].[dbo].
[vwHR_SC_Employee]`, tagged-template SQL, CAST columns): `findEmployeeByLogin`,
  `findEmployeeByCode`, `searchDirectory`, `hrStatusByEmails`, `listDirectoryPage`; client access
  only through `lib/actions/directory.ts` (tab-guarded). Replaced upstream's mock
  `employeeDirectory.ts` on 2026-10-09 (rewiring slice 2).
- `lib/roster-role.ts` (role from the rosters, `rosterRolesByEmail` for `/admin/users`) +
  `lib/tab-guard.ts` (`requireTab`, `writeAudit` for roster/RBAC actions) +
  `src/services/rosterDefaults.ts` (upstream demo rosters / `APP_TABS` / RBAC defaults, pure data
  so `reset*ToDefault` actions can import it; `api.ts` re-exports it).
- `src/services/categoryHeuristics.ts` — keyword → category rules: `analyzeWithHeuristics()`
  (server fallback of `/api/ai/suggest-category`, 7 rules) and `analyzeWithClientHeuristics()`
  (client catch-path of `suggestCategoryWithAI()`, the shared 5 rules) — the two lists upstream
  keeps in `server.ts` / `api.ts`, sharing one copy of the common rules.
- `src/components/` — one component per feature screen/modal, all `'use client'`. Logic = upstream
  `d20ca0b` (ported 2026-10-09, decisions.md), restructured for Sonar without behaviour change.
  Added by the port: `InvestigationReportModal` (printable via portal + `@media print` in
  `src/app/globals.css`), `RecentSearchesPanel`, `AdminEmailNotificationSettings` (sub-tab of
  `AdminGatekeeperManagement`), shared `ConfirmDialog` (+ `useConfirmDialog`),
  `executiveShared.tsx` (exec-status select/sync shared by RBAC + gatekeeper admin),
  `clickableProps.ts` (keyboard-operable clickable rows), `workflow-manual/*` (WorkflowDiagram's
  5 manual sections + data), `export-analytics/*` (ExportAnalyticsModal tabs + pure CSV/JSON).
- `src/services/api.ts` — display helpers (badge text/colors, `APP_TABS`, `INITIAL_*`), AI fetch
  wrappers, and the localStorage data that has **not** moved to the DB yet: email settings +
  simulated dispatch log (slice 3), recent searches (per-device by design). Tickets +
  notifications left it on 2026-10-09 (slice 1); rosters + RBAC matrix the same day (slice 2).
- `lib/ticket-scope.ts` (pure rules) + `lib/ticket-access.ts` (server-only: scoped
  ticket/notification reads) — who sees / may change which ticket; used by the shell layout and
  `lib/actions/tickets.ts|notifications.ts`. See business-rules.md. **`resolveViewer(session)`**
  (`lib/ticket-access.ts`) is the single place that turns a session into role + RBAC config +
  gatekeeper categories (the layout's `appRole` comes from it too) — the role comes from the
  people rosters since slice 2 (decisions.md 2026-10-09 "App role comes from the people rosters").
- `lib/email-notifications.ts` (server-only: recipients, rendering, `EmailDispatchLogs` rows) +
  `lib/actions/email-settings.ts` (AppSettings `email.notification-settings`, logs, test send) +
  `src/services/emailDefaults.ts` (upstream defaults + interpolation) — rewiring slice 3, 2026-10-09.
- `lib/reports.ts` (server-only, Prisma, scoped by `ticketScopeWhere`) + `lib/report-catalog.ts`
  (client-safe labels/columns) + `lib/actions/reports.ts:runReport` — the five preset reports of
  `ExportAnalyticsModal`'s "SQL Query Studio" (admin only). Replaced the sql.js browser shadow DB
  on 2026-10-09 (rewiring slice 5).
- `src/services/safeStorage.ts` — SSR-safe `localStorage` wrapper (no-ops on the server;
  needed because Next.js server-renders `'use client'` components once before hydration).
- `src/types.ts` — domain model (`ComplaintTicket`, `NotificationItem`, `RolePermissionConfig`,
  `DepartmentGatekeeperConfig`, `ExecutiveMember`, `HrAdminMember`, ...) — authoritative for
  field-level types; mirrored into `prisma/schema.prisma` (see below).
- `src/mockData.ts` — seed data: `CATEGORY_DEFINITIONS` (6 grievance categories: HR/Compliance/Ethics/Fraud/Harassment/Quality),
  `INITIAL_COMPLAINTS`, `INITIAL_GATEKEEPER_CONFIGS`, `INITIAL_NOTIFICATIONS` — also the
  source `prisma/seed.ts` seeds from.
- `docs/DESIGN.md` (added 2026-09-02, `ugt-nextjs-design-setup`, existing-project scan mode)
  — the design agreement, but documents this app's **existing hand-built design** (Tailwind
  utilities, indigo/slate/role-color palette, hand-built Navbar/shell) as the ratified pattern,
  not the org's shadcn/ui default. `docs/design-questions.md` holds the still-open decision on
  whether to add shadcn/ui + the org UI kit as a substrate for brand-new pages only (relevant to
  the next `ugt-nextjs-auth-setup` chunk's generated login/admin pages) — see ⚠ deviation below.
- **Database layer (added 2026-09-02, `ugt-nextjs-database-setup`) — installed but not the
  live data source yet, see ⚠ deviation below:**
  - `prisma/schema.prisma` — 10 tables (`Tickets`, `TicketTimelineLogs`, `TicketEvaluations`,
    `TicketAnonymousMessages` (added 2026-10-08, upstream port — anonymous 2-way chat),
    `DepartmentGatekeeperConfigs`, `GatekeeperOfficers`, `ExecutiveMembers`, `HrAdminMembers`,
    `Notifications`, `RoleAccessConfigs`); SQL Server has no native enum, so every
    enum-shaped column (`GrievanceCategory`, `TicketStatus`, ...) is `String` validated
    against `src/types.ts`'s TS unions at the app layer.
  - `prisma.config.ts` — the only place `DATABASE_URL`/`SHADOW_DATABASE_URL` are read (Prisma
    7 driver-adapter model — no `url` in `schema.prisma`'s `datasource` block).
  - `lib/prisma.ts`, `lib/env.ts` — **root-level**, not `src/lib/` — per the skill's own asset
    convention. Reachable from `src/` code via `@/lib/*` -> `./lib/*` in `tsconfig.json`,
    added ahead of the general `@/*` -> `./src/*` rule from Phase A (TS tries `paths` entries
    in listing order, so the more specific one must come first).
  - `src/lib/actions/*` — Prisma-backed Server Actions mirroring `src/services/api.ts`'s
    function signatures (see `api.md` → Server Actions). `tickets.ts`/`notifications.ts` are live (slice 1, guarded); the rest are read-only from the shell layout or unused until slice 2.
  - `prisma/migrations/20260902000000_init/` — generated **offline** (`prisma migrate diff
--from-empty`, no live SQL Server at authoring time); apply via `prisma migrate resolve
--applied` once real DB values land, not by replaying `migrate dev` — see
    `docs/admin-handoff.md`.
  - `prisma/seed.ts` — mirrors `src/mockData.ts` (tickets/timeline/evaluations/gatekeeper
    configs & officers/notifications) plus a hand-mirrored copy of `src/services/api.ts`'s
    `INITIAL_EXECUTIVES`/`INITIAL_HR_ADMINS`/`INITIAL_ROLE_PERMISSIONS` (not imported directly
    — since 2026-10-09 they live in the pure `src/services/rosterDefaults.ts`, which the
    `reset*ToDefault` actions import). Keep the seed lists in sync with that module.

- **Auth + RBAC (added 2026-09-02, `ugt-nextjs-auth-setup`) — SSO (Keycloak) only, live once
  real Keycloak values land (currently placeholders, see `docs/admin-handoff.md` §2):**
  - `lib/auth.ts` — Better Auth server config: Prisma adapter, Keycloak `genericOAuth` plugin
    (guarded — no-op until `KEYCLOAK_ISSUER`/`CLIENT_ID`/`CLIENT_SECRET` are real), 8h session
    (30m refresh), `databaseHooks.session.create.after` writes `login.success` + syncs
    `authType`/`ldapUsername`. `emailAndPassword.enabled: false` (no local accounts).
  - `lib/auth-client.ts` — browser client (`authClient.signIn.social({ provider: 'keycloak' })`).
  - `lib/actions/auth.ts` — `ssoLogoutAction` only (local session cleanup + Keycloak backchannel
    logout). No LDAP/local login actions — SSO only.
  - `lib/permissions.ts`/`lib/get-user-permissions.ts`/`lib/permissions-sync.ts` — permission
    keys for server guards, derived from the roster role + RBAC tabs (`permissionsFor`, one
    permission system since 2026-10-09; `Role`/`Permission` tables only back `/admin/setup`).
  - `lib/actions/admin-setup.ts` — first-admin bootstrap (also adds the person to
    `HrAdminMembers`). `admin-roles.ts` / `admin-users.ts` were retired on 2026-10-09 (roles come
    from the rosters; `/admin/users` is read-only).
  - `lib/audit-actions.ts` — `ActivityLogs.action` constants: `login.success`/`logout`/
    `logout.sso`/`users.role-assign`/`users.app-role-assign`/`roles.create/update/delete`.
  - `src/proxy.ts` — route guard (Next.js 16 proxy, was `src/middleware.ts` until 2026-10-08), cookie-presence
    check + security headers on every response.
  - `src/app/login/page.tsx` + `src/components/LoginForm.tsx` — public SSO login page.
  - `src/app/admin/setup/` — first-admin bootstrap (`/admin/setup`), outside the `(shell)` group
    (no permissions exist yet at this point).
  - `src/app/(shell)/admin/{users,roles,audit-logs}/page.tsx` + `UsersTable`/`RolesManager`/
    `AuditLogsTable` components — the 3 ongoing admin pages, rendered **inside** the existing
    `(shell)` group so they get the same `Navbar`/tab chrome as every other route (no separate
    admin sidebar was built — see `docs/project-context/decisions.md`).
  - `src/app/(shell)/layout.tsx` — now the real session guard for every route under the shell:
    no session → `/login`; no bootstrap admin yet → `/admin/setup`; no user row →
    a "ไม่พบบัญชีผู้ใช้งานในระบบ" screen (everyone with a session has a roster role or `employee`).
  - `prisma/schema.prisma` — `user`/`session`/`account`/`verification`/`role`/`permission`/
    `rolePermission`/`rateLimit`/`activityLog` models (8 singular + `ActivityLogs`, per the org's
    documented naming exception), (`User.AppRole` was dropped 2026-10-09 — the app role comes from the people rosters, see
    `lib/roster-role.ts`). No directory-enrichment columns (`empCode`/`department`/…
    — not installed this chunk, see decisions.md).
  - `prisma/migrations/20260902010000_auth_rbac/` — generated **offline** (schema-to-schema
    diff, no live SQL Server — same method as the initial migration); apply via `prisma migrate
resolve --applied` once real DB values land, see `docs/admin-handoff.md`.

- **Mail (added 2026-09-02, `ugt-nextjs-mail-setup`) — SMTP workflow email, live once real
  SMTP values land (currently placeholders, see `docs/admin-handoff.md` §3):**
  - `lib/email.ts` — nodemailer transport + `sendMail`/`sendTemplatedMail` (the one entry
    point for workflow email — dev-mode redirect via `dev-mode:enable` permission, `[DEV] `
    subject prefix, disclosure banner).
  - `lib/mail-templates.ts` — token substitution (`{{token}}`, HTML-escaped by default),
    `getMailTemplate` (AppSettings override else in-code default, fail-open on a corrupt
    override), `renderComposedMail` (chrome + content, same renderer used by send and preview).
  - `lib/types/mail-templates.ts` — 4 template keys 1:1 with `NotificationItem['type']`
    (`ticket.new_ticket`/`ticket.status_update`/`ticket.satisfaction_pending`/
    `ticket.direct_ceo_alert`; `ticket.sla_warning` was dropped 2026-10-08 with SLA), each with its definition (variables,
    banner, CTA) and in-code default subject/body. Fixed chrome (header/footer/banner/CTA,
    `composeEmail`) is not admin-editable. No `auth.password-reset` key — this project is
    SSO-only, no local accounts.
  - `lib/actions/admin-mail-templates.ts` — `saveMailTemplateAction`/`resetMailTemplateAction`/
    `previewMailTemplateAction` for `/admin/mail-templates` (session → permission
    `mail-templates:manage` → action → audit log, org pattern).
  - `src/app/(shell)/admin/mail-templates/page.tsx` + `src/components/MailTemplatesManager.tsx`
    — the ongoing admin page, hand-built Tailwind (list + subject/body form + sandboxed-iframe
    preview modal) — **not** the skill's shadcn `Card`/`Sheet`/`ConfirmActionDialog` assets, and
    no i18n catalog — see ⚠ deviation below. Rendered inside the `(shell)` group like the 3
    auth-chunk admin pages (no separate admin layout in this project).
  - `prisma/schema.prisma` — `appSetting` model (`@@map("AppSettings")`), generic key/value
    settings store; mail template overrides live at `mailTemplate:<key>`.
  - `prisma/migrations/20260902020000_add_mail_templates/` — generated **offline**
    (schema-to-schema diff against git HEAD's prior schema, no live SQL Server — same method as
    the two prior migrations); apply via `prisma migrate resolve --applied` once real DB values
    land, see `docs/admin-handoff.md`.
  - `lib/permissions.ts` — new `mail-templates:manage` (admin page gate) and `dev-mode:enable`
    (redirects a tester's own mail to themselves) permissions, seeded via `ALL_PERMISSIONS`.
  - `lib/audit-actions.ts` — new `mail-templates.update`/`mail-templates.reset` audit actions.

- **Upload (added 2026-09-02, `ugt-nextjs-upload-setup`) — real file storage, built and
  correct but not called by any page yet, see ⚠ deviation below:**
  - `lib/storage.ts` — Docker-volume file I/O (`STORAGE_ROOT`), generated `yyyy/mm/<uuid>`
    paths (never derived from the uploaded filename), `safeDisplayName()`.
  - (no virus scan — `lib/virus-scan.ts` removed 2026-10-09, owner decision; rows are
    stored `scanStatus: 'unscanned'`.)
  - `lib/attachment-access.ts` — `canReadAttachment(userId, {ticketId})`, the per-ticket
    download scope: admin sees everything; the ticket's own submitter (matched by
    session email against `Tickets.SubmitterEmail` — no stronger link exists yet, see
    ⚠ deviation below); executive only on `isDirectToExecutive` tickets; gatekeeper only
    within `RoleAccessConfigs.assignedDepartments`/`canViewAllDepartments`, mirroring
    `GatekeeperInbox.tsx`'s existing client-side filter.
  - `src/app/api/files/route.ts` (upload) / `src/app/api/files/[id]/route.ts` (download)
    — Route Handlers (not Server Actions — `bodySizeLimit` caps those at 1 MB), guard
    order session → permission → scan/scope → action → audit log.
  - `src/components/AttachmentPicker.tsx` — hand-built Tailwind attachment widget (no
    next-intl/org UI kit — see ⚠ deviation below), posts to `/api/files`, downloads via
    plain `<a href="/api/files/<id>">`.
  - `prisma/schema.prisma` — new `attachment` model (`@@map("Attachments")`), replacing
    `Tickets.AttachmentsJson`. `ticketId` (required, cascades) + `timelineLogId`
    (optional, `NoAction` — SQL Server disallows a second cascade path to the same
    table) — see `docs/project-context/decisions.md` for why this is a real FK pair
    instead of the skill's default polymorphic `entityType`/`entityId`.
  - `prisma/migrations/20260902030000_add_attachments/` — generated **offline**
    (schema-to-schema diff, no live SQL Server — same method as the prior three
    migrations); apply via `prisma migrate resolve --applied` once real DB values land.
  - `lib/permissions.ts` — new `files:create`/`files:read` permissions (group "ไฟล์แนบ").
  - `lib/audit-actions.ts` — new `files.upload`/`files.download`
    audit actions.
  - Storage bind-mount, previously deferred, is now wired
    into `docker-compose.yml`/`docker-compose.dev.yml`/`Dockerfile` — see the CI/CD
    entry below and `docs/project-context/decisions.md`.

- **CI/CD (added 2026-09-03, `ugt-nextjs-cicd-setup`) — the last module in the fixed
  pipeline order, basePath `/ugt-voice-platform[-dev]` on ugtweb.ube.co.th (2026-10-09), no Sentry:**
  - `Jenkinsfile` — 10-stage declarative pipeline (Checkout → Install → Code Quality
    (lint/format:check/tsc, parallel) → Unit Tests → Build → OWASP Dependency Check →
    SonarQube Analysis → Quality Gate → Docker Build → Deploy), branch-resolved
    (`main`=prod, `develop`=dev) inside `script {}` blocks, `post {}` sends
    `emailext` on every outcome + `cleanWs()`.
  - `sonar-project.properties` — `sonar.sources`/`sonar.tests` =
    `src/app,src/components,src/services,lib` (this project's real layout, not the
    skill's generic default — see decisions.md), CPD/rule-suppression lists start
    empty.
  - `Dockerfile` — 3-stage Node 22 Alpine build (`deps` → `builder` → `runner`),
    `output: 'standalone'` (gated on `CI` in `next.config.ts`), creates
    `/app/storage` before dropping to the non-root `nextjs` user, `HEALTHCHECK`
    against `/api/health`.
  - `docker-compose.yml` / `docker-compose.dev.yml` — `app` service (no `clamav` since 2026-10-09),
    `pull_policy: never` (image built locally by Jenkins), bind-mount
    `/home/docker02/appdata/ugt-voice-platform(-dev)/storage:/app/storage`.
  - `owasp-suppressions.xml` — empty skeleton (suppressions added only after a
    reviewed real finding).
  - `.dockerignore`, `.claude/rules/ugt-nextjs-ci.md`.
  - `src/app/api/health/route.ts` — **extended in place** (not replaced by the
    skill's generic asset): added a real `checks.database` (`prisma.$queryRaw`,
    200/503) and the org-contract `status: 'healthy'|'degraded'` literal on top of
    the upload chunk's existing `aiAvailable` field (`scanAvailable` dropped 2026-10-09) — see
    decisions.md. Returns 503 while `DATABASE_URL` is a placeholder (expected).
  - `next.config.ts` — `output: process.env.CI ? 'standalone' : undefined`.
  - Local, gitignored `.env`/`.env.dev` (mirrors of `.env.local` + `APP_PORT`) for
    `docker compose up`/`docker compose -f docker-compose.dev.yml --env-file .env.dev
up` testing.
  - `docs/admin-handoff.md` §5 — Jenkins credentials/job/webhook, SonarQube
    projects/Quality Gate/webhook, Docker host prep (`/home/docker02/appdata`,
    `proxy-network`). Remote: `origin` = `github.com/pakornkub/ugt-voice-platform`
    (first full push 2026-10-08).

## Data flow หลัก

- (2026-10-08, upstream port phase 1) `ComplaintTicket` has **no SLA fields**
  (`slaTargetHours`/`slaDueDate`/`slaStatus`, `defaultSlaHours`, `slaComplianceRate`,
  `sla_warning` removed system-wide) and gains `loginEmail`/`isAnonymousMapped`
  (`mapLoginEmailForTicket()` from `employeeDirectory.ts` runs inside `submitTicket()`),
  `anonymousMessages` (`sendAnonymousChatMessage()`), and `updateTicketWorkflow()` accepts
  `urgency`/`riskSeverity`. `src/services/api.ts` also owns the email-notification settings +
  dispatch log (`dispatchEmailOnTicketSubmitted/Resolved`, `sendTestEmailNotification`;
  localStorage, simulated delivery) and the recent-searches list — all localStorage until the
  DB rewiring. localStorage keys bumped: tickets `_v5` (+ legacy `Environment` → `Compliance`
  migration), gatekeeper configs drop `Environment`, RBAC is deep-merged per role so new flags
  (`canViewAnonymousSubmitterEmail`) get defaults.
- Shell (`src/app/(shell)/shell.tsx` = upstream `App.tsx`): `navigateTab()` rejects tabs outside
  the role's `allowedTabs` with a toast (the four RBAC-permission `admin_*` tabs bypass it —
  `RBAC_PERMISSION_TABS` in `shell-context.tsx`), notifications are filtered by
  `canViewDirectCeoTickets`, bottom-nav buttons by `allowedTabs`, every tracking-code lookup is
  recorded via `addRecentSearch()`, ExportAnalytics modal opens for `admin` only.

- **Shell data (DB rewiring slice 1, 2026-10-09)**: `src/app/(shell)/layout.tsx` (server) →
  session → roster role (`resolveViewer`) → `RoleAccessConfigs`/`DepartmentGatekeeperConfigs` + the user's visible
  tickets (`listVisibleTickets`) + their notifications → `<Shell data>` → `ShellContext`
  (`tickets`, `notifications`, `rolePermissions`, `gatekeeperConfigs`) → pages/components
  (`useShell()`). Writes: component → Server Action (`lib/actions/tickets.ts|notifications.ts`,
  session → scope/permission → Prisma → `ActivityLogs`) → `router.refresh()` re-runs the layout.
  Tracking-code search / notification click → `getTicketByTrackingCode` (server, scoped).
- ยื่นคำร้อง: `EmployeeSubmitForm` → `submitTicket` Server Action (`loginEmail` = session email,
  timeline + notifications in SQL Server) → client logs upstream's simulated email
  (`logTicketSubmittedEmail`) → `handleTicketCreated` → `router.refresh()`.
- AI triage: EmployeeSubmitForm "วิเคราะห์ด้วย Gemini AI" → `analyzeGrievanceWithAI()` in
  api.ts → `POST /api/ai/analyze-complaint` → `src/app/api/ai/analyze-complaint/route.ts` →
  Gemini API (falls back to static heuristics when `GEMINI_API_KEY` is unset).
- AI clustering: `ExecutiveDashboard` "สรุปเชิงกลยุทธ์ด้วย Gemini AI" →
  `getClusterInsightsWithAI()` in api.ts → `POST /api/ai/cluster-insights` → same pattern.
- Login: `/login` (`LoginForm`) → `authClient.signIn.social({ provider: 'keycloak' })` → Keycloak
  → `/api/auth/callback/keycloak` → `lib/auth.ts`'s `databaseHooks.session.create.after` (writes
  `login.success`, syncs `authType`) → `src/app/(shell)/layout.tsx` session check on next
  navigation → `Shell`/`Navbar` render with `identity.appRole` from the DB, not client state.
- Tab navigation: `Navbar` (`src/components/Navbar.tsx`, prop-driven, unchanged) →
  `navigateTab()` in `src/app/(shell)/shell.tsx` → `router.push()` → route change →
  `usePathname()` recomputes `activeTab`, passed back into `Navbar` via `ShellContext`.
- Workflow email: **no real mail from ticket actions right now** — the 2026-09-02 notification-type
  hooks were removed in slice 1 (decisions.md 2026-10-09); upstream's simulated dispatch log runs
  client-side after the action. Slice 3 sends real mail from `lib/actions/tickets.ts` via
  `sendTemplatedMail()` (`lib/email.ts`) per the upstream settings model in `AppSettings`.
- File attachment (added 2026-09-02, `ugt-nextjs-upload-setup`): `AttachmentPicker.tsx` →
  `POST /api/files` (session → permission `files:create` → ticket/timeline-log exist →
  `writeStoredFile()` on the volume → `Attachments` row → audit log) →
  download via `GET /api/files/<id>` (session → permission `files:read` →
  `canReadAttachment()` → block only `scanStatus === 'infected'` → stream + audit log). **Not called by
  any page yet** — see ⚠ deviation below, same root cause as the Prisma persistence
  layer's and the mail send hook's.

## ตารางหลัก → feature

| ตาราง (Prisma `@@map`)                                 | feature                                                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `Tickets` / `TicketTimelineLogs` / `TicketEvaluations` | ยื่นคำร้อง, ติดตามสถานะ, CSAT — `EmployeeSubmitForm`, `GatekeeperInbox`, `SatisfactionModal`         |
| `TicketAnonymousMessages`                              | แชทนิรนามผู้ยื่นเรื่อง ↔ เจ้าหน้าที่ (`ComplaintTicket.anonymousMessages`) — `TrackingTimelineModal` |
| `DepartmentGatekeeperConfigs` / `GatekeeperOfficers`   | จัดการผู้รับผิดชอบ 6 หน่วยงาน — `admin_gatekeeper` tab                                               |
| `ExecutiveMembers`                                     | CEO/EVP whistleblower directory — `admin_gatekeeper` tab                                             |
| `HrAdminMembers`                                       | HR admin directory — `admin_gatekeeper` tab                                                          |
| `Notifications`                                        | in-app notification drawer                                                                           |
| `RoleAccessConfigs`                                    | `RoleBasedAccessManagement` (`rbac_management` tab)                                                  |
| `Attachments`                                          | ticket + timeline-note file uploads — `AttachmentPicker.tsx`, `/api/files*`                          |

Live แล้ว (slice 1, 2026-10-09): `Tickets`/`TicketTimelineLogs`/`TicketEvaluations`/
`TicketAnonymousMessages`/`Notifications` + อ่าน `RoleAccessConfigs`/`DepartmentGatekeeperConfigs`/
`GatekeeperOfficers` · ยังไม่ live: การแก้ config/ผู้บริหาร/HR admin (slice 2), `Attachments` (slice 4)

## ⚠ Deviations (2026-09-02, ทั้งหมดเป็นผลจากการ migrate Phase A ที่จงใจคงพฤติกรรมเดิมไว้ก่อน

เว้นแต่ระบุวันที่อื่น)

- ⚠ deviation (**partly retired 2026-10-09** — tickets + notifications are live in SQL Server,
  slice 1; config editing/email/directory/attachments/SQL studio still localStorage until slices
  2–5) (2026-09-02): มี schema/migration/seed/Server Actions (Prisma + SQL Server)
  พร้อมแล้ว (`prisma/`, `lib/prisma.ts`, `src/lib/actions/`) แต่**ยังไม่ใช่ live persistence
  layer** — ทุก component ยังอ่าน/เขียน `localStorage` ผ่าน `src/services/api.ts` เหมือนเดิม —
  เหตุผล: (1) ยังไม่มี SQL Server จริงให้เชื่อมต่อ (รอ Admin/DBA ตาม
  `docs/admin-handoff.md`), (2) การสลับทุก call site จาก sync localStorage เป็น async Server
  Action เป็นงาน UI-refactor ขนาดใหญ่แยกต่างหากจากการติดตั้ง DB layer — แผนสลับอยู่ในคิวถัดไป
  (`.claude/state/handoff.md` → Open Questions). (ปิดแล้ว 2026-10-09: ทุก slice ย้ายเสร็จ —
  ดู decisions.md)
- ⚠ deviation (2026-09-02): `TicketTimelineLogs`/`TicketEvaluations` (append-only log/CSAT
  submission) และ `Notifications` (system-generated) ไม่มี audit column ครบชุด — ตัดเหลือ
  เท่าที่มีความหมาย (`CreatedAt` อย่างเดียวสำหรับสองตัวแรก, `CreatedAt`/`UpdatedAt` สำหรับ
  Notifications) — เหตุผล: แถวเหล่านี้ไม่เคยถูกแก้ไข/soft-delete จริง ตาม
  `.claude/rules/ugt-nextjs-database.md`'s trim rule. `verify.mjs` เตือน (ไม่ fail) เรื่องนี้
  โดยตั้งใจ.
- ⚠ deviation (2026-09-02): ทุกตารางมี `CreatedBy`/`UpdatedBy` เป็น nullable (ปกติควร
  required ตาม org convention) — เหตุผล: ยังไม่มี authentication จริง จึงไม่มี session user
  id ให้ stamp จนกว่า `ugt-nextjs-auth-setup` จะติดตั้งเสร็จ.
- ⚠ deviation (**retired 2026-09-02**, `ugt-nextjs-auth-setup`): `Navbar`'s free role-switcher
  dropdown (any user could pick any of the 4 roles client-side, no auth) is gone —
  `src/app/(shell)/shell.tsx`'s `currentRole` now comes from the authenticated session's
  server-resolved role (since 2026-10-09 from the people rosters via `resolveViewer`), fetched
  server-side in `src/app/(shell)/layout.tsx`. `RoleBasedAccessManagement.tsx`'s "ทดสอบมุมมอง"
  preview-switch buttons and `WorkflowDiagram.tsx`'s step-click role-switch were removed for the
  same reason (they called the same retired `handleRoleChange`).
- ⚠ deviation (2026-09-02, `ugt-nextjs-auth-setup`): the 8 Better Auth/RBAC tables
  (`User`/`Session`/`Account`/`Verification`/`Role`/`Permission`/`RolePermission`/`RateLimit`)
  carry no `CreatedBy`/`UpdatedBy`/`IsActive`/`IsDeleted` and use hard delete (`prisma.role.delete`
  in `lib/actions/admin-roles.ts`, not `IsDeleted = 1`) — Better Auth owns these rows (writes/
  deletes them itself, never reads this project's audit columns), and `Session`/`Account` cascade
  from `User`, so a soft-deleted user would keep working sessions. Per the org naming-exception
  rule in `.claude/rules/ugt-nextjs-database.md`.
- ⚠ deviation (2026-09-02, `ugt-nextjs-auth-setup`): the new RBAC permission system
  (`Role`/`Permission`, gates only `/admin/users`/`/admin/roles`/`/admin/audit-logs`) and this
  app's own `UserRole` tab-visibility system (`RoleAccessConfigs`/`allowedTabs`, gates the 6
  original feature tabs) are **two separate, independently-assigned systems** — a user's RBAC
  role and their `appRole` are unrelated and set independently from `/admin/users`. See
  `docs/project-context/decisions.md` for why they were not merged. **Superseded 2026-10-09**: one
  permission system (RBAC matrix) + roles from the rosters.
- ⚠ deviation (2026-09-02, `ugt-nextjs-auth-setup`): no central-employee-directory enrichment
  (`lib/directory.ts`/`lib/scope.ts`/`lib/approval-chain.ts` from the skill were not installed) —
  this project has no linked-server employee view to read from yet; SSO gives only name/email/
  username. See `docs/project-context/decisions.md`.
- ⚠ deviation (updated 2026-09-02, `ugt-nextjs-upload-setup`): การแนบไฟล์ใน
  `EmployeeSubmitForm.tsx`/`TrackingTimelineModal.tsx` ยังเป็นการจำลอง (`Math.random()`
  สร้าง object ไฟล์ปลอม) ผ่าน `src/services/api.ts` (localStorage) เหมือนเดิม — แม้ตอนนี้
  จะมี upload/storage/download จริงพร้อมใช้แล้ว (`AttachmentPicker.tsx`, `/api/files*`,
  `lib/storage.ts`) ก็ตาม เหตุผลเดียวกับ deviation แรกด้านบน: ยังไม่มี
  component ไหนเรียก Prisma Server Actions จริง จึงไม่มี `ticketId` จริงให้แนบไฟล์ด้วย —
  ดู decisions.md.
- ⚠ deviation (**obsolete 2026-10-09** — ClamAV removed entirely, owner decision; kept for history; resolved 2026-09-03, `ugt-nextjs-cicd-setup`): ClamAV virus
  scanning's service was missing from compose — now fixed. Both compose files carry a
  `clamav` service + storage bind-mount (the upload skill's own
  `assets/compose-and-dockerfile.snippet.md`, applied verbatim as this chunk's
  close-out step per that skill's §4.4 instruction) — see decisions.md. Real uploads
  still fail closed with `SCANNER_UNAVAILABLE`/`/api/health`'s `scanAvailable: false`
  whenever this stack isn't actually running under Docker (e.g. local `next dev`),
  which remains correct fail-closed behavior, not a bug.
- ⚠ deviation (2026-09-02, `ugt-nextjs-upload-setup`): `AttachmentPicker.tsx` เป็น hand-built
  Tailwind, ไม่มี i18n catalog (`messages/upload.{th,en}.ts` ของ skill ไม่ได้ติดตั้ง) —
  เหตุผลเดียวกับหน้า auth-setup/mail-setup ทั้งหมด (มติต้นโปรเจค "คงดีไซน์เดิม/hand-built
  ทุกหน้า" — ดู decisions.md) `node <upload-setup skill>/scripts/verify.mjs` จึงแดง
  ที่เช็ค `messages/upload.th.ts`/`messages/upload.en.ts` โดยตั้งใจ.
- ⚠ deviation (2026-09-02, `ugt-nextjs-upload-setup`): ไม่มี retention/cleanup job สำหรับ
  ไฟล์ที่ถูก soft-delete (`Attachments.IsDeleted = 1`) — skill เองระบุชัดว่ายังไม่มีมติ
  องค์กรว่า background job จะรันที่ไหน (ดู decisions.md) — ระยะเวลาที่ควรเก็บไฟล์ไว้ก่อน
  ลบจริงยังเป็นคำถามเปิดสำหรับ Admin/Compliance.
- ⚠ deviation (2026-09-02, `ugt-nextjs-mail-setup`): การส่งอีเมลจริงถูกเชื่อมสายไว้แล้วที่
  `lib/actions/tickets.ts` (Prisma Server Action) แต่**ยังไม่มีอีเมลออกจริง** เพราะ (1) module
  นี้ยังไม่มี component ไหนเรียก (เหตุผลเดียวกับ deviation แรกด้านบน — data layer ยังเป็น
  localStorage) และ (2) SMTP relay ยังเป็น placeholder (`docs/admin-handoff.md` §3) — เมื่อ
  ทั้งสองอย่างพร้อม อีเมลจะออกจริงโดยไม่ต้องแก้โค้ดเพิ่ม
- ⚠ deviation (2026-09-02, `ugt-nextjs-mail-setup`): หน้า `/admin/mail-templates` เป็น
  hand-built Tailwind, ไม่มี i18n catalog (`messages/mail.*.ts` ของ skill ไม่ได้ติดตั้ง) —
  เหตุผลเดียวกับหน้า auth-setup ทั้ง 3 หน้า (มติต้นโปรเจค "คงดีไซน์เดิม/hand-built ทุกหน้า" —
  ดู decisions.md).
- (ปิดแล้ว 2026-10-09) "SQL Query Studio" เคยรัน SQL อิสระกับ sql.js ในเบราว์เซอร์ — ตอนนี้เป็น
  preset reports ฝั่ง server (`lib/reports.ts`) ตามมติเดิม.
- ⚠ deviation (2026-09-02): `ugt-nextjs-design-setup` รันในโหมด scan-only — **ไม่ได้ติดตั้ง**
  shadcn/ui, Base UI primitives, org UI kit (`DataTable`/`StatusBadge`/`FormDialog`/...),
  `next-intl`, หรือ shell block ใด ๆ เหตุผล: มติต้นโปรเจค "คงดีไซน์/UX เดิมทุกประการ" ทำให้
  การติดตั้งเต็มรูปแบบ (ซึ่งต้องแตะ `app/globals.css`/`app/layout.tsx` ที่ทั้งแอป share และ
  แทนที่ shell ด้วย shadcn block) มีความเสี่ยงเกินกว่าจะทำโดยไม่ถามก่อน — `node <skill>/
scripts/verify.mjs` จึงยังแดง 18 จุดโดยตั้งใจ (ทุกจุดผูกกับ substrate ที่ไม่ได้ติดตั้ง)
  ดูมติเต็มที่ `docs/DESIGN.md` §10 และคำถามเปิดที่ `docs/design-questions.md` ข้อ 1.

## Testing map

- Vitest (`vitest.config.ts`, jsdom environment) + Testing Library + ESLint (flat config,
  `eslint.config.mjs`) + Prettier (`.prettierrc`) + husky/lint-staged pre-commit — installed
  2026-09-02 (`ugt-nextjs-test-lint-setup`). Scripts: `npm run lint` / `format:check` /
  `test:coverage` / `build` — the four the `Jenkinsfile`'s Code Quality/Unit
  Tests/Build stages call by exact name (`ugt-nextjs-cicd-setup`, 2026-09-03).
- `coverage.include` = `src/app/**`, `src/components/**`, `src/services/**`, `lib/**` (this
  project's real source layout — `app`/`components`/`hooks` do **not** exist at repo root, only
  under `src/`, plus the root-level `lib/` from the database chunk).
- vitest's `resolve.alias` mirrors `tsconfig.json`'s two-entry `paths` exactly (`@/lib/*` →
  root `./lib`, matched first; `@/*` → `./src`, matched second) — copying only the general `@`
  alias (the skill asset's single-entry default) resolves every `@/lib/*` import to the wrong
  place.
- Only 2 smoke tests exist so far, proving the pipeline (not coverage) — see
  `src/components/Navbar.test.tsx` and `src/app/api/ai/analyze-complaint/route.test.ts`
  (exercises the no-`GEMINI_API_KEY` static-fallback branch). Real coverage growth is expected
  to come from tests written alongside future feature work, per the org "tests ship with the
  feature" rule.
