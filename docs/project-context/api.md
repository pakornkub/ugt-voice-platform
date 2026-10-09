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

## Server Actions — Auth/RBAC (`lib/actions/`)

<!-- เพิ่มโดย ugt-nextjs-auth-setup, 2026-09-02 — root-level lib/ (เหมือน database
     chunk) ไม่ใช่ src/lib/. SSO only ในโปรเจคนี้ — ไม่มี ldapLoginAction/localLoginAction -->

| Module                       | ฟังก์ชันหลัก                                                                          | เรียกจาก                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `lib/actions/auth.ts`        | `ssoLogoutAction`                                                                     | `Navbar`'s identity menu, `src/app/(shell)/layout.tsx`'s "รอกำหนดสิทธิ์" screen |
| `lib/actions/admin-setup.ts` | `initializeAdminAction` (first-admin bootstrap)                                       | `AdminSetupForm` (`/admin/setup`)                                               |
| `lib/actions/admin-roles.ts` | `createRoleAction`/`updateRoleAction`/`deleteRoleAction`                              | `RolesManager` (`/admin/roles`)                                                 |
| `lib/actions/admin-users.ts` | `assignUserRoleAction` (RBAC role) / `assignUserAppRoleAction` (app's own `UserRole`) | `UsersTable` (`/admin/users`)                                                   |

ทุกฟังก์ชันตาม pattern org: session → permission (`lib/permissions.ts`'s `PERMISSIONS`) → action →
audit log (`lib/audit-actions.ts`) — ดู `.claude/rules/ugt-nextjs-auth.md`

## Server Actions — Mail (`lib/actions/`)

<!-- เพิ่มโดย ugt-nextjs-mail-setup, 2026-09-02 — root-level lib/ (เหมือน auth chunk) -->

| Module                                | ฟังก์ชันหลัก                                                                   | เรียกจาก                                         |
| ------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ |
| `lib/actions/admin-mail-templates.ts` | `saveMailTemplateAction`/`resetMailTemplateAction`/`previewMailTemplateAction` | `MailTemplatesManager` (`/admin/mail-templates`) |

ตาม pattern org เดียวกัน: session → permission (`mail-templates:manage`) → action → audit log
— ดู `.claude/rules/ugt-nextjs-mail.md`

ไม่ใช่ URL endpoint แต่ยังเป็น "การส่งอีเมลจริง" ที่ต้องรู้: `sendTemplatedMail()`
(`lib/email.ts`) — ไม่มี Server Action ไหนเรียกตอนนี้ (hook เดิมใน `tickets.ts` ถูกถอดใน slice 1,
2026-10-09); slice 3 จะเรียกจาก `lib/actions/tickets.ts` ตามโมเดลตั้งค่า upstream

## Server Actions (Prisma) — `lib/actions/`

<!-- เพิ่มโดย ugt-nextjs-database-setup, 2026-09-02 — ไม่ใช่ URL endpoint (เรียกจาก
     Server Component/Client Component โดยตรงผ่าน 'use server'), ยังไม่มี component ไหนเรียกจริง
     (ดู handoff.md → Open Questions) — ทุกฟังก์ชัน mirror signature ของ src/services/api.ts เดิม
     path แก้เป็น root-level lib/actions/ เมื่อ 2026-09-02 (ugt-nextjs-mail-setup) — ไม่มี
     src/lib/ ในโปรเจคนี้เลย (ดู decisions.md's database-chunk entry); ไฟล์เหล่านี้เองยังมี
     คอมเมนต์หัวไฟล์เดิมที่อ้าง src/lib/actions/ ผิดอยู่ — ไม่กระทบการทำงาน ไม่ได้แก้ในรอบนี้ -->

| Module                         | ฟังก์ชันหลัก                                                                                                                                                                                                                                                                              | แทนที่ (src/services/api.ts)                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `lib/actions/tickets.ts`       | **live (slice 1, 2026-10-09)** — `getTickets`, `getTicketByTrackingCode`, `submitTicket`, `updateTicketWorkflow`, `sendAnonymousChatMessage`, `submitEvaluation`; each: session → scope/permission (`lib/ticket-scope.ts`) → zod enum check → Prisma → `ActivityLogs`; no email (slice 3) | ticket localStorage functions (removed)                         |
| `lib/actions/notifications.ts` | **live (slice 1)** — `getNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead` (only notifications of tickets the caller may see)                                                                                                                                        | notification localStorage functions (removed)                   |
| `lib/actions/gatekeeper.ts`    | `getDepartmentGatekeeperConfigs`, `updateDepartmentGatekeeperConfig`, `addGatekeeperOfficer`, `updateGatekeeperOfficer`, `deleteGatekeeperOfficer`                                                                                                                                        | `getStoredGatekeeperConfigs`/`updateDepartmentGatekeeperConfig` |
| `lib/actions/executives.ts`    | `getExecutives`, `addExecutiveMember`, `updateExecutiveMember`, `deleteExecutiveMember`                                                                                                                                                                                                   | เดียวกัน                                                        |
| `lib/actions/hr-admins.ts`     | `getHrAdmins`, `addHrAdminMember`, `updateHrAdminMember`, `deleteHrAdminMember`                                                                                                                                                                                                           | เดียวกัน                                                        |
| `lib/actions/role-access.ts`   | `getRoleAccessConfigs`, `updateRoleAccessConfig`                                                                                                                                                                                                                                          | `getStoredRolePermissions`/`saveStoredRolePermissions`          |

Guards: `tickets.ts`/`notifications.ts` ครบ (slice 1). `gatekeeper.ts`/`role-access.ts` ใช้แค่อ่านจาก
`src/app/(shell)/layout.tsx`; ฟังก์ชันแก้ไขทั้งหมดใน `gatekeeper.ts`/`executives.ts`/`hr-admins.ts`/`role-access.ts`
ยังไม่มี guard และยังไม่มีใครเรียก — slice 2 ต้องใส่ session → permission → audit ก่อนต่อ UI
