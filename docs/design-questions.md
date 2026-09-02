# คำถาม design ที่ยังไม่ปิด — UGT VoiceCare

> Pattern จาก gov-boi-smart: คำถามที่รอคำตอบจากภายนอก (ในที่นี้คือผู้ใช้/
> coordinator ของโปรเจค) **ไม่บล็อกงาน** — ทุกข้อระบุพฤติกรรมระหว่างรอ แล้วไปต่อ
> ปิดคำถามเมื่อไร: ขีดฆ่าหัวข้อ + บันทึกคำตอบและวันที่ · ถ้าคำตอบเปลี่ยนข้อตกลง
> → เพิ่มมติใน `DESIGN.md` ส่วน 10 ด้วย

## ยังค้าง

1. **จะติดตั้ง shadcn/ui + org UI kit (Base UI/`base-mira`, tokens, next-intl,
   DataTable ฯลฯ) เป็นชั้น component primitive สำหรับ "งานหน้าใหม่" หรือไม่?**
   — ถามเมื่อ: 2026-09-02 · ถามใคร: ผู้ใช้/coordinator โปรเจค

   บริบท: `ugt-nextjs-design-setup` (org standard) ออกแบบมาให้ทุกโปรเจครัน
   `shadcn init` + ติดตั้ง org UI kit เสมอ แม้เป็นโปรเจคเดิม — แนวคิดคือ "หน้าเดิม
   grandfathered ไว้ตามเดิม (ไม่ migrate) แต่หน้าใหม่ทุกหน้าใช้ kit กลาง" รอบนี้
   **ไม่ได้ติดตั้ง** substrate นี้เลย เพราะการติดตั้งเต็มรูปแบบต้องแตะไฟล์ที่ทั้งแอป
   share (`app/globals.css`, `app/layout.tsx` — ใส่ font ผ่าน `next/font`,
   ใส่ `NextIntlClientProvider` ห่อทั้งแอป) และเพิ่ม dependency ก้อนใหญ่
   (`@base-ui/react`, `next-intl`, `@tanstack/react-table`, `@tanstack/
react-query`, `react-hook-form`, `zod` (มีอยู่แล้ว), ฯลฯ) ซึ่งมีความเสี่ยงต่อ
   build/behavior ของแอปที่ใช้งานอยู่ในระดับหนึ่ง แม้จะตั้งใจไม่ให้กระทบ visual
   ของหน้าเดิมก็ตาม

   **ทำไมถึงสำคัญตอนนี้**: chunk ถัดไป (`ugt-nextjs-auth-setup`) จะ generate
   หน้าใหม่ (login, `/admin/setup`, `/admin/users`, `/admin/roles`,
   `/admin/audit-logs`) — ถ้าไม่มี shadcn/org kit ติดตั้ง หน้าพวกนี้จะต้องเขียน
   เป็น hand-built Tailwind (ตาม pattern เดิมของแอป) แทน ซึ่งทำได้ แต่จะไม่ได้
   DataTable/FormDialog/StatusBadge กลางที่ auth-setup skill คาดหวังว่ามีอยู่แล้ว

   ตัวเลือก:
   - **(ก) ติดตั้งเป็นชั้น primitive เงียบ ๆ** — รัน `shadcn init` + ติดตั้ง
     org kit + wiring ที่จำเป็น (font, next-intl ขั้นต่ำ) แต่**ไม่แตะ**
     `src/app/(shell)/shell.tsx`/`Navbar.tsx`/`src/components/*` ที่มีอยู่เดิม
     เลย — หน้าใหม่จาก auth-setup ใช้ kit, หน้าเดิมใช้ของเดิม 100%
   - **(ข) ไม่ติดตั้งเลย** — หน้าใหม่จาก auth-setup ก็เขียนแบบ hand-built
     Tailwind ให้เข้ากับ pattern เดิมทั้งแอป (สม่ำเสมอกว่า แต่ไม่ได้ของกลางที่
     org standard คาดหวังไว้ระยะยาว เช่น audit-log table ที่ auth-setup
     คาดว่าจะใช้ `DataTable`)
   - **(ค) ติดตั้งแบบเต็ม + ค่อย ๆ migrate หน้าเดิมทีละหน้า** — ขัดกับมติ
     "คงดีไซน์เดิมทุกประการ" ที่ตั้งไว้ตั้งแต่ต้น ไม่แนะนำ

   **ระหว่างรอ**: ถือว่าตอบ **(ข)** ไปก่อน (ไม่ติดตั้งอะไรเพิ่ม) —
   `ugt-nextjs-auth-setup` ควรเขียนหน้าใหม่ตาม pattern เดิมของแอป (Tailwind
   utilities ตรง ๆ, lucide icon, สีตามตารางใน `DESIGN.md` ส่วน 1) จนกว่าจะมี
   คำตอบชัดเจน จุดที่เปลี่ยนได้ทีเดียว: รัน `ugt-nextjs-design-setup` sync mode
   ใหม่แล้วเลือก (ก) เมื่อพร้อม

2. **จะโหลด Inter + Noto Sans Thai ผ่าน `next/font` แทน system sans-serif
   fallback ปัจจุบันหรือไม่?** — ถามเมื่อ: 2026-09-02 · ถามใคร: ผู้ใช้/coordinator

   บริบท: บรีฟของโปรเจคอธิบาย font ปัจจุบันว่าเป็น "Inter-style" — แปลว่าหน้าตา
   ใกล้เคียง Inter อยู่แล้วเพราะ system-ui font บน Windows/macOS สมัยใหม่คล้ายกัน
   มาก การเปลี่ยนไปโหลด Inter+Noto Sans Thai จริงจะทำให้ **ตัวอักษรเปลี่ยนแปลง
   เล็กน้อยทั่วทั้งแอป** (โดยเฉพาะ Noto Sans Thai ซึ่งเรนเดอร์สระ/วรรณยุกต์ไทย
   ได้แม่นยำกว่า font ระบบบางตัว) — เป็นการเปลี่ยน visual จริงแม้เล็กน้อย จึงไม่
   ทำโดยไม่ถามตามมติต้นโปรเจค

   **ระหว่างรอ**: คงใช้ system sans-serif fallback (`font-sans` เดิม) ไปก่อน

3. **แก้ `<html lang="en">` → `lang="th"` ใน `src/app/layout.tsx`?** — ถามเมื่อ:
   2026-09-02 · ถามใคร: ผู้ใช้/coordinator

   บริบท: เนื้อหาทั้งหมดในแอปเป็นภาษาไทย แต่ root layout ประกาศ `lang="en"` —
   นี่คือบั๊กเล็ก ๆ ที่กระทบ screen reader (อ่านผิดสำเนียง) และ `:lang()` CSS
   selector (ถ้ามีการใช้ในอนาคต) ไม่ใช่การเปลี่ยน visual ที่เห็นด้วยตา จึงมีความ
   เสี่ยงต่ำมากที่จะแก้ แต่ไม่ได้แก้ในรอบนี้เพราะอยู่นอกขอบเขตของ design-setup
   chunk โดยตรง (เป็นบั๊ก ไม่ใช่ design decision)

   **ระหว่างรอ**: คงค่าเดิมไว้ — แก้ได้ทันทีที่จุดเดียว
   (`src/app/layout.tsx:22`) เมื่อได้รับการยืนยัน

## ตอบแล้ว (เก็บไว้กันถามซ้ำ)

_(ยังไม่มี)_
