# Decisions — append-only

<!-- มติทุกเรื่อง ยกเว้น design (→ docs/DESIGN.md §10) · append ผ่าน /ugt-handoff
     ห้ามแก้/ลบย้อนหลัง — จะกลับมติ = เพิ่มรายการใหม่อ้างถึงของเก่า
     ทุกรายการต้องมี: เหตุผล + ทางเลือกที่ปัดตก (ไม่งั้นอีกสามเดือนมีคน re-litigate
     โดยไม่รู้ว่าเคยชั่งน้ำหนักแล้ว)
     กติกาสำหรับ AI: ก่อนเสนอเปลี่ยนแนวทาง/lib/โครงสร้าง — อ่านไฟล์นี้ก่อน
     ถ้างานใหม่ขัดมติเดิม ให้ยกขึ้นมาบอกผู้ใช้ ไม่ทำเงียบ ๆ -->

- 2026-09-02 Migrate the whole app from Vite+React SPA+Express (Google AI Studio scaffold)
  to Next.js App Router — **because** the org's `ugt-nextjs-*` install pipeline (SQL Server
  via Prisma, Keycloak SSO/RBAC, Jenkins/SonarQube CI, shared design system) only targets
  Next.js App Router, and the user wants this deployable under the org standard while
  keeping the exact same design/UX/workflow · rejected: adapting the `ugt-nextjs-*` skill
  assets to a non-Next.js stack (the skill explicitly forbids this — assets are org-standard
  contracts, not templates to bend).
- 2026-09-02 Phase A of the migration is a pure framework port with **zero data-layer
  changes** — every component keeps using `localStorage`/`sql.js` exactly as before, the
  free role-switcher dropdown stays, the SQL Query Studio stays — **because** this keeps the
  highest-risk step (framework port) independently verifiable as pixel-identical to the
  original before layering in the real DB/auth rewrites · rejected: doing the data-layer
  rewrite and framework port in the same pass (harder to verify, harder to roll back a
  regression to just one cause).
- 2026-09-02 Both Mail and Upload optional modules are wanted for the eventual org rollout
  — **because** the app's notifications (gatekeeper/CEO alerts, SLA warnings) are currently
  in-app only and attachments are currently a fake `Math.random()` simulator; both need real
  infra (SMTP relay, ClamAV) to be genuinely useful in production · deferred to their own
  chunks (`ugt-nextjs-mail-setup`, `ugt-nextjs-upload-setup`), not built in Phase A.
- 2026-09-02 Auth will be **SSO (Keycloak) only**, which retires the free role-switcher
  dropdown once implemented — **because** the org standard for this kind of app is SSO, and
  the user accepted that a free role switcher is inherently incompatible with real RBAC ·
  rejected: keeping the switcher alongside real auth (defeats the purpose of access control).
- 2026-09-02 `ExportAnalyticsModal`'s "SQL Query Studio" (arbitrary user-typed SQL against
  the in-browser sql.js copy) will become a set of **preset reports** once wired to real SQL
  Server — **because** letting arbitrary end-user SQL reach a real production database is a
  security risk the org standard won't accept · rejected: keeping raw SQL access scoped to
  admin + a read-only DB user (still considered a live risk, and preset reports cover the
  same "export for analysis" need without it) · rejected: dropping the feature entirely (the
  user wants the export/analytics capability preserved, just not as raw SQL).
- 2026-09-02 `tickets` moves from a natural key (`tracking_code` as PK, per the
  `src/services/sqliteDb.ts` draft) to a **surrogate `id` (cuid) + `@unique trackingCode`
  column** in `prisma/schema.prisma` — **because** the org naming/audit-column convention
  (`ugt-nextjs-database-setup`'s `references/naming-conventions.md`) requires a surrogate PK
  named `Id` on every app-owned table, and this was already flagged as needed in the Phase A
  handoff notes · rejected: keeping `trackingCode` as PK (violates the org convention, and
  ties every FK in the schema to a human-editable-looking string instead of an opaque id).
- 2026-09-02 The app's own per-role tab/permission settings table (`RolePermissionConfig` in
  `src/types.ts`) maps to **`RoleAccessConfigs`**, not `RolePermissions` — **because**
  `ugt-nextjs-auth-setup` will later install its own singular `RolePermission` table for
  Better Auth's core RBAC, and the two are structurally different things (this app's table is
  tab-visibility/capability settings for 4 fixed roles; Better Auth's is the real
  session-backed permission model) · rejected: naming it `RolePermissions` (the more obvious
  plural) — would collide/confuse with the future Better Auth table sharing nearly the same
  name.
- 2026-09-02 `lib/prisma.ts`/`lib/env.ts`/`lib/actions/` live at the **repo root**, matching
  `ugt-nextjs-database-setup`'s literal asset destinations and its `verify.mjs`'s hardcoded
  paths, reached from `src/` code via a new `@/lib/*` -> `./lib/*` tsconfig path listed ahead
  of the existing `@/*` -> `./src/*` rule from the Phase A migration — **because** keeping the
  skill's assets at their documented location keeps `verify.mjs` and future `/plugin update`
  kit-syncs accurate without needing a project-specific carve-out · rejected: moving them to
  `src/lib/` to match the rest of the codebase (would need `.claude/rules/ugt-nextjs-database.md`
  edited every time it's overwritten wholesale by the skill, and made `verify.mjs`'s hardcoded
  `lib/prisma.ts`/`lib/env.ts` checks permanently red).
