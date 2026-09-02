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
  `ai/cluster-insights/route.ts` (Gemini calls via `@google/genai`).
- `src/components/` — one component per feature screen/modal, all `'use client'`. Unchanged
  logic from the pre-migration Vite SPA (see decisions.md, 2026-09-02 migration).
- `src/services/api.ts` — the entire data layer: tickets, notifications, RBAC permissions,
  gatekeeper department configs, executives, HR admins. All backed by `localStorage`
  (see ⚠ deviation below).
- `src/services/sqliteDb.ts` — sql.js (SQLite-in-browser via WASM, binary fetched from a
  CDN) shadow copy of the tickets/officers/executives/notifications data, used only by
  `ExportAnalyticsModal`'s "SQL Query Studio" — not the source of truth.
- `src/services/safeStorage.ts` — SSR-safe `localStorage` wrapper (no-ops on the server;
  needed because Next.js server-renders `'use client'` components once before hydration).
- `src/types.ts` — domain model (`ComplaintTicket`, `NotificationItem`, `RolePermissionConfig`,
  `DepartmentGatekeeperConfig`, `ExecutiveMember`, `HrAdminMember`, ...).
- `src/mockData.ts` — seed data: `CATEGORY_DEFINITIONS` (9 grievance categories),
  `INITIAL_COMPLAINTS`, `INITIAL_GATEKEEPER_CONFIGS`, `INITIAL_NOTIFICATIONS`.

## Data flow หลัก

- ยื่นคำร้อง: `EmployeeSubmitForm` (`src/components/EmployeeSubmitForm.tsx`) →
  `submitTicket()` in `src/services/api.ts` → `localStorage` → async mirror to sql.js via
  `syncAllTicketsToSqlite()` in `src/services/sqliteDb.ts`.
- AI triage: EmployeeSubmitForm "วิเคราะห์ด้วย Gemini AI" → `analyzeGrievanceWithAI()` in
  api.ts → `POST /api/ai/analyze-complaint` → `src/app/api/ai/analyze-complaint/route.ts` →
  Gemini API (falls back to static heuristics when `GEMINI_API_KEY` is unset).
- AI clustering: `ExecutiveDashboard` "สรุปเชิงกลยุทธ์ด้วย Gemini AI" →
  `getClusterInsightsWithAI()` in api.ts → `POST /api/ai/cluster-insights` → same pattern.
- Tab navigation: `Navbar` (`src/components/Navbar.tsx`, prop-driven, unchanged) →
  `navigateTab()` in `src/app/(shell)/shell.tsx` → `router.push()` → route change →
  `usePathname()` recomputes `activeTab`, passed back into `Navbar` via `ShellContext`.

## ตารางหลัก → feature

_(ยังไม่มีฐานข้อมูลจริง — ดู ⚠ deviation ด้านล่าง)_

## ⚠ Deviations (2026-09-02, ทั้งหมดเป็นผลจากการ migrate Phase A ที่จงใจคงพฤติกรรมเดิมไว้ก่อน)

- ⚠ deviation: ไม่มีฐานข้อมูลจริง — ข้อมูลทั้งหมดอยู่ใน browser `localStorage`
  (`src/services/api.ts`); schema ใน `src/services/sqliteDb.ts` เป็นแค่ shadow copy ฝั่ง
  client สำหรับ SQL Studio เท่านั้น ไม่ใช่ persistence layer จริง — เหตุผล: โปรเจคเดิม (Vite
  SPA จาก AI Studio) ไม่เคยมี backend จริงมาก่อน แผน Prisma/SQL Server อยู่ใน chunk ถัดไป
  (`ugt-nextjs-database-setup`).
- ⚠ deviation: ไม่มี authentication จริง — `Navbar`'s role switcher เป็น dropdown ที่สลับ
  role ได้อิสระโดยไม่มีการตรวจสอบใดๆ, `currentRole` เป็น React state ที่ reset ทุกครั้งที่
  reload — แผน Keycloak SSO อยู่ใน chunk ถัดไป (`ugt-nextjs-auth-setup`) ซึ่งจะปลด role
  switcher นี้ออก.
- ⚠ deviation: การแนบไฟล์ใน `EmployeeSubmitForm` เป็นการจำลอง (`Math.random()` สร้าง object
  ไฟล์ปลอม) ไม่มี upload/storage จริง — แผนอยู่ใน chunk `ugt-nextjs-upload-setup`.
- ⚠ deviation: การแจ้งเตือนเป็นแบบ in-app เท่านั้น ไม่มีอีเมลจริง — แผนอยู่ใน chunk
  `ugt-nextjs-mail-setup`.
- ⚠ deviation: `ExportAnalyticsModal`'s "SQL Query Studio" รันคำสั่ง SQL ที่ผู้ใช้พิมพ์เอง
  ได้อิสระกับ sql.js ในเบราว์เซอร์ — ยอมรับได้ตอนนี้เพราะยังไม่มี backend จริง แต่ต้องปรับเป็น
  preset reports ก่อนต่อกับ SQL Server จริง (มติแล้ว ดู decisions.md).

## Testing map

_(ยังไม่มี test runner ติดตั้ง — แผนอยู่ใน chunk `ugt-nextjs-test-lint-setup`)_
