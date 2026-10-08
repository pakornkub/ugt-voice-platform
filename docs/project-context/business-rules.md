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

## Gatekeeper triage

- **ไม่มี SLA แล้ว** (ตัดทั้งระบบตาม upstream `8d885a3`, 2026-10-08): ไม่มี
  `slaTargetHours`/`slaDueDate`/`slaStatus`/`defaultSlaHours`/`slaComplianceRate` และไม่มี
  notification `sla_warning` — ความเร่งด่วนดูจาก `urgency` (Low/Medium/High/Critical) +
  `riskSeverity` ที่ Gatekeeper แก้ได้ผ่าน `updateTicketWorkflow()`
  (`src/services/api.ts`) — implement ที่ `src/types.ts:ComplaintTicket`
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
- Gatekeeper เห็นเฉพาะคำร้องในหน่วยงานที่ตนรับผิดชอบ ยกเว้นมี `canViewAllDepartments` —
  implement ที่ `src/components/GatekeeperInbox.tsx`, config ที่
  `src/types.ts:RolePermissionConfig`/`DepartmentGatekeeperConfig` (assumption: filter logic
  ไม่ได้ตรวจทุกบรรทัด)

## RBAC — สองระบบแยกกัน (`ugt-nextjs-auth-setup`, 2026-09-02 — ดู decisions.md)

- **บทบาทหลักของแอป** มี 4 แบบ: employee / gatekeeper / executive / admin แต่ละ role มี
  `allowedTabs` ที่ปรับได้ผ่านหน้า RBAC Management — implement ที่
  `src/components/RoleBasedAccessManagement.tsx`, เก็บที่
  `src/services/api.ts:getStoredRolePermissions/saveStoredRolePermissions` — **บทบาทของผู้ใช้
  แต่ละคนตอนนี้มาจาก `user.appRole` จริงในฐานข้อมูล** (กำหนดโดย admin จากหน้า
  "จัดการผู้ใช้" `/admin/users`) ไม่ใช่ dropdown สลับอิสระอีกต่อไป — ผู้ใช้ที่ยังไม่ถูกกำหนด
  `appRole` จะเห็นหน้า "รอผู้ดูแลระบบกำหนดสิทธิ์การใช้งาน" แทนแอปจริง
- **สิทธิ์หน้าผู้ดูแลระบบ** (`/admin/users`/`/admin/roles`/`/admin/audit-logs`) เป็นคนละระบบ —
  ใช้ RBAC role/permission ใหม่ (`Role`/`Permission`/`RolePermission`) จัดการที่หน้า
  `/admin/roles`, ไม่เกี่ยวกับบทบาทหลักของแอปด้านบน (ดู `docs/project-context/decisions.md`
  เหตุผลที่ไม่รวมสองระบบเข้าด้วยกัน)

## ไฟล์แนบ (Attachments, `ugt-nextjs-upload-setup`, 2026-09-02)

- ไฟล์แนบเกิดขึ้นได้ 2 จุด: ตอนยื่นคำร้องครั้งแรก (`EmployeeSubmitForm.tsx`, ผูกกับ
  `Attachment.ticketId` เท่านั้น) และตอนบันทึกไทม์ไลน์/ข้อความสอบถามภายหลัง
  (`TrackingTimelineModal.tsx`, ผูกทั้ง `ticketId` และ `timelineLogId`) — implement ที่
  `prisma/schema.prisma`'s `attachment` model, ดู `docs/project-context/decisions.md`
  สำหรับเหตุผลที่เลือก FK จริงแทน polymorphic entityType/entityId
- ทุกไฟล์ผ่านการสแกนไวรัส (ClamAV) ก่อนเขียนลง volume เสมอ — สแกนเนอร์ล่ม/timeout =
  ปฏิเสธการอัปโหลด (fail closed) ไม่ใช่ปล่อยผ่าน — implement ที่ `lib/virus-scan.ts`,
  `src/app/api/files/route.ts`
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
  `src/components/SatisfactionModal.tsx`, บันทึกที่ `src/services/api.ts:submitEvaluation`
  (assumption: ยังไม่ได้ตรวจ validation ครบทุก field)
