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
- 2026-09-02 `eslint-config-next` is pinned to `^15.5.0` (not npm's default-latest 16.x) and
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
  component surfaces itself) — `middleware.ts` + the `(shell)` layout's server-side session check
  on every navigation cover the real case (an expired cookie on the next page load) · revisit if a
  later chunk adds client-side data fetching that can 401 while a page stays open.
- 2026-09-02 This project pins `next@^15.5.0` (not 16.x), so the auth-setup skill's `proxy.ts`
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
