# API Index

<!-- ตาราง endpoint — index ชี้เข้าโค้ด ไม่ใช่ spec เต็ม (validation schema ในไฟล์ route
     คือ spec ตัวจริง อย่าลอกมา) · อัปเดตผ่าน /ugt-handoff เมื่อเพิ่ม/เปลี่ยน endpoint -->

| Method | Path | ทำอะไร | ไฟล์ | ใครเรียก |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | health check + บอกว่ามี `GEMINI_API_KEY` ตั้งไว้หรือไม่ | `src/app/api/health/route.ts` | ops/uptime check |
| POST | `/api/ai/analyze-complaint` | Gemini triage: แนะนำหมวดหมู่/urgency/risk จากร่างคำร้อง (fallback เป็น heuristic คงที่ถ้าไม่มี API key) | `src/app/api/ai/analyze-complaint/route.ts` | `analyzeGrievanceWithAI()` ใน `src/services/api.ts`, เรียกจาก `EmployeeSubmitForm` |
| POST | `/api/ai/cluster-insights` | Gemini root-cause clustering + executive summary จากคำร้องทั้งหมด (fallback เป็น cluster ตัวอย่างคงที่ถ้าไม่มี API key) | `src/app/api/ai/cluster-insights/route.ts` | `getClusterInsightsWithAI()` ใน `src/services/api.ts`, เรียกจาก `ExecutiveDashboard` |

## Server Actions (Prisma) — `src/lib/actions/`

<!-- เพิ่มโดย ugt-nextjs-database-setup, 2026-09-02 — ไม่ใช่ URL endpoint (เรียกจาก
     Server Component/Client Component โดยตรงผ่าน 'use server'), ยังไม่มี component ไหนเรียกจริง
     (ดู handoff.md → Open Questions) — ทุกฟังก์ชัน mirror signature ของ src/services/api.ts เดิม -->

| Module | ฟังก์ชันหลัก | แทนที่ (src/services/api.ts) |
| --- | --- | --- |
| `src/lib/actions/tickets.ts` | `getTickets`, `getTicketByTrackingCode`, `submitTicket`, `updateTicketWorkflow`, `submitEvaluation` | `getStoredTickets`/`saveStoredTickets`/`submitTicket`/`updateTicketWorkflow`/`submitEvaluation` |
| `src/lib/actions/notifications.ts` | `getNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead` | เดียวกัน |
| `src/lib/actions/gatekeeper.ts` | `getDepartmentGatekeeperConfigs`, `updateDepartmentGatekeeperConfig`, `addGatekeeperOfficer`, `updateGatekeeperOfficer`, `deleteGatekeeperOfficer` | `getStoredGatekeeperConfigs`/`updateDepartmentGatekeeperConfig` |
| `src/lib/actions/executives.ts` | `getExecutives`, `addExecutiveMember`, `updateExecutiveMember`, `deleteExecutiveMember` | เดียวกัน |
| `src/lib/actions/hr-admins.ts` | `getHrAdmins`, `addHrAdminMember`, `updateHrAdminMember`, `deleteHrAdminMember` | เดียวกัน |
| `src/lib/actions/role-access.ts` | `getRoleAccessConfigs`, `updateRoleAccessConfig` | `getStoredRolePermissions`/`saveStoredRolePermissions` |

ไม่มี session/permission guard ในชุดนี้ — รอ `ugt-nextjs-auth-setup` ก่อนถึงจะมี
session จริงให้ตรวจ (ดู `.claude/rules/ugt-nextjs-database.md`)
