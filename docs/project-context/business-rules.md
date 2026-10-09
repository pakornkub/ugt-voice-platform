# Business Rules — as-built

<!-- กติกา business ที่ระบบ "ทำจริงตอนนี้" — รวมสิ่งที่เปลี่ยนไปจาก brief ระหว่างทาง
     จัดรายโดเมน · ทุกข้อชี้โค้ดที่ implement · ที่มาจากมติ → อ้าง decisions.md
     ไม่เขียนเหตุผลซ้ำ · เขียนเพิ่มเมื่อ feature ✅ done ผ่าน /ugt-handoff
     (brief ของ feature นั้น freeze ทันทีที่สรุปเข้าไฟล์นี้แล้ว) -->

## การยื่นคำร้อง (Submission)

- ทุกคำร้องต้องเลือกประเภท (ข้อร้องเรียน/ข้อเสนอแนะ) และหมวดหมู่ 1 ใน 6 หมวด
  (HR/Compliance/Ethics/Fraud/Harassment/Quality — IT/Safety/Environment ถูกตัดตาม upstream
  `8d885a3`, 2026-10-08; ticket เก่าหมวด Environment ถูก migrate เป็น Compliance ตอนโหลด) — implement ที่
  `src/components/EmployeeSubmitForm.tsx`, นิยามหมวดหมู่ที่ `src/mockData.ts:CATEGORY_DEFINITIONS`
- ระดับความลับมี 3 แบบ: anonymous / confidential_restricted / standard_named — implement
  ที่ `src/types.ts:ConfidentialityLevel`, ใช้ใน `src/components/EmployeeSubmitForm.tsx`
- คำร้องที่ทำเครื่องหมาย "ส่งตรง CEO/EVP" (`isDirectToExecutive`) จะขึ้นคิว priority แยก —
  implement ที่ `src/types.ts:ComplaintTicket.isDirectToExecutive`, แสดงผลที่
  `src/components/ExecutiveDashboard.tsx` (assumption: ไม่ได้ไล่อ่าน routing logic ทุกจุด)

## ใครเห็น/ทำอะไรกับคำร้องได้ — บังคับที่ server (DB rewiring slice 1, 2026-10-09)

กติกาอยู่ที่ `lib/ticket-scope.ts` (pure, เทสต์ `lib/ticket-scope.test.ts`) — ใช้ทั้ง list ใน
`src/app/(shell)/layout.tsx`, การค้นด้วยรหัสติดตาม และทุก Server Action ใน `lib/actions/tickets.ts`;
role + หมวดของ gatekeeper มาจาก `resolveViewer()` (`lib/ticket-access.ts`) ที่เดียว — ตอนนี้ role =
`user.appRole`, slice 2 เปลี่ยนเป็น roster (decisions 2026-10-09); flag มาจากแถว `RoleAccessConfigs`
ของ role นั้น (ไม่มีแถว = เห็นแค่ของตัวเอง)

- **ทุก role** เห็นคำร้องที่ตัวเองยื่น: `loginEmail` = อีเมล session (`submitTicket` ตั้งเองเสมอ
  ไม่เชื่อค่าจากฟอร์ม) หรือ `submitterEmail` บนแถวเก่าที่ไม่มี `loginEmail`
- **employee**: เฉพาะของตัวเอง
- **gatekeeper**: `gatekeeperCategories` ของ viewer — ตอนนี้ = `assignedDepartments` ระดับ role (ว่าง →
  `['HR']` เหมือน GatekeeperInbox; inbox ฝั่ง client ใช้ชุดเดียวกันผ่าน `ShellContext`), เรื่องส่งตรง CEO
  เฉพาะเมื่อมี `canViewDirectCeoTickets` — `canViewAllDepartments` ไม่มีผล (เหมือน UI upstream)
- **executive / admin**: ทุกหน่วยงาน, เรื่องส่งตรง CEO ตาม `canViewDirectCeoTickets`
- **notification**: เห็นเมื่อเห็นคำร้องของมัน (`TicketId`) + ฝั่ง client ยังซ่อน CEO alert จาก role ที่
  ไม่มี `canViewDirectCeoTickets`; `IsRead` เป็น flag เดียวต่อแถว (คนที่เห็นคำร้องเดียวกันใช้ร่วมกัน)
- **ยื่นเรื่อง**: role ที่มีแท็บ `submit` · **triage** (status/ผู้รับผิดชอบ/urgency/risk/CAPA): role ที่มี
  แท็บ `gatekeeper` · **โน้ต / แชทนิรนาม**: ใครก็ได้ที่เห็นคำร้อง (แชทส่งในนาม role ตัวเองเท่านั้น) ·
  **CSAT**: เฉพาะผู้ยื่นเอง และคำร้องต้อง `resolved`
