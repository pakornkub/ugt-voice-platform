# Troubleshooting — เฉพาะโปรเจคนี้

<!-- อาการ → สาเหตุ → วิธีแก้ ของปัญหาที่เคยกินเวลาจริงในโปรเจคนี้ · เขียนผ่าน /ugt-handoff
     ทันทีที่ debug จบ (ตอนรายละเอียดยังสด)
     กติกาสำหรับ AI: เจอ error แปลก — เปิดไฟล์นี้ก่อนเริ่ม debug
     เลื่อนชั้น: ถ้าพิสูจน์ได้ว่าเป็นปัญหาระดับ stack (ทุกโปรเจคบน stack นี้เจอ)
     → เปิด PR ยกขึ้น skill pitfalls ของ platform repo แล้วลบออกจากที่นี่
     — ความรู้ไหลขึ้นทางเดียว ไม่เก็บซ้ำสองที่ -->

- **`ReferenceError: localStorage is not defined` ตอน `next build`/`next dev` (prerender หรือ
  request แรกของแต่ละ route ล่ม 500)** → คอมโพเนนต์ที่มาจาก Vite SPA เดิมอ่าน `localStorage`
  ตรงๆ ใน render body (ไม่ใช่ใน `useEffect`) ซึ่ง Next.js server-render `'use client'`
  คอมโพเนนต์รอบแรกก่อน hydrate เสมอ แม้จะตั้ง `export const dynamic = 'force-dynamic'` แล้วก็
  ยังโดน (แค่ปิด static caching ไม่ได้ปิด SSR pass) → แก้โดยเปลี่ยนทุกจุดที่เรียก
  `localStorage.getItem/setItem/removeItem` ใน `src/services/api.ts` และ
  `src/services/sqliteDb.ts` ให้ผ่าน `src/services/safeStorage.ts` แทน (no-op บน server, งาน
  เหมือนเดิมทุกจุดในเบราว์เซอร์) (2026-09-02)
- **`export const dynamic` ใน route segment ไม่มีผลเมื่ออยู่ในไฟล์ที่มี `'use client'`** →
  แยก layout ออกเป็นสองไฟล์: `layout.tsx` (Server Component เปล่าๆ ที่ export `dynamic` แล้ว
  เรียก client component) กับ `shell.tsx` (`'use client'`, logic จริงทั้งหมด) — ดูตัวอย่างที่
  `src/app/(shell)/layout.tsx` + `src/app/(shell)/shell.tsx` (2026-09-02)
- **`next build`'s type-check ล่มที่ enum comparison ที่ไม่เคยเป็น true ได้** (เช่น
  `t.slaStatus === 'breached'`, `t.status === 'rejected'` ที่ไม่มีใน type จริง) → เป็น
  dead-code bug เดิมจากโปรเจค Vite ที่ `vite build`/`tsc --noEmit` (แบบเดิม) ไม่เคยจับเพราะ esbuild
  ไม่ type-check ตอน build — `next build` type-check เข้มกว่า แก้โดยเทียบกับค่า enum จริง
  (`'overdue'`) หรือลบ branch ที่ตายแล้วออก ดู `src/components/ExportAnalyticsModal.tsx`,
  `src/components/GatekeeperInbox.tsx` (2026-09-02)