- 2026-09-02 SQL Server host/instance, port, database name, and login credentials are all
  **placeholders** in `.env.example`/`.env.local` for this chunk — **because** no real SQL
  Server was available to provision against yet, and the user (coordinator) explicitly chose
  to proceed with placeholders now rather than block the chunk on Admin/DBA turnaround ·
  the full schema, offline-generated initial migration, and seed script are built exactly as
  if the connection were real, so going live is `npx prisma migrate resolve --applied
20260902000000_init && npx prisma generate && npx prisma db seed` once real values land
  (tracked in `docs/admin-handoff.md` and `.claude/state/handoff.md`) · rejected: leaving the
  database chunk entirely undone until real infra exists (would block every later chunk that
  depends on the schema being in place, e.g. auth's session tables referencing app data).
- 2026-09-02 Every table's `CreatedBy`/`UpdatedBy` audit columns are **nullable** for now
  (org convention normally requires `CreatedBy` on master/transaction tables) — **because**
  there is no real authentication yet, so no session user id exists to stamp · deferred:
  tighten to required (or default to a system actor) once `ugt-nextjs-auth-setup` lands and
  every Server Action in `src/lib/actions/` can receive a real user id.
- **[superseded 2026-10-08 — Next 16 upgrade, see below]** 2026-09-02 `eslint-config-next` is pinned to `^15.5.0` (not npm's default-latest 16.x) and
  `eslint.config.mjs` uses `@eslint/eslintrc`'s `FlatCompat` shim instead of the
  `ugt-nextjs-test-lint-setup` asset's default direct flat-config import — **because** this
  project pins `next@^15.5.0` (Phase A migration), and `eslint-config-next` only ships native
  flat config from the 16.x line; the 15.x line resolved by that pin still exports legacy
  eslintrc-style config objects, which flat ESLint 9 cannot spread directly · rejected: letting
  npm install the newest `eslint-config-next` (16.x) — its Next-16-only ESLint rules would be
  out of sync with the actually-installed Next 15 APIs · rejected: downgrading to ESLint 8 to
  match the legacy config shape natively — moves backward on an org-standard tool for a
  one-file workaround. Revisit when `next` is bumped to 16.x — the `FlatCompat` shim should
  come out then, not be kept as permanent scaffolding.
- 2026-09-02 Ran a one-time repo-wide `prettier --write .` and fixed all 21 pre-existing
  ESLint **errors** (`@typescript-eslint/no-explicit-any`, `react/no-unescaped-entities`) across
  the 11 components + both AI routes + `sqliteDb.ts` as part of installing the tooling, rather
  than leaving `npm run lint`/`npm run format:check` red — **because** the org standard
  (`ugt-nextjs-test-lint-setup`'s own Verification Checklist) requires both to pass, and this
  codebase (ported from a Vite scaffold, then hand-written further) had never been run through
  either tool · added `AiTriageSuggestion`/`AiClusterInsights`/`AiRiskCluster` to `src/types.ts`
  to replace several of the `any`s with real shapes matching what `/api/ai/*` actually returns
  · rejected: disabling the two ESLint rules project-wide (masks real type-safety and JSX-escape
  issues instead of fixing them) · rejected: fixing only the files this chunk happened to touch
  and leaving the rest red (defeats the point of `npm run lint` gating the pipeline) ·
  confirmed no behavior change: `tsc --noEmit` and `next build` both clean before and after,
  110 ESLint **warnings** (mostly unused icon imports) deliberately left as-is — warnings don't
  fail the pipeline and fixing them is unrelated cleanup outside this chunk's scope.
- 2026-09-02 Installed `ugt-nextjs-auth-setup` (Better Auth + Keycloak SSO + RBAC) **without**
  the org UI kit/next-intl the skill's assets assume — every login/admin page (login,
  `/admin/setup`, `/admin/users`, `/admin/roles`, `/admin/audit-logs`) is hand-built Tailwind,
  matching the app's existing pattern instead of shadcn `DataTable`/`Sheet`/`ConfirmActionDialog`
  — **because** the standing 2026-09-02 decision to keep this app's hand-built design applies to
  new pages too (already recorded in `docs/DESIGN.md` §10, `docs/design-questions.md` #1) ·
  destructive deletes use `window.confirm()` (matching `RoleBasedAccessManagement.tsx`'s existing
  `handleDeleteExec`), not a custom confirm modal · rejected: installing shadcn/ui as a substrate
  for the new auth pages only (already rejected on 2026-09-02, see `DESIGN.md` §10 — would create
  two parallel design systems in one app).
- 2026-09-02 Auth interview answers not already covered by a standing decision, decided by the
  installer (no `AskUserQuestion` available in this run — see below) rather than left blocking:
  (1) **no basePath** — app deploys standalone, matching the existing "currently assumed
  standalone" note in `.claude/state/handoff.md`; (2) **no central employee directory /
  linked-server view** — `lib/directory.ts`/`lib/scope.ts`/`lib/approval-chain.ts` were **not**
  installed; this app's existing tables (`GatekeeperOfficers`/`ExecutiveMembers`/`HrAdminMembers`)
  already carry name/department/position managed by hand through the admin UI, not through an AD
  sync, so there was no existing concept to enrich against — revisit if/when a real HR linked-server
  view becomes available; (3) **existing menus under RBAC** — none of the 6 existing feature tabs
  (submit/my_tickets/workflow/gatekeeper/executive/clustering) were put under the new
  `resource:action` permission system; they keep using the app's own `RoleAccessConfigs`/
  `allowedTabs` exactly as before, now driven by the real session role instead of the free
  switcher — only the 3 brand-new admin pages use the new permission system. Rejected: migrating
  the 6 existing tabs onto the new permission model too (a much larger refactor of established
  business logic than "install auth", and risks the "never silently reskin/rebehave an existing
  page" rule).
- 2026-09-02 Added `user.appRole` (nullable `employee|gatekeeper|executive|admin`) as a **separate
  column from the new RBAC `Role`/`Permission` system** — this is what the old free role-switcher
  dropdown used to set client-side; it now comes only from `/admin/users` via
  `assignUserAppRoleAction` (`lib/actions/admin-users.ts`) — **because** the RBAC role/permission
  model this skill installs (`Role`/`Permission`/`RolePermission`, used for `/admin/*` access) is a
  free-form admin-configurable system, structurally incompatible with this app's fixed 4-value
  `UserRole` enum that `RoleAccessConfigs`/`Navbar`/every ticket-routing component already depends
  on — collapsing them into one system would be a much larger business-logic rewrite than "install
  auth" · the very first admin (via `/admin/setup`) also gets `appRole: 'admin'` automatically so
  they land in a working app immediately, not a second manual step · a user with `appRole: null`
  (not yet assigned — SSO rows appear on first login with no role, per the skill's own มติ
  2026-08-11) sees a "รอผู้ดูแลระบบกำหนดสิทธิ์การใช้งาน" waiting screen instead of the shell, rather
  than silently defaulting to `employee` — deny-by-default matches how the RBAC `roleId` already
  behaves · rejected: reusing the RBAC `Role.name` field to carry one of the 4 fixed app roles
  (would block admins from creating additional free-form admin-section roles, e.g. "Auditor —
  audit-logs:read only", without also accidentally granting/blocking app tab access) · rejected:
  auto-defaulting an unassigned user to `employee` (silently grants grievance-submission access
  before anyone reviewed the account).
- 2026-09-02 Skipped `SessionExpiredDialog`/the `session-expired` `CustomEvent` mid-page-401
  mechanism the skill ships — **because** it exists specifically to catch a 401 from React Query
  (`query-provider`, part of the org design kit) mid-page; this app has neither React Query nor
  any other client-side data-fetching layer that could receive a 401 while the page stays open
  (every page reads `localStorage` directly, and the only session-gated calls are the new admin
  Server Actions, which already return a `{success:false, code:'UNAUTHORIZED'}` result the calling
  component surfaces itself) — `middleware.ts` (now `src/proxy.ts`, 2026-10-08) + the `(shell)` layout's server-side session check
  on every navigation cover the real case (an expired cookie on the next page load) · revisit if a
  later chunk adds client-side data fetching that can 401 while a page stays open.
- **[superseded 2026-10-08 — Next 16 upgrade, see below]** 2026-09-02 This project pins `next@^15.5.0` (not 16.x), so the auth-setup skill's `proxy.ts`
  asset was installed as **`src/middleware.ts`** (Next.js ≤15 filename/location; `proxy.ts` is a
  Next 16-only convention) — **because** on <16 Next.js never loads a file named `proxy.ts`, so
  keeping that name would silently disable all route protection with no error anywhere · revisit
  and rename to `proxy.ts` at the project root when/if this project upgrades to Next 16 (tracked
  alongside the `eslint-config-next` FlatCompat note above, which has the same trigger).
- 2026-09-02 The skill's interview (§3 in its SKILL.md) could not be run interactively — this
  session had no `AskUserQuestion` tool available (it runs as a delegated chunk, not the main
  interactive session) — every question not already answered by a standing decision or by
  `.claude/state/handoff.md` was decided by the installer using the "reasonable default, document
  it, keep going" rule from the session's Auto Mode guidance, and is recorded as its own มติ above
  rather than left as an open question — flag any of these back to the coordinator if they need to
  change.
- 2026-09-02 Installed `ugt-nextjs-mail-setup` (SMTP workflow email) **without** the org UI kit/
  next-intl the skill's assets assume — the admin editor at `/admin/mail-templates`
  (`src/app/(shell)/admin/mail-templates/page.tsx` + `src/components/MailTemplatesManager.tsx`) is
  hand-built Tailwind matching the app's existing pattern instead of shadcn
  `Card`/`Sheet`/`ConfirmActionDialog`, and skips the skill's `messages/mail.{th,en}.ts` i18n
  catalog entirely — **because** the standing 2026-09-02 decision to keep this app's hand-built,
  Thai-only design applies to new pages too (already recorded in `docs/DESIGN.md` §10,
  `docs/project-context/decisions.md`'s auth-setup entry) · rejected: installing next-intl just for
  this one page (would create a second, unused i18n substrate the rest of the app doesn't have) ·
  reset confirms via `window.confirm()` (matching `RolesManager.tsx`'s convention), preview renders
  in a centered overlay modal with a sandboxed iframe (matching `TrackingTimelineModal.tsx`'s
  pattern) instead of the skill's shadcn `Sheet`.
- 2026-09-02 The 5 mail template keys (`ticket.new_ticket`/`ticket.status_update`/
  `ticket.satisfaction_pending`/`ticket.direct_ceo_alert`/`ticket.sla_warning`) map 1:1 to
  `NotificationItem['type']` in `src/types.ts`, replacing the skill's generic
  request/approve/reject example — **because** this project already has a well-defined
  notification domain with its own in-app copy (`lib/actions/tickets.ts`'s `notifTitle`/`notifMsg`
  strings), so the email body reuses that exact text via `{{notificationTitle}}`/
  `{{notificationMessage}}` tokens instead of maintaining separate copy for in-app vs. email ·
  the skill's `auth.password-reset` key was dropped entirely (not just left unused) — this project
  is SSO (Keycloak) only, no local accounts to reset a password for (see the auth-setup entries
  above) · `ticket.sla_warning` is defined even though no code path creates that notification type
  yet (no SLA watcher/cron exists in this codebase) — kept for parity with the type already
  declared in `src/types.ts`, not a new feature being built this chunk.
- 2026-09-02 The mail-send hook is wired into `lib/actions/tickets.ts`'s `submitTicket`/
  `updateTicketWorkflow` (the Prisma Server Actions from the database chunk), not
  `src/services/api.ts` (the client-side localStorage functions every component actually calls
  today) — **because** `sendTemplatedMail` needs nodemailer + Prisma, both server-only, and
  `src/services/api.ts` is `'use client'`-adjacent code that runs in the browser · this means no
  real email goes out yet (documented as an open question, unchanged from the database chunk's
  unresolved call-site rewiring), but the wiring is correct and complete for the moment components
  switch from `api.ts` to these Server Actions · rejected: adding a duplicate mail-trigger path
  inside `src/services/api.ts` via a `fetch()` to a new Route Handler (would create two
  notification-creation code paths to keep in sync, and a client-triggered mail-send endpoint has
  no session to check `dev-mode:enable` against without also duplicating the auth guard) ·
  rejected: waiting to wire mail until the localStorage-to-Prisma rewiring happens (would leave
  this chunk with no concrete integration point to verify against, and every future chunk would
  face the same "where does X plug in" question).
- 2026-09-02 `/admin/mail-templates` follows every other `(shell)/admin/*` page's pattern of
  guarding itself inline (session → `syncPermissionsIfNeeded()` → permission check) rather than a
  shared `(admin)` layout, matching the skill's own note that this project has no such layout (see
  `admin/roles/page.tsx`, `admin/audit-logs/page.tsx`) — no new decision here, just confirming the
  established pattern extends to this page too.
- 2026-09-02 SMTP host, sender address, and the mail footer's support-contact text are
  **placeholders** in `.env.example`/`.env.local`/`lib/types/mail-templates.ts` for this chunk —
  same reasoning as the database and auth chunks' placeholder values: no real SMTP relay was
  available to provision against yet, and proceeding with placeholders keeps the chunk from
  blocking on Admin/IT turnaround · the email header color (`#4f46e5`, Tailwind indigo-600) was
  **not** left as a placeholder — it is decided directly from this project's existing primary
  color (`docs/DESIGN.md` §1), which email clients need as a literal hex regardless of a live
  relay · going live is filling in `SMTP_HOST`/`SMTP_FROM`/support-contact once Admin/IT returns
  real values (tracked in `docs/admin-handoff.md` §3 and `.claude/state/handoff.md`).
- 2026-09-02 Installed `ugt-nextjs-upload-setup` (real file attachments, replacing
  `Tickets.AttachmentsJson`) **without** the org UI kit/next-intl the skill's assets
  assume — `src/components/FileUpload.tsx` is hand-built Tailwind with hardcoded Thai
  error copy instead of the skill's `useTranslations('upload')` + `components/ui/button`/
  `ui/icon-action` asset, and skips the skill's `messages/upload.{th,en}.ts` catalog
  entirely — **because** the standing 2026-09-02 decision to keep this app's hand-built,
  Thai-only design applies to new UI too (already recorded for the auth-setup and
  mail-setup chunks above, `docs/DESIGN.md` §10) · this makes `verify.mjs`'s
  `messages/upload.*.ts` and i18n checks fail on purpose, same as the design-setup
  chunk's 18 intentionally-red checks · rejected: installing next-intl just for this one
  widget (would create a second, unused i18n substrate the rest of the app doesn't have).
- 2026-09-02 Attachment→record linking is a **real foreign key** (`Attachment.ticketId`
  required + `Attachment.timelineLogId` optional), not the skill's default polymorphic
  `entityType`/`entityId` pair — **because** reading `EmployeeSubmitForm.tsx` and
  `TrackingTimelineModal.tsx` confirmed this app has exactly one real owning type (a
  grievance ticket), attached at exactly two moments: the original submission
  (`timelineLogId = null`) and a later gatekeeper/employee inquiry note recorded as a
  `TicketTimelineLogs` row (`timelineLogId` set to that row). Per
  `references/attachment-linking.md`'s own guidance table ("one or two types, orphans
  unacceptable → a real FK"), a polymorphic pair bought no real flexibility here and
  would have let the database silently accept a `ticketId` that doesn't exist ·
  `ticketId` cascades on ticket delete (mirrors `ticketTimelineLog`/`ticketEvaluation`);
  `timelineLogId` is `NoAction` because SQL Server refuses two cascade paths reaching
  the same table (`Ticket → Attachment` directly, and `Ticket → TicketTimelineLog →
Attachment`) — timeline log rows are append-only and never deleted in practice, so
  this is a theoretical safety net, not a live path · rejected: the skill's default
  `entityType`/`entityId` shape (would leave the database unable to enforce that a
  ticket actually exists, and `canReadAttachment` would need a `switch` for a single
  case that will never grow a second branch).
- 2026-09-02 Virus scanning (ClamAV) is **installed** (`lib/virus-scan.ts`, fail-closed,
  org default since 2026-08-09) — **because** this project's own mail/upload decision
  above already anticipated ClamAV as required infra, and nothing about this project's
  infrastructure rules out the ~2 GB RAM / ~1 GB signature-DB download the skill warns
  about · **but the ClamAV Docker service itself is deferred** — `docker-compose.yml`,
  `docker-compose.dev.yml`, and `Dockerfile` don't exist yet in this project
  (`ugt-nextjs-cicd-setup` hasn't run), so the skill's compose+Dockerfile snippet
  (mount point, clamav service, signature-DB volume) cannot be applied this chunk.
  Tracked as a close-out step for immediately after `ugt-nextjs-cicd-setup` lands the
  Dockerfile — see `.claude/state/handoff.md` and `docs/admin-handoff.md` §4 · until
  then, `CLAMAV_HOST=clamav` in `.env.example` resolves to nothing and every real
  upload attempt fails closed with `SCANNER_UNAVAILABLE` (expected, not a bug).
- 2026-09-02 Max attachment size = **25 MB per file** (`UPLOAD_MAX_BYTES=26214400`) —
  **because** this matches both the skill's own default and the existing (fake)
  attachment UI copy already in `EmployeeSubmitForm.tsx` ("ขนาดไม่เกิน 25 MB"), so no
  user-facing expectation changes when the real upload path goes live · decided by the
  installer, not the user directly — this session had no `AskUserQuestion` tool
  available (same situation as the auth-setup chunk's interview, see that chunk's มติ
  above) · revisit with the user/Admin if 25 MB proves too small for real evidence
  files (e.g. video, multi-page scans).
- 2026-09-02 Reverse-proxy presence in production is **left unconfirmed** — this
  project's `docs/admin-handoff.md`/`handoff.md` already flag basePath/shared-domain as
  an open decision for `ugt-nextjs-cicd-setup` to resolve, and no answer exists yet to
  say whether a reverse proxy (nginx/traefik) will sit in front of this app · recorded
  in `docs/admin-handoff.md` §4 as guidance regardless of the answer: if one is added,
  its body-size limit (e.g. nginx `client_max_body_size`) must be raised to ≥25 MB to
  match `UPLOAD_MAX_BYTES`, or large uploads die at the proxy before this app ever sees
  them · decided by the installer (no `AskUserQuestion` tool available this session) —
  flag to the user/coordinator to confirm once the CI/CD chunk's deployment topology is
  known.
- 2026-09-02 Deleted attachments stay **soft-deleted only** (`Attachments.IsDeleted = 1`)
  — this is the org's non-negotiable pattern (`ugt-nextjs-upload-setup` SKILL.md §2 rule
  7), not a choice this project could opt out of · **no cleanup/retention job is
  installed this chunk** — the skill is explicit that background-job placement is an
  org-wide decision still pending (platform backlog), so this project cannot promise
  automatic deletion of the underlying bytes yet · the retention _duration_ (how long a
  soft-deleted attachment's bytes should be kept before a future job removes them) is an
  **open business/compliance question**, not decided this chunk — no `AskUserQuestion`
  tool was available this session to ask the user directly; flag to Admin/Compliance for
  when a retention job is actually built (tracked in `docs/project-context/board.md` and
  `.claude/state/handoff.md`).
- 2026-09-03 The ClamAV Docker service + storage bind-mount deferral recorded above
  (2026-09-02, "Virus scanning (ClamAV) is installed... but the ClamAV Docker service
  itself is deferred") is now **closed** — `ugt-nextjs-cicd-setup` applied
  `ugt-nextjs-upload-setup`'s own `assets/compose-and-dockerfile.snippet.md` verbatim
  as its own close-out step in the same chunk that created `docker-compose.yml`/
  `docker-compose.dev.yml`/`Dockerfile`, per that snippet's own instructions and the
  upload chunk's §4.4 note · both compose files now have a `clamav` service, the
  storage bind mount, and `depends_on: clamav: condition: service_healthy`; the
  Dockerfile creates `/app/storage` before dropping to the `nextjs` user; the
  Jenkinsfile's `[VOLUME]` step now prepares `storage`/`clamav-db` host directories for
  both prod and dev · `CLAMAV_HOST=clamav`/`CLAMAV_PORT=3310` in `lib/env.ts`'s
  defaults already matched the new service's name/port with no code change needed —
  `SCANNER_UNAVAILABLE ` should stop being the normal case once this stack is actually
  deployed (still expected locally/in dev without Docker running, and until real
  `DATABASE_URL`/other infra lands per the Open Questions in `handoff.md`).
- 2026-09-03 Resolved the shared-identity/basePath question `ugt-nextjs-cicd-setup`
  was explicitly holding open (see the upload chunk's `docs/admin-handoff.md` §4.1 and
  `.claude/state/handoff.md`): **project name `ugt-voicecare`** (already the de facto
  name — matches `package.json`'s `name` and the Keycloak Client ID chosen in the auth
  chunk), **no basePath** for both prod and dev — this app deploys standalone at the
  root path, not under a shared-domain reverse-proxy subpath — **because** every module
  built so far already assumed this (auth's Keycloak redirect URIs, `BETTER_AUTH_URL`,
  `NEXT_PUBLIC_BASE_PATH` defaulting to `''`, the "standalone" note already in
  `handoff.md`), and nothing in this project's requirements or admin-handoff answers so
  far calls for a shared org domain · this session had no `AskUserQuestion` tool
  available (same situation as every prior chunk's interview — see the auth chunk's
  entry above) so this and the following sibling decisions were made using the
  "reasonable default, document it, keep going" Auto Mode rule, using the overwhelming
  precedent already in the codebase rather than guessing blind · rejected: leaving
  basePath undecided again (the whole point of this chunk reaching the CI/CD skill's own
  interview was to force a real answer — deferring a third time serves no one). Ports:
  prod `3000`, dev `3001` — the skill's own defaults, and its `admin-handoff.template.md`
  already has a built-in "confirm the real port" follow-up row, so these are safe,
  clearly-flagged placeholders, not a real infra decision. App URLs (baked into the
  client bundle via `NEXT_PUBLIC_APP_URL`, unlike ports/basePath these have no
  established placeholder convention beyond `.env.example`'s own
  `BETTER_AUTH_URL="http://localhost:3000"`): prod `http://localhost:3000`, dev
  `http://localhost:3001` — mirrors that existing convention rather than inventing a
  fake domain nobody chose; the real prod host is requested back in
  `docs/admin-handoff.md` §5's "ค่าที่ต้องส่งกลับ" table (same row the auth chunk's §2
  already uses for the Keycloak redirect URI, so there is exactly one place the admin
  needs to answer this, not two). No Sentry — **because** no `@sentry/*` package exists
  anywhere in this project and nothing in the requirements/admin-handoff history asked
  for error tracking · rejected: installing Sentry speculatively "since the skill
  supports it" (adds a whole credential + build-arg surface for a capability nobody
  requested — revisit if/when the user actually wants it).
- 2026-09-03 Fixed the `__APP_HOST__` prose placeholder in `docs/admin-handoff.md` §2
  (added by the auth chunk, two occurrences) to `<app-host>` — **because** unlike
  `__KEYCLOAK_HOST__`/`__REALM__`/`__KEYCLOAK_CLIENT_SECRET__`/`__SUPPORT_CONTACT_EMAIL__`
  elsewhere in the same file (which are left alone — they are literal placeholder
  strings that genuinely exist in `.env.local`/`.env.example`/
  `lib/types/mail-templates.ts`, so rewriting them would misrepresent the real code),
  `__APP_HOST__` was never a real env var or code placeholder — just illustrative prose
  — and its `__X__` shape collides with `ugt-nextjs-cicd-setup`'s `verify.mjs` check
  that the rendered admin-handoff has no unfilled installer placeholders left ·
  rejected: leaving it as-is and accepting a 5th intentionally-red verify.mjs line item
  (the other four are genuine, this one was a free, zero-risk fix since it doesn't
  touch any value the auth chunk actually decided).
- 2026-09-03 `src/app/api/health/route.ts` was **extended in place**, not replaced with
  `ugt-nextjs-cicd-setup`'s generic `assets/api-health-route.ts` — added a real
  `checks.database` (`prisma.$queryRaw\`SELECT 1\``, 200 on success/503 on failure) and
switched the top-level `status`literal from the upload chunk's`'ok'`to the org-wide
contract`'healthy'`/`'degraded'`— **because** the skill's own asset would have
silently dropped`aiAvailable`/`scanAvailable`, both real, load-bearing fields the
upload chunk added and this project's `/api/health`consumers (admin/monitoring)
already rely on, and the previous route never checked the database at all (always
200), which is a real gap against the org contract now that this is genuinely going
through a Docker-healthcheck-gated deploy pipeline · consequence, called out
explicitly rather than left to be rediscovered as a surprise: this endpoint now
returns 503 while`DATABASE_URL`is a placeholder, so the Jenkins Deploy stage's
health poll will not succeed until real SQL Server values land — not a new blocker,
since the`prisma migrate deploy`step immediately before it in the same stage was
already going to fail first for the identical reason · rejected: leaving`status`hardcoded to`'ok'`/no DB check (keeps a health endpoint that lies about the database
being reachable, defeating the point of wiring it into `docker-compose`'s
`healthcheck:`) · rejected: dropping `aiAvailable`/`scanAvailable`to match the
skill's asset shape exactly (removes real information for no benefit — the org
contract only mandates the`status`/`checks` shape and forbids version/commit
  leakage, it does not forbid additional fields).
- 2026-09-03 `sonar.sources`/`sonar.tests` in `sonar-project.properties` are
  `src/app,src/components,src/services,lib`, not the skill's generic
  `app,components,lib,hooks` default — **because** this project has no root-level
  `app`/`components`/`hooks` directories (Next.js only reads `src/app/` here, per the
  Phase A migration), and `sonar-scanner` hard-fails instantly on a listed path that
  doesn't exist · matches `vitest.config.ts`'s own `coverage.include` list exactly
  (`src/app/**`, `src/components/**`, `src/services/**`, `lib/**`) so coverage and
  static-analysis scope agree · rejected: using the skill's literal default paths and
  letting the first `sonar-scanner` run hard-fail (would make the SonarQube Analysis
  stage red on the very first pipeline run for a reason unrelated to code quality).
- 2026-09-02 `FileUpload.tsx`/`/api/files`/`/api/files/[id]` are built correctly and
  completely this chunk, but **not wired into `EmployeeSubmitForm.tsx` or
  `TrackingTimelineModal.tsx`** — both keep their original `Math.random()` fake-
  attachment simulator exactly as before, unchanged · **because** this follows the same
  scoping decision the mail chunk already made and recorded above: the real upload path
  needs a real `ticketId` from a Prisma `Tickets` row, and no component calls the Prisma
  Server Actions yet (`src/services/api.ts`'s localStorage functions are still what
  every component actually calls — unresolved since the database chunk, see Open
  Questions in `.claude/state/handoff.md`) · wiring the widget into a component that
  still generates client-only fake ticket ids would mean either faking the `ticketId`
  too (silently reskinning/rebehaving a page the project's design rules forbid without
  asking) or leaving the widget half-functional in a way that's worse than the existing,
  honest simulator · rejected: wiring it anyway with a TODO (the "never silently
  reskin/rebehave an existing page" rule applies here — a real upload button that only
  works after an unrelated future rewiring is a worse trap than the current simulator).
- 2026-09-02 Asset destinations follow this project's existing `src/` layout, not the
  skill's literal defaults: `src/app/api/files/route.ts` /
  `src/app/api/files/[id]/route.ts` (not root `app/api/files/**`) and
  `src/components/FileUpload.tsx` (PascalCase, not `components/file-upload.tsx`) —
  **because** every other Route Handler and component in this project already lives
  under `src/` (Phase A migration), and `lib/*` alone stays at the repo root per the
  database chunk's own asset-destination decision above — matching that precedent keeps
  one consistent rule ("`lib/` at root, everything else under `src/`") instead of two
  different root-vs-`src/` splits for different skill outputs. This project has **no**
  root-level `app/` or `components/` directory at all (Next.js only reads `src/app/`
  here) — creating one to satisfy the skill's literal paths would give Next.js two
  parallel App Router trees, which is a hard error, not a style choice · consequence:
  `ugt-nextjs-upload-setup`'s `verify.mjs` shows red on every check with a hardcoded
  `app/api/files/**`/`components/file-upload.tsx` path (`Core files present`, `Scan
happens BEFORE the file is written`, `Scanner failure fails closed`, `Paths never come
from the uploaded filename`, `Download route guards session + permission + record
scope`, `Download serves as an attachment, never inline`, `Forbidden and missing both
answer 404`) plus the two `messages/upload.*.ts` i18n checks from the deviation above —
  9 of verify.mjs's 16 checks are expected to stay red for this project, same as the
  design-setup chunk's 18 intentionally-red checks; the real files exist and are correct
  at their `src/` locations, verified by hand and by `npm run build`/`lint`/`test`
  instead.
- 2026-09-03 Harness pipeline bundle = **mattpocock** (`ugt-nextjs-standard-mattpocock@ugt`
  in `.claude/settings.json`, matching `[PIPELINE:mattpocock]` spans kept in `CLAUDE.md`) —
  **because** this session's environment has `mattpocock-skills` commands/skills available
  and no `superpowers` skills at all, which is the documented detection signal in
  `ugt-nextjs-full-setup`'s own instructions · rejected: asking the user to confirm (the
  skill's own rule is to ask only when detection is ambiguous — both present or neither;
  here it wasn't ambiguous).
- 2026-09-03 Wrote `.claude/rules/ugt-nextjs-auth.md` by hand instead of re-running the
  auth-setup skill to regenerate it — **because** the auth chunk's own work (schema,
  Server Actions, pages, middleware) was already correct and verified; the only gap was the
  rule file itself, and re-running the whole skill risked touching already-correct,
  already-verified code for a documentation-only fix · rejected: leaving the gap
  (`ugt-nextjs-full-setup`'s own harness step explicitly requires "verify each installed
  module's child skill wrote its rule file" — this is not optional cleanup, a missing rule
  file means future sessions never get the auth-specific guidance loaded when touching
  those paths).
- 2026-09-03 Pruned `.claude/state/handoff.md`'s Done section from ~225 lines (one very
  detailed paragraph per chunk) to condensed one-liners for everything before the CI/CD
  chunk — **because** this file is imported into every session via `CLAUDE.md` and the
  skill's own guidance caps it at ~60 lines; the detail those paragraphs held is not lost,
  it lives in git commit messages (one commit per chunk) and this file's own git history ·
  rejected: leaving it as-is (defeats the purpose of an always-loaded file — a session
  reading 225 lines of history before doing any work is the exact waste the ~60-line
  guidance exists to prevent).
- 2026-09-03 Directory enrichment (`lib/directory.ts`/`lib/approval-chain.ts`/`lib/scope.ts`,
  the auth-setup skill's org-employee-view-over-linked-server layer) will **not** be
  installed, even though the skill's own default for org apps is "yes" — **because** a full
  code audit found zero current consumers: `EmployeeSubmitForm.tsx`'s
  `submitterEmployeeId`/`submitterDepartment` are free-text self-report fields (not a
  lookup), there is no supervisor/reportsTo/approval-chain concept anywhere in the domain
  model, `GatekeeperOfficers`/`ExecutiveMembers`/`HrAdminMembers` are small hand-curated
  rosters (not "all employees"), and "My Tickets" doesn't even scope by session identity
  yet. Installing it now would be speculative infrastructure (a linked server, a DBA SELECT
  grant, three new lib files) with nothing in the app to consume it · rejected: installing
  it anyway "since the org default is yes" (the org default is a starting assumption for a
  generic org app, not a requirement independent of what this specific app actually does) ·
  revisit if a real feature need appears (e.g. auto-filling submitter department from HR
  instead of asking the employee to type it).
- 2026-09-03 The `src/services/api.ts` → `lib/actions/*` (localStorage → Prisma) rewiring
  is **explicitly deferred until a real SQL Server exists** (not merely unscoped/unstarted
  as prior chunks left it) — **because** unlike every other chunk's infrastructure (which
  sits unused until called), rewiring component call sites means every page load
  immediately depends on a live `DATABASE_URL`; doing this against the current placeholder
  connection would break the entire app with no fallback path, destroying the only thing
  that's currently browser-verifiable end to end · rejected: rewiring now and accepting a
  broken app until DBA delivers (no way to verify correctness in the meantime, and every
  future chunk's own browser verification step would be meaningless) · rejected: standing
  up a local/Docker SQL Server specifically to unblock this now (user declined when asked —
  chose to wait for the real one instead). A full file-by-function audit of what still
  needs rewiring is recorded in `.claude/state/handoff.md` → Next, ready to execute as soon
  as `DATABASE_URL` is real.
- 2026-10-08 Upgraded `next` and `eslint-config-next` from 15.x to the 16.x line together —
  **because** no reason for pinning 15 was ever recorded (Phase A just picked it, and the two
  later entries above only worked around the pin), and doing the framework bump now, before
  the `src/services/api.ts` → `lib/actions/*` rewiring, keeps a framework regression and a
  data-layer regression separable (same reasoning as Phase A's port-first split). Supersedes
  both 2026-09-02 entries marked above: `eslint.config.mjs` now imports
  `eslint-config-next/core-web-vitals` + `/typescript` flat configs directly (`FlatCompat` and
  `@eslint/eslintrc` removed), and the route guard is `src/proxy.ts` exporting `proxy()`
  (Next 16 convention; nodejs runtime only; lives under `src/` beside `src/app`, not the repo
  root, because this project uses the `src/` layout) · rejected: staying on 15.x with security
  backports — no blocker to upgrading existed and the gap only grows.
- 2026-10-08 **Port upstream (`pisanu90853-cmd/UGTVoice-platform`, commits `8d885a3` +
  `d20ca0b`) into this Next.js app** — `origin` is a GitHub fork of that repo, now added as
  git remote `upstream`; the original author keeps developing the AI Studio app, and this
  project must stay functionally (logic + UX/UI) equal to it. Ported by hand, not
  `git merge`: Phase A reformatted every file and `App.tsx`/`server.ts`/`main.tsx` no longer
  exist here. Order: (1) shared layer — 9→6 categories, SLA removed system-wide, new ticket
  fields, `LanguageContext`, `employeeDirectory`, AI `suggest-category` + model fallback,
  shell — plus matching Prisma schema / `lib/actions` changes so the build stays green;
  (2) employee UI, gatekeeper/executive UI, admin UI in parallel. Our recorded deviations
  stay (SSO identity instead of the role switcher, admin RBAC tabs, `src/app/api/*` routes,
  lint/Sonar typing, `safeStorage`). Every upstream behaviour change is taken as-is unless
  one of the three decisions below says otherwise.
- 2026-10-08 **UI becomes bilingual TH/EN** (user decision, reverses DESIGN.md §10
  "ไทยล้วน" 2026-09-02) — port upstream's hand-rolled `src/context/LanguageContext.tsx`
  (`useLanguage()`, `t()`, `lang === 'en' ? … : …`, default `th`, preference in
  localStorage) as-is — **because** parity with upstream is the goal and a second
  translation substrate would make every future upstream port a rewrite · rejected:
  `next-intl` (org default) — would diverge from upstream's code shape on every string.
  Revisit only if upstream itself moves to a catalog.
- 2026-10-08 **Employee directory = HR view (target), upstream mock (now)** (user
  decision) — port upstream's `src/services/employeeDirectory.ts` API
  (`mapLoginEmailForTicket`, `getCurrentLoginEmployee`, `EMPLOYEE_DATABASE`) unchanged for
  parity; its data source is to be replaced by a read-only HR employee view (linked server /
  view, via `ugt-nextjs-database-setup`'s linked-server pattern) once DBA provides it —
  requested in `docs/admin-handoff.md` §1.4. Supersedes the 2026-09-02 "no central employee
  directory" stance and the earlier review suggestion to use `session.user.email` only.
- 2026-10-08 **Email notification settings follow upstream's `AdminEmailNotificationSettings`**
  (user decision: "make ours like the original") — the admin email page becomes upstream's
  UX: sub-tab `email_notifications` inside Gatekeeper management, `masterEnabled`, two
  triggers `onTicketSubmitted` (→ category Lead Gatekeeper `leadOfficer.email` /
  `escalationEmail`) and `onTicketResolved` (→ submitter), each `{enabled, subject, body}`
  with single-brace `{token}`s, live preview, test send, dispatch log. Ported first with
  upstream's localStorage storage (same as every other page until the DB rewiring); at the
  rewiring, settings move to `AppSettings`, dispatch goes through `lib/email.ts` SMTP from
  `lib/actions/tickets.ts` (the 2026-09-02 "mail hook lives in Server Actions" rule still
  holds), and `/admin/mail-templates` + the 5 `NotificationItem['type']`-keyed templates are
  retired in favour of this page · rejected: keeping our template editor and only borrowing
  ideas (user wants upstream's behaviour).
- 2026-10-08 **No shadow database; separate `UGT_VoiceCare_DEV`** — databases are
  `UGT_VoiceCare` (prod, `main`) and `UGT_VoiceCare_DEV` (dev, `develop` + local), the org
  naming used by sibling projects; the project owner creates both himself and never
  provisions a shadow DB. Migrations keep being generated offline (`prisma migrate diff`
  schema→schema, as every migration so far was) and applied with `prisma migrate deploy`;
  `prisma migrate dev` is not part of the workflow · cost: no automatic drift detection —
  never hand-edit tables · rejected: `UGT_VoiceCare_Shadow` (unneeded with the offline
  workflow).
- 2026-10-08 **Database names are `UGT_VoicePlatform` (prod) / `UGT_VoicePlatform_DEV` (dev)**
  (owner decision) — replaces the `UGT_VoiceCare` / `UGT_VoiceCare_DEV` names in the entry
  above; everything else in it (no shadow, offline migrations) stands. The app/project id
  stays `ugt-voicecare` (Jenkins jobs, SonarQube keys, Keycloak client, Docker paths).
- 2026-10-08 **Upstream port, phase 1 (shared layer) landed — deviations from a literal copy** —
  (a) `ticket.sla_warning` mail template/key dropped with the `sla_warning` notification type
  (`NotificationItem['type']` lost it upstream); the 2026-09-02 mail-setup entry that kept it
  "for parity" is superseded · (b) upstream's two category-keyword lists (`server.ts`: 7 rules; `api.ts` client
  catch-path: the last 5 of those) live in one module, `src/services/categoryHeuristics.ts`,
  as `SERVER_ONLY_RULES` + `SHARED_RULES` — each consumer keeps exactly upstream's behaviour
  (server fallback = both lists, client fallback = shared only; `ฮั้ว`/`พูดจาดูถูก` are
  server-only); rule order is preserved within each list ·
  (c) Gemini helpers live in `lib/gemini.ts` (typed `unknown` errors, throws a real `Error` if
  every model returns empty text) instead of inline in each route · (d) `navigateTab()` exempts
  the four RBAC-permission `admin_*` tabs from the `allowedTabs` check · (e) Prisma migration
  `20261008000000_port_upstream_p1` drops SLA columns (**intended data loss**: `SlaTargetHours`/
  `SlaDueDate`/`SlaStatus`/`DefaultSlaHours`), adds `LoginEmail`/`IsAnonymousMapped`/
  `CanViewAnonymousSubmitterEmail` and `TicketAnonymousMessages`, and starts with a hand-written
  data step mirroring upstream's localStorage migrations: Environment → Compliance (+
  `GatekeeperDepartment`), IT/Safety tickets soft-deleted (upstream discards them with its v5 key
  bump), retired gatekeeper configs/officers soft-deleted, retired categories stripped from
  `RoleAccessConfigs.AssignedDepartmentsJson`, `sla_warning` notifications + its
  `AppSettings` template override removed, new flag defaulted on for executive/admin ·
  (f) `lib/actions/tickets.ts` `sendAnonymousChatMessage` has the full session → permission →
  action → audit chain (permission = caller's `user.appRole` equals `senderRole`, employees only
  on their own ticket; audit `tickets.chat-send` never logs the message body) and runs in one
  `prisma.$transaction`; `submitTicket` resolves `loginEmail` in upstream's order (explicit →
  directory by employee id → submitter email → session email in place of the mock "current login
  employee") · rejected: copying upstream files verbatim (would re-add `any`, duplicated rule lists
  and SSR-unsafe `localStorage` access).
- 2026-10-09 **App/project id is `ugt-voice-platform`** (owner decision; matches the repo
  name) — replaces `ugt-voicecare` everywhere it was an identifier: `package.json` name,
  Jenkins job + Secret File credentials (`env-ugt-voice-platform[-dev]`), SonarQube project
  keys, Docker image/container names, `/home/docker02/appdata/ugt-voice-platform[-dev]` paths,
  Keycloak client id, SQL login suggestion `ugt_voice_platform_app`. Supersedes the
  2026-09-02 "project name `ugt-voicecare`" entry and the id remark in the database-name entry
  above. Unchanged: display name "UGT VoiceCare" and upstream's localStorage keys
  (`voicecare_*`, kept for parity).
- 2026-10-09 **Deployed under a basePath on the shared org domain** (owner decision) —
  prod `https://ugtweb.ube.co.th/ugt-voice-platform`, dev
  `https://ugtweb.ube.co.th/ugt-voice-platform-dev`, same pattern as every other org project.
  **Supersedes** the "no basePath / standalone" parts of the 2026-09-02 auth entry and the
  2026-09-03 CI/CD entry — those were installer defaults taken without asking (no
  `AskUserQuestion` in those runs), not owner decisions. Wiring: `next.config.ts`
  `basePath` from `NEXT_PUBLIC_BASE_PATH` (empty locally), Jenkinsfile build args per branch,
  compose/Dockerfile healthchecks under the basePath, client `fetch`/tracking URLs in
  `src/services/api.ts` prefixed (`BASE_PATH` from `@/lib/env`), `(shell)/layout.tsx` uses
  `next/link`. Env: `BETTER_AUTH_URL` and `APP_URL` stay the **bare origin**
  (`https://ugtweb.ube.co.th`) — auth and email links append the basePath themselves.
  Keycloak redirect URIs + reverse-proxy routing requested in `docs/admin-handoff.md` §2/§5.5.
- 2026-10-09 **No virus scan / no ClamAV** (owner decision) — the upload skill's opt-in
  `[SCAN]` is turned **off** (its own default; the 2026-09-02 install had switched it on as
  an installer default, not an owner choice). Removed: `lib/virus-scan.ts`, the scan step in
  `src/app/api/files/route.ts` (rows now `scanStatus: 'unscanned'`), `FILE_INFECTED`/
  `SCANNER_UNAVAILABLE` codes, `files.upload-rejected` audit action, `scanAvailable` in
  `/api/health`, the `clamav` service + `depends_on` + `clamav-db` bind in both compose files
  and the Jenkinsfile `[VOLUME]` loop, `CLAMAV_*` env. Download now blocks only
  `scanStatus === 'infected'` (skill default). Kept: storage volume, guarded download,
  `application/octet-stream` + `attachment` + `nosniff`. Schema columns
  (`ScanStatus`/`ScanSignature`/`ScannedAt`) kept unchanged — no migration needed, and they let
  scanning be switched back on later. Supersedes the virus-scan parts of the 2026-09-02 upload
  entries and the 2026-09-03 CI/CD ClamAV wiring.
- 2026-10-09 **Product name is "UGT VoicePlatform"** (owner decision) — every "VoiceCare"
  becomes "VoicePlatform": display/app name (`NEXT_PUBLIC_APP_NAME`, Jenkinsfile, Dockerfile,
  SonarQube project names, mail templates, layout metadata, UI strings), localStorage keys
  `voicecare_*` → `voiceplatform_*` (only a language preference + the mock login employee are
  lost on first load), project rule files `ugt-voice-platform-*.md`. Not rewritten: earlier
  entries in this file (append-only) and comments inside already-generated migrations.
- 2026-10-09 **HR views confirmed** (owner provided; DEV probe OK with the app's DB login):
  employee directory = `[thrygsd002].[ICTPortal_PRD].[dbo].[vwHR_SC_Employee]` (550 rows, all
  `workstatus = 'Active'`; match SSO users on `CurrentEmail`, fallback `ADLoginName`; fields
  `EmpCode`, `FullNameThai/Eng`, `PostNameEng`, `OrgNameThai`/`OrgTDesc1..5`, `superempcode`);
  approval chain = `[thrygsd002].[ICTPortal_PRD].[dbo].[HR_SC_AuthorizeEmployee_ms]`
  (`EmpCode`, `SuperEmpCode`, `Seq`, `Special`, …) — **not used yet** (owner: VoicePlatform has
  no approval step; recorded so `lib/approval-chain.ts` can be installed when a workflow needs
  it). Next: install `ugt-nextjs-auth-setup`'s `lib/directory.ts` against the employee view and
  swap `src/services/employeeDirectory.ts`'s mock for it during the localStorage → Server
  Action rewiring (after the upstream Phase 2 merge). Supersedes the "mock now" part of the
  2026-10-08 employee-directory entry.
- 2026-10-09 **Upstream phase 2 merged with behaviour-preserving Sonar refactors** — upstream code
  ported verbatim would fail the gate (nested ternaries, index keys, cognitive complexity,
  duplication), so 2A/2B/2C restructured it (lookup maps, sub-components, `workflow-manual/*`,
  `export-analytics/*`, `ConfirmDialog`) while keeping UI, TH/EN strings and conditions identical
  — **because** CLAUDE.md requires the first scan to pass · rejected: `sonar.cpd.exclusions` /
  NOSONAR on whole files. Two deliberate UX deltas vs upstream: `GatekeeperInbox`/
  `ExportAnalyticsModal` `alert()` → in-app inline notice (same text), and the investigation
  report actually prints (upstream's print clipped to one viewport). In-app `ConfirmDialog`
  supersedes the 2026-09-02 "destructive deletes use `window.confirm()`" rule. Where upstream is
  Thai-only (GatekeeperInbox, RBAC, admin gatekeeper) ours stays Thai-only (parity over the i18n
  rule).
- 2026-10-09 **Deploy dev by pushing `develop`; prod (`main`) left to the owner** — Jenkins jobs
  `ugt-voice-platform[-dev]` poll GitHub (webhook not reachable from the internal network), so a
  push is the deploy trigger · rejected: pushing `main` overnight (prod DB never migrated, app
  still connects as `sa`).
- 2026-10-09 **Upstream parity re-verified page by page; two UX deltas reverted** — an automated
  jsdom harness rendered our shell for every role × tab × TH/EN (+ dashboard, tracking modal, chat,
  CSAT, email settings) and diffed visible text against text captured from the running upstream
  app: identical except the owner-sanctioned product name and the SSO identity menu (no
  role-switch buttons). Reverted to upstream behaviour: blocking `alert()` again in
  `GatekeeperInbox`/`ExportAnalyticsModal` (supersedes the "inline notice" delta above; Sonar S1442
  is not in the server profile) and the identity button shows the role label like upstream's role
  button (name/email stay in the menu). Kept: the investigation report prints the full document
  (upstream clipped to one viewport — a bug, not a design). Dependency hardening: `nodemailer`
  9 → 10 (`lib/email.ts` type import), npm `overrides` `deepmerge-ts` ^8 / `mysql2` ^3.24.5;
  remaining npm-audit highs are only `eslint-config-next`'s dev-tool chain (`braces` has no fix).
- 2026-10-09 **One permission system: the upstream RBAC page** (owner decision) — supersedes the
  2026-09-02 "two RBAC systems kept deliberately separate" entries. `admin_users` and
  `admin_audit_logs` are now ordinary `APP_TABS` rows in the upstream `RoleAccessConfigs.allowedTabs`
  matrix (`src/services/api.ts`; admin gets them by default, one-time localStorage migration
  `withSsoAdminTabs`). Retired: `/admin/roles` (`RolesManager`, `lib/actions/admin-roles.ts`) —
  duplicated the RBAC page — and `/admin/mail-templates` (`MailTemplatesManager`,
  `lib/actions/admin-mail-templates.ts`) — duplicated the upstream email-notification sub-tab.
  Server-side checks keep calling `getUserPermissions()`, which now derives keys from
  `user.appRole` (`permissionsForAppRole`: admin = all, other roles = `files:create`/`files:read`,
  none = []); `/admin/users` sets only the app role and refuses changing your own. The
  `Role`/`Permission` tables stay only for the `/admin/setup` bootstrap (`isAdminInitialized`).
  Interim limit: the RBAC matrix (still localStorage) drives menus; server guards follow the app
  role until the DB rewiring lets them read `RoleAccessConfigs` · rejected: keeping both systems
  (two places to grant access, duplicate screens).
- 2026-10-09 **DB rewiring slice 1: tickets + notifications live in SQL Server; ShellContext +
  `router.refresh()` pattern** (coordinator design) — `src/app/(shell)/layout.tsx`
  loads, per request, the signed-in user's visible tickets (`lib/ticket-access.ts`
  `listVisibleTickets`), the notifications of those tickets, `RoleAccessConfigs` and
  `DepartmentGatekeeperConfigs` and passes them to `Shell` (`data` prop → `ShellContext`);
  components read role permissions / gatekeeper configs from `useShell()` instead of
  `getStored*()`. Mutations call the Server Actions in `lib/actions/tickets.ts|notifications.ts`,
  then `router.refresh()`; only notification read-marks are optimistic (`useOptimistic`), and the
  tracking modal shows the ticket the action returns. Removed from `src/services/api.ts`: ticket +
  notification localStorage (`getStoredTickets` … `submitEvaluation`, keys `_tickets_v5` /
  `_notifs_v3`). Server-side scope = `lib/ticket-scope.ts` (business-rules.md) — out-of-scope
  tickets answer "not found", never "forbidden". The old notification-type workflow mail hooks
  (`sendNotificationMail` → `ticket.*` templates) were removed from `tickets.ts`: upstream's
  simulated dispatch log stays client-side (`logTicketSubmittedEmail`/`logTicketResolvedEmail`
  after the action) and slice 3 adds real delivery per the upstream settings model — because
  `.env.local` has a real `SMTP_HOST` and the old hooks would have mailed seed addresses with
  rules nobody chose · rejected: client-side SWR/React Query cache (a second data layer to keep in
  sync; refresh re-runs one server render) · rejected: keeping the RBAC/gatekeeper reads on
  localStorage until slice 2 (server scope and menus would disagree). Interim until slice 2: the
  RBAC / gatekeeper-officer editors still save to localStorage, so their edits no longer change
  menus, inbox scope or triage officer lists (those now come from the DB seed). Role + scope sit
  behind one helper, `resolveViewer(session)` in `lib/ticket-access.ts` (role, RBAC config,
  `gatekeeperCategories`), used by the layout and every ticket check, so the roster decision below
  is a one-function swap in slice 2.
- 2026-10-09 **App role comes from the people rosters, not a per-user dropdown** (owner
  decision) — supersedes the `/admin/users` app-role dropdown part of the "One permission
  system" entry above. Three layers: (1) _who_ = HR view `vwHR_SC_Employee` (read-only, search
  only); (2) _role_ = the three rosters the upstream Gatekeeper-management page already has —
  in `HrAdminMembers` (active) → `admin`, in `ExecutiveMembers` (active) → `executive`, in
  `GatekeeperOfficers` of any category → `gatekeeper`, anyone else who can log in via SSO
  → `employee` (incl. people not in the HR view, e.g. contractors); highest wins
  (admin > executive > gatekeeper > employee); matched on the session email (view
  `CurrentEmail`, fallback `ADLoginName`) and resolved on every page load, so a role can be
  granted before the person's first login and takes effect on their next navigation;
  (3) _what the role may do_ = the RBAC page matrix (`RoleAccessConfigs`), unchanged.
  UX stays upstream's: the "name" field in the four roster forms (GK officer, executive —
  both sub-tab and RBAC-page box — and HR admin) becomes an HR-view search that fills
  name/email/position/department (email locked when picked); "กรอกเอง" stays for outsiders
  (badge "ไม่อยู่ใน HR", mail only — no SSO); rows whose person is no longer Active in the
  view get a warning badge. Gatekeeper category scope = categories where the person is an
  officer ∩ the RBAC page's role-level `assignedDepartments` checkboxes (kept as a ceiling /
  master switch; roster rows in a disabled category get a warning badge); the inbox chips
  show only that set. `/admin/users` becomes read-only (role + source roster). `/admin/setup`
  adds the first admin to `HrAdminMembers` (Super Admin, details from the HR view). Guards:
  cannot remove/deactivate yourself or the last active HR admin. HR-admin `roleLevel` and
  `canManage*` flags stay informational, as upstream (option ก) — revisit if admin duties must
  be split. RBAC page's employee table reads the HR view (search + paging, still read-only).
  Lands with the localStorage → Server Action rewiring (rosters must be read from the DB) ·
  rejected: per-user role dropdown (only users who already logged in, and a second source of
  truth beside the rosters); dropping the RBAC category checkboxes (diverges from upstream).
- 2026-10-09 **Roster roles as built (rewiring slice 2)** — role resolved in `resolveViewer` on every
  request (React `cache` per request, no cross-request cache) so roster edits apply on the next
  navigation; server permission keys follow the RBAC tabs (`permissionsFor`), `users:update` is
  never granted; HR-admin reset keeps the caller's own row (the demo admins have placeholder
  emails — a plain reset would lock everyone out); `User.AppRole` is left in the schema but unread
  (drop it in a later migration once prod has run the data migration) · **because** a cross-request
  cache would delay revocations and the reset/lock-out rules must hold on the server, not only in
  the upstream UI · rejected: storing the resolved role back into `User.AppRole` (a second source
  of truth that goes stale).
- 2026-10-09 **Submit form prefill = the signed-in person's HR profile** (`ShellIdentity.employee`,
  SSO name/email when not in the HR view); upstream's demo "pick an employee" chips become one chip
  for the signed-in person · **because** with real SSO the four demo employees put someone else's
  name/employee id on a real ticket · rejected: keeping the demo chips (wrong identity on tickets).
- 2026-10-09 **`/login` "already signed in" redirect lives in the login page, not `src/proxy.ts`** —
  the page checks the real session · **because** the proxy only sees cookie presence, and a stale
  cookie looped `/ → layout → /login → proxy → /` forever · rejected: a DB session check in the proxy
  (runs on every request — see `.claude/rules/ugt-nextjs-auth.md`).
- 2026-10-09 **Lock-out rules are pre-checked in the UI as well as enforced on the server** — the
  roster screens check "yourself" / "last active HR admin" before calling the action (same toasts
  as upstream style) · **because** production Next.js replaces thrown Server Action messages with a
  generic error, so codes like `LAST_ADMIN` never reach the client · rejected: returning
  `{ ok, code }` results from every roster action (bigger change to the upstream call sites).
- 2026-10-09 **Attachments follow ticket visibility** — `canReadAttachment` = `resolveViewer` +
  `findVisibleTicket`, used for download AND upload (`src/app/api/files`) · **because** the old rule
  read the now-unused `User.AppRole` and uploads only checked that the ticket existed (anyone could
  attach to another person's ticket) · rejected: a separate attachment rule set (drifts from the
  ticket scope).
- 2026-10-09 **SQL Query Studio = five server-side preset reports, no free SQL** (rewiring slice 5,
  `lib/reports.ts`) — upstream's five example queries become `category_pareto`,
  `in_progress_tickets`, `csat_by_category`, `root_cause_breakdown`, `direct_to_executive`; Prisma
  only, scoped by `ticketScopeWhere(viewer)`, admin only (mirrors the Navbar export button);
  `runReport` returns `{ ok, error }` instead of throwing (prod masks thrown messages). sql.js, the
  CDN WASM fetch and the `.sqlite` import/export format are removed (they worked on a stale,
  partial browser copy) · **because** free SQL against SQL Server was already ruled out and the
  browser copy no longer holds the real data · rejected: raw `$queryRaw` reports (no need at this
  volume), extra reports upstream never had.
- 2026-10-09 **Email notifications delivered server-side (rewiring slice 3)** — settings JSON in
  `AppSettings` (`email.notification-settings`), attempts logged in the new `EmailDispatchLogs`
  table (column `TriggerEvent` — `Trigger` is reserved); `lib/email-notifications.ts` mails after
  the ticket transaction commits, never awaited, never failing the save; delivery via the new
  `sendRenderedMail` in `lib/email.ts` (admin writes the whole message, so the fixed
  `sendTemplatedMail` chrome would duplicate the greeting/footer; dev-mode rule kept) · resolved
  mail only on the transition into `resolved` (upstream re-mailed on every later note); no
  invented recipients (upstream made up `*-gatekeeper@enterprise.co.th` — now a `failed` log);
  test send goes to the signed-in admin only · privacy: neutral labels for anonymous /
  confidential_restricted submitters in gatekeeper mail, anonymous addresses never shown in logs,
  direct-to-executive tickets not mailed to gatekeepers who may not see them · **because** real
  delivery must not leak what the inbox hides and must not break saving when SMTP is down ·
  rejected: new `MailTemplateKey` templates (double greeting), raw `sendMail` (loses dev mode).
- 2026-10-09 **Mail dev mode only on the dev environment** — `dev-mode:enable` is granted to admin
  only when the basePath ends with `-dev` (`permissionsFor`) · **because** dev mode redirects every
  workflow mail to whoever triggered it, so in production an HR admin resolving a ticket would
  never mail the submitter · rejected: a dedicated tester role (no roster for it yet).
- 2026-10-09 **Notification read state is per person** (`NotificationReads`, migration
  `20261009150000_notification_reads`) — one row per (notification, user); `Notifications.IsRead`
  is legacy (seed only) · **because** upstream's single shared flag let a gatekeeper's "mark all
  read" clear the employee's badge · rejected: keeping the shared flag. `NotificationId` is a loose
  `NVARCHAR(100)` reference without FK (notifications are never hard-deleted, and the unique index
  must stay under SQL Server's 1700-byte key limit).
- 2026-10-09 **`User.AppRole` dropped** (migration `20261009140000_drop_user_app_role`, runs after the
  roster data migration that copied `AppRole=admin` users into `HrAdminMembers`) · **because** the
  role comes from the rosters and an unread column invites someone to trust it again.
- 2026-10-09 **Email review fixes** — dev mode is granted to **every** role on the dev environment
  (not only admin), so no QA action on dev mails a real person; the resolved mail goes to the
  signed-in submitter's `loginEmail` first (a typed `submitterEmail` only for legacy rows, and it
  must be one plain address); the dispatch log keeps the body only for `sent` rows and is readable /
  clearable by HR admins only; mail links land on `/gatekeeper` (staff) or `/my-tickets`
  (submitter) — upstream's `#tracking=` hash was read by nothing · **because** the review found a
  client-chosen recipient, real mail from non-admin testers on dev, and withheld ticket text
  readable through the log.
- 2026-10-09 **Real attachments (rewiring slice 4)** — the submit form keeps the chosen files in
  the browser and uploads them to `/api/files` once `submitTicket` returns the id
  (`lib/upload-client.ts`); a failed upload never loses the ticket (failure notice + retry on the
  success screen); the tracking modal lists DB attachments as guarded download links with the
  basePath; no attach button in the tracking modal (upstream has none); the skill's unused
  `FileUpload.tsx` is replaced by `AttachmentPicker.tsx` · **because** the upload route needs an
  existing ticket and Server Actions cap bodies at 1 MB · rejected: uploading inside the submit
  Server Action, blocking the submit on an upload failure.
- 2026-10-09 **OWASP: two reviewed suppressions** (`owasp-suppressions.xml`) — `braces@3.0.3`
  (GHSA-vfj7-8cjw-p6xm, high) is only in the CI lint chain (eslint-config-next → fast-glob →
  micromatch) and never sees user input; `sprintf-js@1.1.3` (GHSA-hp3w-g68c-fv3c, moderate) comes
  via mssql → tedious, which only passes literal format strings. No fixed release of either exists;
  suppressions pin the exact version + advisory so a new version is scanned again · **because** the
  OWASP stage stayed UNSTABLE on non-exploitable findings, hiding real ones · rejected: downgrading
  eslint-config-next to 14.x (npm audit's "fix", incompatible with Next 16), overrides to
  non-existent fixed versions.
- 2026-10-09 **Jenkins: `disableConcurrentBuilds()`** — a second push queues instead of running
  `prisma migrate deploy` + `docker compose up` while the previous build still deploys (dev builds
  #13/#14 overlapped) · rejected: a `lock()` around Deploy only (two builds would still race the
  migrate step that runs inside Deploy before compose up — whole-job queuing is simpler).
- 2026-10-09 **Auto-assign works for real, and can be turned off** (owner) — the category's
  `AutoAssignMode` (`off` new · `lead_manual` · `round_robin` · `workload_balanced`) picks the officer on
  the server at submit time (`lib/auto-assign.ts`); upstream only stored the setting · rejected: a
  separate on/off flag beside the mode (one select is simpler and `off` reads as a mode), a stored
  round-robin pointer (derived from the category's latest assigned ticket instead — no new column).
- 2026-10-09 **Every screen bilingual TH/EN** (owner) — supersedes the parts of the upstream-parity
  decision that left admin pages, the manual and export Thai-only. Thai copy stays verbatim as the
  `th` branch; server-written text already stored in Thai (timeline/notifications) is mapped to EN on
  the client · rejected: rewriting stored rows (history would change under audit).
- 2026-10-09 **Auto-assign defaults to `off`** (owner) — new and existing categories start with no
  auto-assignment, i.e. the behaviour users had before auto-assign became real; an admin opts a
  category in on the Gatekeeper page (migration `20261009160000_auto_assign_default_off`) · rejected:
  keeping upstream's `lead_manual` default (every category would silently start assigning to its Lead
  on the next deploy).
- 2026-10-09 **Auto-assign defaults to Lead Manual; new-ticket mail goes to the assignee** (owner) —
  supersedes "Auto-assign defaults to `off`" above: every category starts on `lead_manual` (upstream's
  "(แนะนำ)" mode; migration `20261009170000_auto_assign_default_lead`), and `notifyTicketSubmitted`
  mails the assigned officer with the category Lead in CC (upstream's concept "notify the department
  officer at once"), falling back to the Lead / escalation address when nobody was assigned ·
  rejected: Lead-only mail (a round-robin/workload assignee would never hear about the ticket).
