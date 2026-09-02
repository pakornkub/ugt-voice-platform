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
- `src/app/api/` — Route Handlers: `health/route.ts`, `ai/analyze-complaint/route.ts`,
  `ai/cluster-insights/route.ts` (Gemini calls via `@google/genai`); read `GEMINI_API_KEY` via
  `@/lib/env`, not `process.env` directly.
- `src/components/` — one component per feature screen/modal, all `'use client'`. Unchanged
  logic from the pre-migration Vite SPA (see decisions.md, 2026-09-02 migration).
- `src/services/api.ts` — **still the live data layer** (localStorage) that every component
  calls — see ⚠ deviation below. `INITIAL_EXECUTIVES`/`INITIAL_HR_ADMINS` also live here.
- `src/services/sqliteDb.ts` — sql.js (SQLite-in-browser via WASM, binary fetched from a
  CDN) shadow copy of the tickets/officers/executives/notifications data, used only by
  `ExportAnalyticsModal`'s "SQL Query Studio" — not the source of truth.
- `src/services/safeStorage.ts` — SSR-safe `localStorage` wrapper (no-ops on the server;
  needed because Next.js server-renders `'use client'` components once before hydration).
- `src/types.ts` — domain model (`ComplaintTicket`, `NotificationItem`, `RolePermissionConfig`,
  `DepartmentGatekeeperConfig`, `ExecutiveMember`, `HrAdminMember`, ...) — authoritative for
  field-level types; mirrored into `prisma/schema.prisma` (see below).
- `src/mockData.ts` — seed data: `CATEGORY_DEFINITIONS` (9 grievance categories),
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
  - `prisma/schema.prisma` — 9 tables (`Tickets`, `TicketTimelineLogs`, `TicketEvaluations`,
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
    function signatures (see `api.md` → Server Actions). Not called by any component yet.
  - `prisma/migrations/20260902000000_init/` — generated **offline** (`prisma migrate diff
--from-empty`, no live SQL Server at authoring time); apply via `prisma migrate resolve
--applied` once real DB values land, not by replaying `migrate dev` — see
    `docs/admin-handoff.md`.
  - `prisma/seed.ts` — mirrors `src/mockData.ts` (tickets/timeline/evaluations/gatekeeper
    configs & officers/notifications) plus a hand-mirrored copy of `src/services/api.ts`'s
    `INITIAL_EXECUTIVES`/`INITIAL_HR_ADMINS`/`INITIAL_ROLE_PERMISSIONS` (not imported directly
    — importing `api.ts` from a Node script would drag in the browser-only `sqliteDb.ts`/
    `sql.js`). Keep these three lists in sync until `api.ts` is retired.

- **Auth + RBAC (added 2026-09-02, `ugt-nextjs-auth-setup`) — SSO (Keycloak) only, live once
  real Keycloak values land (currently placeholders, see `docs/admin-handoff.md` §2):**
  - `lib/auth.ts` — Better Auth server config: Prisma adapter, Keycloak `genericOAuth` plugin
    (guarded — no-op until `KEYCLOAK_ISSUER`/`CLIENT_ID`/`CLIENT_SECRET` are real), 8h session
    (30m refresh), `databaseHooks.session.create.after` writes `login.success` + syncs
    `authType`/`ldapUsername`. `emailAndPassword.enabled: false` (no local accounts).
  - `lib/auth-client.ts` — browser client (`authClient.signIn.social({ provider: 'keycloak' })`).
  - `lib/actions/auth.ts` — `ssoLogoutAction` only (local session cleanup + Keycloak backchannel
    logout). No LDAP/local login actions — SSO only.
  - `lib/permissions.ts`/`lib/get-user-permissions.ts`/`lib/permissions-sync.ts` — RBAC for the
    `/admin/*` section only: `users:read`/`users:update`, `roles:read/create/update/delete`,
    `audit-logs:read`. This is a **separate system** from the app's own `UserRole` tab-visibility
    model below — see ⚠ deviation.
  - `lib/actions/admin-setup.ts`/`admin-roles.ts`/`admin-users.ts` — first-admin bootstrap, role
    CRUD, `assignUserRoleAction` (RBAC role) + `assignUserAppRoleAction` (this app's own
    `UserRole`).
  - `lib/audit-actions.ts` — `ActivityLogs.action` constants: `login.success`/`logout`/
    `logout.sso`/`users.role-assign`/`users.app-role-assign`/`roles.create/update/delete`.
  - `src/middleware.ts` — route guard (Next.js ≤15 filename — see ⚠ deviation), cookie-presence
    check + security headers on every response.
  - `src/app/login/page.tsx` + `src/components/LoginForm.tsx` — public SSO login page.
  - `src/app/admin/setup/` — first-admin bootstrap (`/admin/setup`), outside the `(shell)` group
    (no permissions exist yet at this point).
  - `src/app/(shell)/admin/{users,roles,audit-logs}/page.tsx` + `UsersTable`/`RolesManager`/
    `AuditLogsTable` components — the 3 ongoing admin pages, rendered **inside** the existing
    `(shell)` group so they get the same `Navbar`/tab chrome as every other route (no separate
    admin sidebar was built — see `docs/project-context/decisions.md`).
  - `src/app/(shell)/layout.tsx` — now the real session guard for every route under the shell:
    no session → `/login`; no bootstrap admin yet → `/admin/setup`; no `appRole` assigned yet →
    a "รอผู้ดูแลระบบกำหนดสิทธิ์การใช้งาน" waiting screen (not the shell).
  - `prisma/schema.prisma` — `user`/`session`/`account`/`verification`/`role`/`permission`/
    `rolePermission`/`rateLimit`/`activityLog` models (8 singular + `ActivityLogs`, per the org's
    documented naming exception), `user.appRole` (this app's own `UserRole`, separate from
    `roleId`/RBAC — see ⚠ deviation). No directory-enrichment columns (`empCode`/`department`/…
    — not installed this chunk, see decisions.md).
  - `prisma/migrations/20260902010000_auth_rbac/` — generated **offline** (schema-to-schema
    diff, no live SQL Server — same method as the initial migration); apply via `prisma migrate
resolve --applied` once real DB values land, see `docs/admin-handoff.md`.

## Data flow หลัก

- ยื่นคำร้อง: `EmployeeSubmitForm` (`src/components/EmployeeSubmitForm.tsx`) →
  `submitTicket()` in `src/services/api.ts` → `localStorage` → async mirror to sql.js via
  `syncAllTicketsToSqlite()` in `src/services/sqliteDb.ts`.
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

## ตารางหลัก → feature

| ตาราง (Prisma `@@map`)                                 | feature                                                                                      |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `Tickets` / `TicketTimelineLogs` / `TicketEvaluations` | ยื่นคำร้อง, ติดตามสถานะ, CSAT — `EmployeeSubmitForm`, `GatekeeperInbox`, `SatisfactionModal` |
| `DepartmentGatekeeperConfigs` / `GatekeeperOfficers`   | จัดการผู้รับผิดชอบ 9 หน่วยงาน — `admin_gatekeeper` tab                                       |
| `ExecutiveMembers`                                     | CEO/EVP whistleblower directory — `admin_gatekeeper` tab                                     |
| `HrAdminMembers`                                       | HR admin directory — `admin_gatekeeper` tab                                                  |
| `Notifications`                                        | in-app notification drawer                                                                   |
| `RoleAccessConfigs`                                    | `RoleBasedAccessManagement` (`rbac_management` tab)                                          |

ยังไม่ใช่ live source — ดู ⚠ deviation ด้านล่าง (schema/migration/seed พร้อมใช้แล้ว แต่
component ทั้งหมดยังอ่าน/เขียน `localStorage` ผ่าน `src/services/api.ts` เหมือนเดิม)

## ⚠ Deviations (2026-09-02, ทั้งหมดเป็นผลจากการ migrate Phase A ที่จงใจคงพฤติกรรมเดิมไว้ก่อน

เว้นแต่ระบุวันที่อื่น)