- **ผู้ทำรายการใน timeline/แชท server เป็นคนกำหนด** ไม่เชื่อค่าจาก client: triage = "Gatekeeper
  Supervisor / Gatekeeper Lead" (ป้ายเดิม upstream), โน้ตของผู้ยื่น = ป้าย upstream (ชื่อผู้ยื่น หรือ
  "พนักงาน (ไม่เปิดเผยตัวตน)" ฯลฯ — ภาษาตาม client ได้ถ้าเป็นหนึ่งในป้ายนั้น), โน้ตของคนอื่น = ชื่อ
  session + role; ชื่อผู้ส่งแชทมาจาก role (`defaultChatSenderName`) เท่านั้น
- **ปกปิดตัวตนที่ server** (`redactTicketForViewer`, `lib/ticket-scope.ts`) ก่อนข้อมูลออกจาก server
  ทุกทาง (หน้า, ค้นรหัส, ผลของ action): ผู้ยื่นเห็นครบ; คนอื่น — anonymous: ชื่อ/รหัส/ฝ่าย/โทร ต้องมี
  `canViewConfidentialIdentities`, อีเมลล็อกอิน/อีเมลผู้ยื่นต้องมี `canViewAnonymousSubmitterEmail`;
  confidential_restricted: ทุกช่อง + ชื่อผู้ยื่นใน timeline ต้องมี `canViewConfidentialIdentities`;
  standard_named ไม่ปิด · `recipientEmail` ของ notification ส่งให้เฉพาะผู้รับ
- คำร้องนอก scope ตอบเหมือน "ไม่พบ" (`null`) ไม่บอกว่ามีอยู่; ทุก mutation เขียน `ActivityLogs`
  (`tickets.submit|update|evaluate|chat-send`, ไม่เก็บข้อความแชท)
- **แจ้งเตือนแชทนิรนาม** (2026-10-09): notification `type: 'chat_message'` ในแอปเท่านั้น (ไม่มีอีเมล) ·
  เจ้าหน้าที่ส่ง → ผู้ยื่น (`recipientEmail` = อีเมลล็อกอินของเรื่อง), ผู้ยื่นตอบ → เจ้าหน้าที่ที่เห็นเรื่อง ·
  ไม่เด้งกลับหาผู้ส่ง (`lib/ticket-scope.ts:isNotificationForViewer`) · หน้าจอดึงข้อมูลใหม่ทุก 30 วิ
  ตอนแท็บเปิดอยู่ และทันทีเมื่อกลับมาที่แท็บ (`src/app/(shell)/shell.tsx`) — ข้อความใหม่ขึ้น toast +
  badge กระดิ่ง, modal ที่เปิดอยู่อัปเดตเอง · ส่งไม่สำเร็จ → แจ้งในหน้าแชท ข้อความที่พิมพ์ไม่หาย

## Gatekeeper triage

- **จ่ายงานอัตโนมัติตอนยื่นเรื่อง** (2026-10-09) — server เลือกเจ้าหน้าที่เอง ไม่รับค่าจาก client
  (`lib/actions/tickets.ts:submitTicket` → `lib/auto-assign.ts:autoAssignOfficer`) ตาม `AutoAssignMode`
  ของหมวด: `off` = ไม่มอบหมาย (รอคัดกรองเอง) · `lead_manual` (**ค่าเริ่มต้น** — migration
  `20261009170000_auto_assign_default_lead` ตั้งทุกหมวดเป็นค่านี้) = Lead ของหมวด (ไม่มี Lead → คนแรก) ·
  `round_robin` = คนถัดจากผู้รับเรื่องล่าสุดของหมวด (วนกลับคนแรก) · `workload_balanced` = คนที่มีเรื่อง
  ค้าง (ไม่ใช่ resolved/closed) น้อยสุดในหมวด เสมอกันเอาตามลำดับรายชื่อ — นับเฉพาะเจ้าหน้าที่ active
  เรียงตาม `CreatedAt`; เรื่อง "ส่งตรง CEO/EVP" ไม่จ่ายอัตโนมัติ (RBAC อาจซ่อนเรื่องนี้จาก Gatekeeper);
  มอบหมายได้ = เพิ่ม timeline `actorRole: 'System'` อีกแถว · แก้ผู้รับผิดชอบทีหลังได้ใน triage modal ตามเดิม

