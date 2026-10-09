---
paths:
  - 'lib/storage.ts'
  - 'lib/attachment-access.ts'
  - 'src/app/api/files/**/*.ts'
  - 'lib/upload-client.ts'
  - 'src/components/AttachmentPicker.tsx'
---

# Uploading and serving files in this project

Installed by `ugt-nextjs-upload-setup` (2026-09-02). Routes live under
`src/app/api/files/` (not root `app/`); the skill's `file-upload.tsx` widget was replaced on
2026-10-09 (rewiring slice 4) by `src/components/AttachmentPicker.tsx` + `lib/upload-client.ts`
— this project's Phase A migration put every route/component under `src/`, and
`lib/*` stays at the repo root per the database chunk's own convention (see
`docs/project-context/decisions.md`).

**No next-intl / org UI kit in this project** (standing design decision, see
`docs/DESIGN.md` §10 and `.claude/rules/ugt-nextjs-design.md`) —
`AttachmentPicker.tsx` is hand-built Tailwind with hardcoded Thai error copy, not
the skill's `useTranslations('upload')` + `components/ui/button` /
`ui/icon-action` asset. Don't reintroduce those imports here.

**Linking**: attachments have a required `ticketId` FK and an optional
`timelineLogId` FK (real foreign keys, not the skill's default polymorphic
`entityType`/`entityId`) — see the `attachment` model in `prisma/schema.prisma`
and `docs/project-context/decisions.md` for why.

| กฎ                                                                                                                                                  | เหตุผล                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **ไม่มีสแกนไวรัส** (มติเจ้าของ 2026-10-09 — `[SCAN]` ของ skill ปิดไว้) แถวใหม่เป็น `scanStatus: 'unscanned'`                                        | ห้ามเพิ่มการสแกนไวรัสกลับมาโดยไม่มีมติใหม่                                            |
| **path มาจาก id ที่ระบบสร้าง ห้ามมาจากชื่อไฟล์ผู้ใช้**                                                                                              | กัน path traversal — ชื่อเดิมเก็บใน DB ไว้แสดงผลเท่านั้น                              |
| **ห้ามเก็บไฟล์ใน `public/`**                                                                                                                        | ทุกอย่างใน `public/` เสิร์ฟโดยไม่ผ่าน auth                                            |
| **ดาวน์โหลดผ่าน route ที่ guard เท่านั้น** — session → permission → `canReadAttachment` (ขอบเขตของ ticket) → บล็อกเฉพาะ `scanStatus === 'infected'` | ไฟล์อยู่บน volume ก็เพื่อให้ไม่มีทางลัดข้าม guard                                     |
| **ส่งกลับเป็น `application/octet-stream` + `Content-Disposition: attachment` เสมอ**                                                                 | ไฟล์ `.svg`/`.html` ที่ไม่มีไวรัสก็ยังเป็น stored XSS ได้ถ้าเปิด inline บนโดเมนเรา    |
| ไม่เจอไฟล์ กับ ไม่มีสิทธิ์ ตอบ **404 เหมือนกัน**                                                                                                    | 403 เป็นการยืนยันว่า id นั้นมีอยู่จริง                                                |
| ลบ = `IsDeleted = 1` ไม่ลบไฟล์ทันที — **ยังไม่มี retention/cleanup job ติดตั้ง**                                                                    | กู้คืนได้ · รอมติองค์กรเรื่อง background job ก่อนถึงจะลบไบต์จริงได้ (ดู decisions.md) |
| อัปโหลดใช้ **Route Handler ไม่ใช่ Server Action**                                                                                                   | Server Action จำกัด body ที่ `bodySizeLimit` (ค่าเริ่มต้น 1 MB) แล้ว error กำกวม      |
| `canReadAttachment` = เห็นเรื่องนั้นได้ (`resolveViewer` + `findVisibleTicket`, role จากรายชื่อ)                                                    | ไฟล์แนบต้องไม่กว้างกว่าสิทธิ์เห็นเรื่อง — ไม่อ่าน `User.AppRole` (เลิกใช้ 2026-10-09) |

```ts
// ✅ ลำดับที่ถูก (ไม่มี virus scan ในโปรเจคนี้)
await writeStoredFile(key, bytes);
await prisma.attachment.create({ data: {/* … */} });
await auditLog(userId, AUDIT_ACTIONS.FILES_UPLOAD, {/* … */});
```

**ต่อกับหน้าจริงแล้ว (2026-10-09, rewiring slice 4)**: ฟอร์มยื่นเรื่องเก็บไฟล์ที่เลือกไว้ฝั่ง browser
แล้วอัปโหลดผ่าน `lib/upload-client.ts:uploadTicketFiles` หลัง `submitTicket` คืน id (route ต้องมี
ticket อยู่ก่อน) — อัปโหลดไม่สำเร็จไม่ทำให้เรื่องหาย แสดงรายการที่พลาด + ปุ่มลองใหม่; หน้าติดตาม
แสดงไฟล์จาก DB เป็นลิงก์ `attachmentDownloadUrl(id)` (มี basePath) ไปยัง route ที่ guard ไว้.
ไม่มีปุ่มแนบไฟล์ในหน้าติดตาม (upstream ไม่มี).