- ⚠ deviation (2026-09-02): มี schema/migration/seed/Server Actions (Prisma + SQL Server)
  พร้อมแล้ว (`prisma/`, `lib/prisma.ts`, `src/lib/actions/`) แต่**ยังไม่ใช่ live persistence
  layer** — ทุก component ยังอ่าน/เขียน `localStorage` ผ่าน `src/services/api.ts` เหมือนเดิม —
  เหตุผล: (1) ยังไม่มี SQL Server จริงให้เชื่อมต่อ (รอ Admin/DBA ตาม
  `docs/admin-handoff.md`), (2) การสลับทุก call site จาก sync localStorage เป็น async Server
  Action เป็นงาน UI-refactor ขนาดใหญ่แยกต่างหากจากการติดตั้ง DB layer — แผนสลับอยู่ในคิวถัดไป
  (`.claude/state/handoff.md` → Open Questions). `src/services/sqliteDb.ts` (sql.js shadow
  copy สำหรับ SQL Studio) ไม่แตะต้อง ยังทำงานเหมือนเดิมทุกประการ.
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
  `user.appRole` (set only by an admin via `/admin/users` → `assignUserAppRoleAction`), fetched
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
  `docs/project-context/decisions.md` for why they were not merged.
- ⚠ deviation (2026-09-02, `ugt-nextjs-auth-setup`): no central-employee-directory enrichment
  (`lib/directory.ts`/`lib/scope.ts`/`lib/approval-chain.ts` from the skill were not installed) —
  this project has no linked-server employee view to read from yet; SSO gives only name/email/
  username. See `docs/project-context/decisions.md`.
- ⚠ deviation: การแนบไฟล์ใน `EmployeeSubmitForm` เป็นการจำลอง (`Math.random()` สร้าง object
  ไฟล์ปลอม) ไม่มี upload/storage จริง — แผนอยู่ใน chunk `ugt-nextjs-upload-setup`.
- ⚠ deviation: การแจ้งเตือนเป็นแบบ in-app เท่านั้น ไม่มีอีเมลจริง — แผนอยู่ใน chunk
  `ugt-nextjs-mail-setup`.
- ⚠ deviation: `ExportAnalyticsModal`'s "SQL Query Studio" รันคำสั่ง SQL ที่ผู้ใช้พิมพ์เอง
  ได้อิสระกับ sql.js ในเบราว์เซอร์ — ยอมรับได้ตอนนี้เพราะยังไม่มี backend จริง แต่ต้องปรับเป็น
  preset reports ก่อนต่อกับ SQL Server จริง (มติแล้ว ดู decisions.md).
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
  `test:coverage` / `build` (the four the Jenkins pipeline will call by exact name once
  `ugt-nextjs-cicd-setup` lands).
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
