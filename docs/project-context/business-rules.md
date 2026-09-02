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

## RBAC (ยังไม่ผูก authentication จริง — ดู ⚠ deviation ใน architecture.md)

- Role มี 4 แบบ: employee / gatekeeper / executive / admin แต่ละ role มี `allowedTabs` ที่
  ปรับได้ผ่านหน้า RBAC Management — implement ที่
  `src/components/RoleBasedAccessManagement.tsx`, เก็บที่
  `src/services/api.ts:getStoredRolePermissions/saveStoredRolePermissions`

## CSAT evaluation

- ผู้ยื่นเรื่องประเมินความพึงพอใจได้หลังคำร้อง resolved/closed ให้คะแนน 1-5 ใน หลายมิติ
  (ความเร็ว/คุณภาพการแก้ไข/มารยาท/ความชัดเจน) — implement ที่
  `src/components/SatisfactionModal.tsx`, บันทึกที่ `src/services/api.ts:submitEvaluation`
  (assumption: ยังไม่ได้ตรวจ validation ครบทุก field)