- **ไม่มี SLA แล้ว** (ตัดทั้งระบบตาม upstream `8d885a3`, 2026-10-08): ไม่มี
  `slaTargetHours`/`slaDueDate`/`slaStatus`/`defaultSlaHours`/`slaComplianceRate` และไม่มี
  notification `sla_warning` — ความเร่งด่วนดูจาก `urgency` (Low/Medium/High/Critical) +
  `riskSeverity` ที่ Gatekeeper แก้ได้ผ่าน `updateTicketWorkflow()`
  (`lib/actions/tickets.ts`) — implement ที่ `src/types.ts:ComplaintTicket`
- ผู้ยื่นแบบ anonymous ถูก map อีเมลล็อกอินหลังบ้านจากฐานข้อมูลพนักงาน
  (`ComplaintTicket.loginEmail`/`isAnonymousMapped`, `src/services/employeeDirectory.ts`) —
  เฉพาะ role ที่มี `canViewAnonymousSubmitterEmail` (executive/admin โดย default) เห็นอีเมลนี้
  (UI = งาน Phase 2); มีช่องแชทนิรนามสองทาง `anonymousMessages` ระหว่างผู้ยื่นกับเจ้าหน้าที่
  (`sendAnonymousChatMessage()`)
- แจ้งเตือนอีเมลตามการตั้งค่า (`EmailNotificationSettings`): `onTicketSubmitted` → Lead
  Gatekeeper ของหมวด, `onTicketResolved` → ผู้ยื่น; ยังเป็น localStorage + log จำลองการส่ง
  (`dispatchEmailOn*` ใน api.ts) จนกว่าจะสลับเป็น `AppSettings` + SMTP (decisions.md 2026-10-08)
- ปุ่มสลับแท็บถูกกรองด้วย `allowedTabs` ของ role (`shell.tsx:navigateTab`), การแจ้งเตือนสายตรง
  CEO เห็นเฉพาะ role ที่มี `canViewDirectCeoTickets`
- Gatekeeper เห็นเฉพาะคำร้องในหน่วยงานที่ตนรับผิดชอบ — กรองที่ server (หัวข้อด้านบน) และซ้ำที่
  `src/components/GatekeeperInbox.tsx` (ตัวกรอง UI เดิมของ upstream)

## บทบาทและสิทธิ์ — ระบบเดียว (rewiring slice 2, 2026-10-09 — decisions.md "App role comes from the people rosters")

- **ใครเป็นอะไร** มาจากรายชื่อ 3 ชุดในหน้า "จัดการผู้บริหาร & Gatekeeper" (ไม่มี dropdown กำหนดต่อคนแล้ว):
  อยู่ใน `HrAdminMembers` (active) → `admin` · `ExecutiveMembers` (active) → `executive` ·
  `GatekeeperOfficers` หมวดใดก็ได้ → `gatekeeper` · ที่เหลือที่ login SSO ได้ → `employee`; สูงสุดชนะ —
  `lib/roster-role.ts:pickRole/resolveRosterRole`. จับคู่ด้วยอีเมล session + `CurrentEmail` ของ view HR
  (`lib/directory.ts:findEmployeeByLogin`; view ล่ม → ใช้อีเมล session อย่างเดียว) ทุก request
  (`cache` ต่อ request) → แก้รายชื่อแล้วมีผลตอนเปลี่ยนหน้าครั้งถัดไป
- **ขอบเขต Gatekeeper** = หมวดที่เป็นเจ้าหน้าที่ ∩ checkbox หมวดของ role ในหน้า RBAC (ว่าง → `['HR']`) —
  `lib/ticket-access.ts:resolveViewer` + `lib/roster-role.ts:gatekeeperScope`
- **ทำอะไรได้** = matrix หน้า RBAC (`RoleAccessConfigs`) อย่างเดียว: แท็บที่เห็น; แก้รายชื่อได้ถ้ามีแท็บ
  `admin_gatekeeper` หรือ `rbac_management`; แก้ matrix ได้ถ้ามี `rbac_management` (`lib/tab-guard.ts`);
  permission key ฝั่ง server (`lib/get-user-permissions.ts:permissionsFor`): ไฟล์แนบทุก role,
  `users:read` ← แท็บ `admin_users`, `audit-logs:read` ← แท็บ `admin_audit_logs`, `users:update` ไม่มีใครได้
- **กันล็อกตัวเอง (server):** ลบ/ปิด/เปลี่ยนอีเมล HR admin ของตัวเองไม่ได้ (`CANNOT_REMOVE_SELF`), ห้ามเหลือ
  HR admin active 0 คน (`LAST_ADMIN`) — `lib/actions/hr-admins.ts:assertKeepsAdmins`; รีเซ็ตรายชื่อ HR admin
  เป็นค่าเริ่มต้นเก็บแถวของผู้กดไว้เสมอ; role admin ต้องมีแท็บ `rbac_management` +
  `canManageRolePermissions` เสมอ (`ADMIN_LOCKOUT`, `lib/actions/role-access.ts`)
