# คำถาม design ที่ยังไม่ปิด — UGT VoicePlatform

> Pattern จาก gov-boi-smart: คำถามที่รอคำตอบจากภายนอก (ในที่นี้คือผู้ใช้/
> coordinator ของโปรเจค) **ไม่บล็อกงาน** — ทุกข้อระบุพฤติกรรมระหว่างรอ แล้วไปต่อ
> ปิดคำถามเมื่อไร: ขีดฆ่าหัวข้อ + บันทึกคำตอบและวันที่ · ถ้าคำตอบเปลี่ยนข้อตกลง
> → เพิ่มมติใน `DESIGN.md` ส่วน 10 ด้วย

## ยังค้าง

_(ไม่มี — ทั้ง 3 ข้อที่เคยค้างถูกปิดแล้ว 2026-09-02 ดูด้านล่าง)_

## ตอบแล้ว (เก็บไว้กันถามซ้ำ)

1. ~~จะติดตั้ง shadcn/ui + org UI kit เป็นชั้น component primitive สำหรับ
   "งานหน้าใหม่" หรือไม่?~~ — **ตอบแล้ว 2026-09-02**: **ไม่ติดตั้งเลย**
   แม้แต่สำหรับหน้าใหม่ (login/admin จาก `ugt-nextjs-auth-setup`) —
   ผู้ใช้ยืนยันให้เขียนแบบ hand-built Tailwind เหมือนหน้าเดิมทั้งแอป
   บันทึกมติเต็มที่ `docs/DESIGN.md` §10

2. ~~จะโหลด Inter + Noto Sans Thai ผ่าน `next/font` แทน system sans-serif
   fallback ปัจจุบันหรือไม่?~~ — **ตอบแล้ว 2026-09-02**: **เปลี่ยนเป็น Inter +
   Noto Sans Thai จริง** — implement แล้วที่ `src/app/layout.tsx` +
   `src/app/globals.css`'s `@theme inline`, ตรวจด้วย browser แล้วว่า render
   ถูกต้องไม่กระทบ layout, `npm run build` ผ่านสะอาด บันทึกมติเต็มที่
   `docs/DESIGN.md` §10

3. ~~แก้ `<html lang="en">` → `lang="th"` ใน `src/app/layout.tsx`?~~ —
   **ตอบแล้ว 2026-09-02**: **แก้แล้ว** บันทึกมติเต็มที่ `docs/DESIGN.md` §10
