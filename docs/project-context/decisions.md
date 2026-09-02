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