- **`/admin/users` อ่านอย่างเดียว** — โชว์ role + รายชื่อที่เป็นที่มา (`lib/roster-role.ts:rosterRolesByEmail`,
  จับคู่อีเมล login). `/admin/setup` ใส่คนแรกลง `HrAdminMembers` (Super Admin, รายละเอียดจาก view HR)
- **ฟอร์มรายชื่อ** ช่องชื่อค้นจาก view HR (`HrNameField` + `lib/actions/directory.ts:searchHrEmployees`)
  เลือกแล้วล็อกอีเมล; พิมพ์เองได้สำหรับคนนอก HR (badge "ไม่อยู่ใน HR" — รับเมลได้ login SSO ไม่ได้);
  คนที่พ้นสภาพใน HR ขึ้น badge "พ้นสภาพใน HR" (`lib/directory.ts:hrStatusByEmails`); อีเมลเก็บตัวพิมพ์เล็กเสมอ
- **ฟอร์มยื่นเรื่อง** เติมผู้ยื่นจากโปรไฟล์ HR ของผู้ login (`ShellIdentity.employee`) ไม่ใช่พนักงานตัวอย่าง
- `User.AppRole` ถูกลบแล้ว (migration `20261009140000_drop_user_app_role` รันหลัง
  `20261009120000_roster_roles_data` ที่คัดลอก admin เดิมเข้า `HrAdminMembers`). ตาราง `Role`/`Permission` ใช้แค่ bootstrap `/admin/setup`

## ไฟล์แนบ (Attachments, `ugt-nextjs-upload-setup`, 2026-09-02)

- ไฟล์แนบเกิดขึ้นได้ 2 จุด: ตอนยื่นคำร้องครั้งแรก (`EmployeeSubmitForm.tsx`, ผูกกับ
  `Attachment.ticketId` เท่านั้น) และตอนบันทึกไทม์ไลน์/ข้อความสอบถามภายหลัง
  (`TrackingTimelineModal.tsx`, ผูกทั้ง `ticketId` และ `timelineLogId`) — implement ที่
  `prisma/schema.prisma`'s `attachment` model, ดู `docs/project-context/decisions.md`
  สำหรับเหตุผลที่เลือก FK จริงแทน polymorphic entityType/entityId
- **ไม่มีการสแกนไวรัส** (มติเจ้าของ 2026-10-09) — ไฟล์เขียนลง volume ทันที แถวเป็น
  `scanStatus: 'unscanned'` ดาวน์โหลดได้ปกติ บล็อกเฉพาะแถวที่เป็น `'infected'` —
  `src/app/api/files/route.ts`, `src/app/api/files/[id]/route.ts`
- สิทธิ์ดูไฟล์แนบของแต่ละคำร้อง (`canReadAttachment`) ให้เฉพาะ: admin (ทุกคำร้อง),
  ผู้ยื่นเรื่องเอง (จับคู่ด้วยอีเมล session — ยังไม่มีการผูกบัญชีผู้ใช้กับผู้ยื่นเรื่องที่
  แน่นหนากว่านี้), ผู้บริหาร (เฉพาะคำร้องที่ `isDirectToExecutive`), Gatekeeper (เฉพาะ
  หมวดหมู่ที่ตนรับผิดชอบตาม `RoleAccessConfigs`) — implement ที่
  `lib/attachment-access.ts` (assumption: mirror ตรรกะเดียวกับ `GatekeeperInbox.tsx`/
  `ExecutiveDashboard.tsx` ไม่ได้ไล่อ่านทุกเงื่อนไขในสองไฟล์นั้นซ้ำ)
- **ยังไม่ live**: `EmployeeSubmitForm.tsx`/`TrackingTimelineModal.tsx` ยังใช้ตัวจำลอง
  แนบไฟล์เดิม (`Math.random()`) — ดู `docs/project-context/architecture.md` ⚠ deviation

## CSAT evaluation

- ผู้ยื่นเรื่องประเมินความพึงพอใจได้หลังคำร้อง resolved/closed ให้คะแนน 1-5 ใน หลายมิติ
  (ความเร็ว/คุณภาพการแก้ไข/มารยาท/ความชัดเจน) — implement ที่
  `src/components/SatisfactionModal.tsx`, บันทึกที่ `lib/actions/tickets.ts:submitEvaluation`
  (ส่งซ้ำ = เขียนทับผลเดิมเหมือน upstream; server ยังไม่ validate ช่วงคะแนน)

