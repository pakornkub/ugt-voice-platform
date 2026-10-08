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
- **`npm run lint` ล่มด้วย `ERR_MODULE_NOT_FOUND` หรือ `nextVitals is not iterable`** →
  `eslint-config-next` ที่ติดตั้งอยู่เป็นสาย 15.x ซึ่งส่งออก legacy eslintrc-style config
  object ไม่ใช่ flat-config array — `eslint.config.mjs` (ตั้งแต่ 2026-10-08) import
  `eslint-config-next/core-web-vitals` ตรงๆ ซึ่งต้องใช้สาย 16.x — แก้โดยให้
  `eslint-config-next` อยู่สายเดียวกับ `next` (16.x) เสมอ อย่าถอยไปใช้ `FlatCompat`
  (2026-09-02, ปรับ 2026-10-08)
- **`vitest` test ของ `src/app/api/ai/*/route.test.ts` ที่ตั้งใจ test fallback (ไม่มี
  `GEMINI_API_KEY`) กลับได้ผลลัพธ์จริงจาก Gemini แบบสุ่ม/ไม่ deterministic** → เครื่อง dev
  บางเครื่องมี `GEMINI_API_KEY` จริงตั้งไว้เป็น **ambient shell env var** (ไม่ใช่จาก
  `.env.local`) ซึ่ง vitest's `test.env` ไม่ได้ isolate จาก process env ที่สืบทอดมา (แค่ "เพิ่ม"
  ค่าลงไป ไม่ได้ "ล้าง" ค่าที่มีอยู่แล้ว) → แก้โดยตั้ง `GEMINI_API_KEY: ''` ชัดเจนใน
  `vitest.config.ts`'s `test.env` (ดูคอมเมนต์ในไฟล์) เพื่อบังคับ fallback branch แน่นอนไม่ว่า
  เครื่องที่รันจะมี key จริงหรือไม่ (2026-09-02)
- **`npm run build` ล่มด้วย `ENOENT: no such file or directory, rename
'.next\export\500.html' -> '.next\server\pages\500.html'` บน Windows** → เจอครั้งเดียวตอน
  build ทับ `.next` เดิมที่ค้างจาก build ก่อนหน้า (ไฟล์ล็อก/half-written จาก process ก่อน) —
  ไม่ reproduce ซ้ำ ลบ `.next/` แล้ว build ใหม่ (`rm -rf .next && npm run build`) ผ่านสะอาด —
  ถ้าเจอซ้ำบ่อยบนเครื่อง dev ตัวไหน ให้สงสัย antivirus/OneDrive sync ล็อกไฟล์ระหว่าง build
  (2026-09-02)
- **`next build`/vitest ล่มด้วย `Cannot find module './runtime-reacts.external'` หรือ
  `'./typescript/runTypeScriptCli'` หลัง `npm install`** → `npm install` สองตัวรันพร้อมกันใน
  checkout เดียว (ตัวแรกค้างจาก session ก่อน) ทำให้ `node_modules/next` มีไฟล์ครึ่ง ๆ — npm
  ตัวหลังขึ้น `ENOTEMPTY` → รอ/ปิด npm ตัวที่ค้างก่อน แล้ว `npm ci` ใหม่ทั้งหมด (2026-10-08)
- **`next build` ล่มด้วย `Module '"@prisma/client"' has no exported member 'ticket'`/`PrismaClient`
  หลัง `npm ci`** → `npm ci` ล้าง `node_modules` รวม Prisma client ที่ generate ไว้ และโปรเจคนี้
  ไม่มี `postinstall` → รัน `npx prisma generate` (ไม่ต้องต่อ DB) แล้ว build ใหม่ (2026-10-08)
- **vitest ล้มด้วย `[vitest-pool-runner]: Timeout waiting for worker to respond` / `Test Files
no tests`** → ไม่ใช่ test พัง — เครื่องโหลดหนัก (CPU ~90% จาก vitest/build ของโปรเจคอื่นรัน
  พร้อมกัน) worker start ไม่ทัน → รันใหม่ตอนเครื่องว่าง หรือ `npx vitest run --maxWorkers=1
--no-file-parallelism` (2026-10-08)
