---
paths:
  - 'lib/storage.ts'
  - 'lib/virus-scan.ts'
  - 'lib/attachment-access.ts'
  - 'src/app/api/files/**/*.ts'
  - 'src/components/FileUpload.tsx'
---

# Uploading and serving files in this project

Installed by `ugt-nextjs-upload-setup` (2026-09-02). Routes live under
`src/app/api/files/` (not root `app/`) and the widget at
`src/components/FileUpload.tsx` (PascalCase, not `components/file-upload.tsx`)
— this project's Phase A migration put every route/component under `src/`, and
`lib/*` stays at the repo root per the database chunk's own convention (see
`docs/project-context/decisions.md`).

**No next-intl / org UI kit in this project** (standing design decision, see
`docs/DESIGN.md` §10 and `.claude/rules/ugt-nextjs-design.md`) —
`FileUpload.tsx` is hand-built Tailwind with hardcoded Thai error copy, not
the skill's `useTranslations('upload')` + `components/ui/button` /
`ui/icon-action` asset. Don't reintroduce those imports here.

**Linking**: attachments have a required `ticketId` FK and an optional
`timelineLogId` FK (real foreign keys, not the skill's default polymorphic
`entityType`/`entityId`) — see the `attachment` model in `prisma/schema.prisma`
and `docs/project-context/decisions.md` for why.

| กฎ                                                                                                                                         | เหตุผล                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **สแกนก่อนเขียนลง volume เสมอ** — ไฟล์ติดไวรัสต้องไม่เคยอยู่บนดิสก์แม้ชั่วครู่                                                             | ถ้าเขียนก่อนสแกน มีช่วงที่ไฟล์อันตรายอยู่บนเครื่องจริง                                    |
| **fail closed** — สแกนเนอร์ล่ม/timeout = ปฏิเสธ (503) ห้ามปล่อยผ่าน                                                                        | สแกนเนอร์ที่ล่มแล้วยอมให้ผ่าน แย่กว่าไม่มีสแกนเนอร์ เพราะทุกคนเชื่อว่ามีการตรวจ           |
| **path มาจาก id ที่ระบบสร้าง ห้ามมาจากชื่อไฟล์ผู้ใช้**                                                                                     | กัน path traversal — ชื่อเดิมเก็บใน DB ไว้แสดงผลเท่านั้น                                  |
| **ห้ามเก็บไฟล์ใน `public/`**                                                                                                               | ทุกอย่างใน `public/` เสิร์ฟโดยไม่ผ่าน auth                                                |
| **ดาวน์โหลดผ่าน route ที่ guard เท่านั้น** — session → permission → `canReadAttachment` (ขอบเขตของ ticket) → เช็ค `scanStatus === 'clean'` | ไฟล์อยู่บน volume ก็เพื่อให้ไม่มีทางลัดข้าม guard                                         |
| **ส่งกลับเป็น `application/octet-stream` + `Content-Disposition: attachment` เสมอ**                                                        | ไฟล์ `.svg`/`.html` ที่ไม่มีไวรัสก็ยังเป็น stored XSS ได้ถ้าเปิด inline บนโดเมนเรา        |
| ไม่เจอไฟล์ กับ ไม่มีสิทธิ์ ตอบ **404 เหมือนกัน**                                                                                           | 403 เป็นการยืนยันว่า id นั้นมีอยู่จริง                                                    |
| ลบ = `IsDeleted = 1` ไม่ลบไฟล์ทันที — **ยังไม่มี retention/cleanup job ติดตั้ง**                                                           | กู้คืนได้ · รอมติองค์กรเรื่อง background job ก่อนถึงจะลบไบต์จริงได้ (ดู decisions.md)     |
| อัปโหลดใช้ **Route Handler ไม่ใช่ Server Action**                                                                                          | Server Action จำกัด body ที่ `bodySizeLimit` (ค่าเริ่มต้น 1 MB) แล้ว error กำกวม          |
| `canReadAttachment` เขียนจาก appRole + submitter email + RoleAccessConfigs ของโปรเจคนี้จริง                                                | mirror ตรรกะเดียวกับ `GatekeeperInbox.tsx`/`ExecutiveDashboard.tsx` — ไม่ใช้ `!canSeeAll` |

```ts
// ✅ ลำดับที่ถูก
const scan = await scanBuffer(bytes);
if (scan.status !== 'clean') return refuse(scan); // fail closed
await writeStoredFile(key, bytes); // ค่อยเขียน
await prisma.attachment.create({ data: {/* … */} });
await auditLog(userId, AUDIT_ACTIONS.FILES_UPLOAD, {/* … */});
```

**ยังไม่ได้ต่อกับหน้าจริง**: `EmployeeSubmitForm.tsx`/`TrackingTimelineModal.tsx`
ยังใช้ตัวจำลองแนบไฟล์เดิม (`Math.random()`) ผ่าน `src/services/api.ts`
(localStorage) — `FileUpload.tsx`/`/api/files` พร้อมใช้งานจริงแล้ว
แต่รอการสลับ call site จาก localStorage ไปที่ Prisma Server Actions
เหมือนกับทุก chunk ก่อนหน้า (ดู `docs/project-context/decisions.md`).

**ClamAV ยังไม่มีใน docker-compose/Dockerfile** — ยัง**ไม่มีไฟล์เหล่านี้ในโปรเจคเลย**
(รอ `ugt-nextjs-cicd-setup`) แอปจึงยังต่อสแกนเนอร์จริงไม่ได้จนกว่าจะ apply
`assets/compose-and-dockerfile.snippet.md` เป็น close-out step หลัง CI/CD chunk —
ดู `.claude/state/handoff.md`.