## Upstream port phase 2 — as-built (2026-10-09, upstream `d20ca0b`)

- **ยื่นเรื่อง**: ผู้ใช้เลือกความเร่งด่วนเอง 4 ระดับ (Low/Medium/High/Critical) และ
  `riskSeverity` map ตามระดับ (`src/components/EmployeeSubmitForm.tsx`); เลือก "ระบุตัวตน" หรือ
  "ไม่ระบุตัวตน" — แบบนิรนามส่ง `confidentiality:'anonymous'` แต่ระบบยังผูก `loginEmail` หลังบ้าน
  (`mapLoginEmailForTicket`, `src/services/employeeDirectory.ts` — ยังเป็น mock); ปุ่ม AI ช่วยเลือก
  หมวดเรียก `suggestCategoryWithAI` → `/api/ai/suggest-category` และ fallback เป็น keyword ฝั่ง
  client (`src/services/categoryHeuristics.ts`)
- **แชทนิรนามสองทาง**: `sendAnonymousChatMessage` (`lib/actions/tickets.ts`) เพิ่ม message + timeline +
  notification สลับผู้รับ employee/gatekeeper — UI ที่ `TrackingTimelineModal`
- **สิทธิ์เห็นอีเมลผู้ยื่นนิรนาม**: `canViewAnonymousSubmitterEmail` ใน RoleAccessConfigs (ค่าเริ่มต้น
  executive/admin) — ใช้ใน `TrackingTimelineModal` และ `ExecutiveDashboard`
- **เรื่องส่งตรง CEO**: Gatekeeper ที่ไม่มี `canViewDirectCeoTickets` ไม่เห็นเรื่องเหล่านี้ใน inbox
  (`GatekeeperInbox.tsx` scopedTickets) และเปิดดูได้แค่หน้า Access Restricted
- **Triage**: Gatekeeper ทบทวน urgency + riskSeverity แล้วส่งเข้า `updateTicketWorkflow`
- **อีเมลแจ้งเตือน** (`lib/email-notifications.ts`, ตั้งค่าใน `AppSettings`): `masterEnabled` +
  `onTicketSubmitted` (→ เจ้าหน้าที่ที่ถูกจ่ายงานอัตโนมัติ + CC Lead ของหมวดเมื่อเป็นคนละคน;
  ยังไม่มอบหมาย → Lead หรือ `escalationEmail`) + `onTicketResolved` (→ ผู้ยื่น) ใช้ token `{ticketId}`
  ฯลฯ, ทุกครั้งลง `EmailDispatchLogs` (2026-10-09)
- **CSAT**: เหลือดาวรวม + "ปัญหาได้รับการแก้ไขถาวรไหม" + ความคิดเห็น (`SatisfactionModal.tsx`) —
  คะแนนรายด้านทั้ง 4 ถูกบันทึกเท่ากับคะแนนรวม
- **Dashboard ผู้บริหาร**: ตัด AI Strategic Briefing เหลือ "Real-Time Insights" + Top-3 ผู้ยื่น,
  drill-down หมวด/root cause 5 มิติ (`ExecutiveDashboard.tsx`)

## ตัวตนอีเมล · รหัสติดตาม · เบอร์โทร (2026-10-09)

- **อีเมลองค์กร**: `ชื่อ@ube.com` (SSO) กับ `ชื่อ@ube.co.th` (HR view) = คนเดียวกัน — เก็บ/แสดงเป็น
  `@ube.com` เสมอ (`lib/email-identity.ts:normalizeEmail`) และเทียบแบบถือว่าเหมือนกัน (`sameEmail`) ทั้ง
  role จากรายชื่อ (`lib/roster-role.ts`), เจ้าของเรื่อง (`lib/ticket-scope.ts:isOwnTicket`/`ownTicketsWhere`),
  แจ้งเตือน, ป้ายสถานะ HR และการหาในข้อมูล HR (`lib/directory.ts`)
- **รหัสติดตาม** `TK-ปี-NNNN` เลขรันต่อปีเริ่ม 0001 (`lib/actions/tickets.ts:nextTrackingCode`) —
  ข้ามเลขที่มีอยู่แล้ว · ขึ้นปีใหม่เริ่ม 0001 ใหม่ (counter แยกต่อปีใน `AppSettings`)
- **เบอร์โทร** กรอกเอง — ไม่ดึงจากข้อมูล HR (HR view ไม่มีเบอร์) และไม่ใส่เบอร์ตัวอย่างแทนเมื่อเว้นว่าง
