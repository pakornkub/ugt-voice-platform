# Business Rules — as-built

<!-- กติกา business ที่ระบบ "ทำจริงตอนนี้" — รวมสิ่งที่เปลี่ยนไปจาก brief ระหว่างทาง
     จัดรายโดเมน · ทุกข้อชี้โค้ดที่ implement · ที่มาจากมติ → อ้าง decisions.md
     ไม่เขียนเหตุผลซ้ำ · เขียนเพิ่มเมื่อ feature ✅ done ผ่าน /ugt-handoff
     (brief ของ feature นั้น freeze ทันทีที่สรุปเข้าไฟล์นี้แล้ว) -->

## การยื่นคำร้อง (Submission)

- ทุกคำร้องต้องเลือกประเภท (ข้อร้องเรียน/ข้อเสนอแนะ) และหมวดหมู่ 1 ใน 9 หมวด
  (HR/IT/Safety/Compliance/Ethics/Harassment/Fraud/Quality/Environment) — implement ที่
  `src/components/EmployeeSubmitForm.tsx`, นิยามหมวดหมู่ที่ `src/mockData.ts:CATEGORY_DEFINITIONS`
- ระดับความลับมี 3 แบบ: anonymous / confidential_restricted / standard_named — implement
  ที่ `src/types.ts:ConfidentialityLevel`, ใช้ใน `src/components/EmployeeSubmitForm.tsx`
- คำร้องที่ทำเครื่องหมาย "ส่งตรง CEO/EVP" (`isDirectToExecutive`) จะขึ้นคิว priority แยก —
  implement ที่ `src/types.ts:ComplaintTicket.isDirectToExecutive`, แสดงผลที่
  `src/components/ExecutiveDashboard.tsx` (assumption: ไม่ได้ไล่อ่าน routing logic ทุกจุด)

## Gatekeeper triage & SLA

- แต่ละคำร้องมี `slaTargetHours`/`slaDueDate`/`slaStatus` (on_track / approaching_deadline /
  overdue / met) — implement ที่ `src/types.ts:ComplaintTicket`
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
