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
- **`prisma migrate status/deploy` → `P3019 … provider mssql does not match … migration_lock.toml,
sqlserver`** → `migration_lock.toml` was hand-written during the offline migration generation
  with `provider = "sqlserver"`, but Prisma 7 + `@prisma/adapter-mssql` records/expects
  `"mssql"` (every sibling org project's lock says `mssql`) → set `provider = "mssql"`; the
  `schema.prisma` datasource keeps `provider = "sqlserver"` (2026-10-09)
- **`migrate deploy` → `P3018` / SQL Server `5074 The object 'X_df' is dependent on column`**
  → an offline-generated migration did `DROP COLUMN` on a column that still has its DEFAULT
  constraint → add `ALTER TABLE … DROP CONSTRAINT [<Table>_<Column>_df];` before the
  `DROP COLUMN`, then `npx prisma migrate resolve --rolled-back <migration>` and deploy again
  (the migration's `BEGIN TRAN`/`ROLLBACK` meant nothing was half-applied). Hit on
  `20260902030000_add_attachments` (2026-10-09)
- **Jenkins Docker Build → `COPY --from=builder /app/public … "/app/public": not found`** → repo has
  no `public/` (git keeps no empty dir) but the runner stage copies it → `RUN mkdir -p public` in
  the builder before `npm run build` (`Dockerfile`) (2026-10-09)
- **Local SSO → `INVALID_OAUTH_CONFIGURATION`; server log `Discovery fetch failed … fetch failed`
  (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`)** → Keycloak on `ugtweb.ube.co.th` uses the org's internal
  CA; the dev server started from the Claude preview pane didn't inherit `NODE_USE_SYSTEM_CA=1`
  from the shell → start Next with `node --use-system-ca node_modules/next/dist/bin/next dev`
  (keeps TLS verification) or set `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env.local` (dev only).
  Discovery is fetched once at auth init — restart the dev server after fixing (2026-10-09)
- **Offline `prisma migrate diff … > migration.sql` contains `◇ injected env (N) from .env…` lines**
  → dotenv ≥ 17 logs to STDOUT from `prisma.config.ts` → `config({ quiet: true })` (kit 4.63
  fix), delete the stray lines (2026-10-09)
- **Jenkins Unit Tests flake: `RecentSearchesPanel … removes a single history item` → expected [] to
  equal ['TK-BBB-2222']** → real (upstream) bug: recent-search / email-log ids were
  `${Date.now()}-${random 0-999}`, so two items created in the same millisecond could share an id
  and removing one removed both → `uniqueId()` in `src/services/api.ts` (`crypto.randomUUID`) +
  regression test in `src/services/api.test.ts` (2026-10-09)
- **Executive/admin see zero tickets although the DB has rows** → Prisma renders an empty
  `{ AND: [] }` nested inside `OR` as false on SQL Server → `ticketScopeWhere` returns
  `{ isDeleted: false }` when a role has no restriction; never emit an empty `AND` (2026-10-09)
- **Worktree with `node_modules` as a junction to the main checkout: `next dev`/`next build` fail
  ("Symlink node_modules … leaves the filesystem root")** → Turbopack refuses the junction → run
  `next dev --webpack` / `next build --webpack` there; a tsx script that imports a
  `server-only` module needs a tsconfig `paths` alias to `vitest.server-only-stub.js` (2026-10-09)
- **`npm ci` fails with `EPERM … lightningcss.win32-x64-msvc.node` and leaves `node_modules` half
  deleted** → a running `next dev` (preview server) holds the native module open → stop the dev
  server, rerun `npm ci`, then `prisma generate` (2026-10-09)
- **Jenkins TypeScript stage: `TS2307: Cannot find module './x.webp'` while local `tsc` passes** →
  static image imports are typed by `next/image-types/global`, referenced only from `next-env.d.ts`,
  which `next dev/build` generates and `.gitignore` excludes; CI runs `tsc --noEmit` before
  `next build`, so the file does not exist there → commit `src/static-images.d.ts` with
  `/// <reference types="next/image-types/global" />`; reproduce locally by moving `next-env.d.ts`
  aside and running `tsc` (2026-10-09). Stack-wide — candidate for `/ugt-contribute`.
