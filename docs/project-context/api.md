# API Index

<!-- ตาราง endpoint — index ชี้เข้าโค้ด ไม่ใช่ spec เต็ม (validation schema ในไฟล์ route
     คือ spec ตัวจริง อย่าลอกมา) · อัปเดตผ่าน /ugt-handoff เมื่อเพิ่ม/เปลี่ยน endpoint -->

| Method   | Path                        | ทำอะไร                                                                                                                                                                                                                                                     | ไฟล์                                 | ใครเรียก                                                                                                     |
| -------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| GET      | `/api/health`               | health check — `status: 'healthy'\|'degraded'` + 200/503 จาก `checks.database` จริง (`prisma.$queryRaw`) รวม `aiAvailable` — เพิ่ม DB check โดย `ugt-nextjs-cicd-setup`, 2026-09-03 (ก่อนหน้านี้ตอบ 200 เสมอ)                                              | `src/app/api/health/route.ts`        | Docker `HEALTHCHECK` + compose healthcheck + Jenkins Deploy stage's health poll, ops/uptime check            |
| POST     | `/api/ai/suggest-category`  | Gemini แนะนำ 1 ใน 6 หมวดหมู่ + confidence/reasoning/secondaryCategory/suggestedUrgency/keywords จากหัวข้อ+รายละเอียด (ไม่มี API key หรือ Gemini ล้ม → keyword heuristic `src/services/categoryHeuristics.ts`) — พอร์ตจาก upstream `server.ts` (2026-10-08) |
| POST     | `/api/ai/analyze-complaint` | Gemini triage: แนะนำหมวดหมู่/urgency/risk จากร่างคำร้อง — **ตอบ 200 เสมอ** (ไม่มี API key หรือ error → default triage JSON ไม่ใช่ 500)                                                                                                                     |
| POST     | `/api/ai/cluster-insights`  | Gemini root-cause clustering + executive summary จากคำร้องทั้งหมด — **ตอบ 200 เสมอ** (ไม่มี API key/error → cluster ตัวอย่างคงที่ 6 หมวด)                                                                                                                  |
| GET/POST | `/api/auth/[...all]`        | Better Auth catch-all (sign-in/sign-out/callback/get-session ฯลฯ)                                                                                                                                                                                          | `src/app/api/auth/[...all]/route.ts` | `authClient` (`lib/auth-client.ts`), `auth.api.*` ฝั่ง server — เพิ่มโดย `ugt-nextjs-auth-setup`, 2026-09-02 |
| POST     | `/api/files`                | อัปโหลดไฟล์แนบ — session → permission `files:create` → ตรวจว่า ticket/timeline log มีจริง → เขียนลง volume (ไม่มีสแกนไวรัส) → บันทึกแถว `Attachments` → audit log                                                                                          | `src/app/api/files/route.ts`         | `FileUpload.tsx` — เพิ่มโดย `ugt-nextjs-upload-setup`, 2026-09-02 (ยังไม่มีหน้าไหนเรียกจริง ดู handoff.md)   |
| GET      | `/api/files/[id]`           | ดาวน์โหลดไฟล์แนบ — session → permission `files:read` → `canReadAttachment` (ขอบเขตของ ticket) → บล็อกเฉพาะ `scanStatus === 'infected'` → stream เป็น `application/octet-stream` + audit log                                                                | `src/app/api/files/[id]/route.ts`    | `FileUpload.tsx` (plain `<a href>`) — เพิ่มโดย `ugt-nextjs-upload-setup`, 2026-09-02                         |

ทั้ง 3 route ข้างบนเรียก Gemini ผ่าน `lib/gemini.ts`'s `generateGeminiContentWithFallback()` —
ไล่โมเดล `gemini-3.8-flash` → `gemini-flash-latest` → `gemini-3.1-flash-lite` เมื่อเจอ 503/429
(high demand / resource exhausted) error อื่นโยนต่อทันที

## Server Actions (`lib/actions/`, `'use server'`) — as of 2026-10-09

ทุกตัวตาม pattern org: session → permission → action → audit log (non-blocking). Error ที่โยนจาก
Server Action ถูก Next.js ซ่อนข้อความบน production — UI จึง pre-check กรณีที่ต้องโชว์ข้อความเฉพาะ
หรือ action คืน result union แทนการ throw (`reports.ts`).

| Module                          | ฟังก์ชันหลัก                                                                                                                                   | Guard                                     | เรียกจาก                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| `lib/actions/auth.ts`           | `ssoLogoutAction`                                                                                                                              | session                                   | Navbar identity menu, `(shell)/layout.tsx` |
| `lib/actions/admin-setup.ts`    | `initializeAdminAction` (first admin → `HrAdminMembers`)                                                                                       | session + not yet initialised             | `AdminSetupForm` (`/admin/setup`)          |
| `lib/actions/tickets.ts`        | `getTickets`, `getTicketByTrackingCode`, `submitTicket`, `updateTicketWorkflow`, `sendAnonymousChatMessage`, `submitEvaluation`                | `requireTicketViewer` + ticket scope      | submit form, inbox, tracking modal, CSAT   |
| `lib/actions/notifications.ts`  | `getNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead` (per person, `NotificationReads`)                                   | viewer + visible tickets only             | shell notification drawer                  |
| `lib/actions/hr-admins.ts`      | `getHrAdmins`, `add/update/deleteHrAdminMember`, `resetHrAdminsToDefault` (self / last-admin guards)                                           | `requireTab(ROSTER_TABS)`                 | Gatekeeper-management page                 |
| `lib/actions/executives.ts`     | `getExecutives`, `add/update/deleteExecutiveMember`, `resetExecutivesToDefault`                                                                | `requireTab(ROSTER_TABS)`                 | Gatekeeper-management + RBAC pages         |
| `lib/actions/gatekeeper.ts`     | `getDepartmentGatekeeperConfigs` (any viewer), `updateDepartmentGatekeeperConfig` (officer list diff), `resetGatekeeperConfigsToDefault`       | `requireTab(ROSTER_TABS)` for writes      | Gatekeeper-management page, shell layout   |
| `lib/actions/role-access.ts`    | `getRoleAccessConfigs` (any viewer), `updateRoleAccessConfig`, `saveRoleAccessConfigs`, `resetRolePermissionsToDefault` (admin lock-out guard) | `requireTab(RBAC_TABS)` for writes        | RBAC page, shell layout                    |
| `lib/actions/directory.ts`      | `searchHrEmployees` (roster pickers), `getDirectoryPage` (RBAC employee table)                                                                 | `requireTab(ROSTER_TABS)` / `(RBAC_TABS)` | `HrNameField`, RBAC page                   |
| `lib/actions/email-settings.ts` | `get/save/resetEmailNotificationSettings`, `getEmailDispatchLogs` / `clearEmailDispatchLogs` (HR admins only), `sendTestEmailNotification`     | `requireTab(ROSTER_TABS)`                 | `AdminEmailNotificationSettings`           |
| `lib/actions/reports.ts`        | `runReport(reportId)` → `{ ok, columns, rows }` / `{ ok: false, error }`                                                                       | viewer + admin role                       | `ExportAnalyticsModal` (SQL Query Studio)  |

อีเมลจริง: `lib/email-notifications.ts` (เรียกจาก `submitTicket` / `updateTicketWorkflow` หลัง commit)
→ `lib/email.ts` `sendRenderedMail` — ดู `.claude/rules/ugt-voice-platform-email-notifications.md`.
