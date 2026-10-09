# UGT VoicePlatform — Design Agreement

> Gen โดย `ugt-nextjs-design-setup` เมื่อ 2026-09-02 (existing-project scan mode) ·
> อิงมาตรฐานกลาง `ugt-core/contracts/design.md` (ugt-core **2.10.0**)
> **โหมดพิเศษของไฟล์นี้**: โปรเจคนี้ไม่ได้เริ่มจากศูนย์ — มันคือแอปที่มีดีไซน์
> สมบูรณ์อยู่แล้ว (พอร์ตมาจาก Vite+React SPA) และมติที่ตั้งไว้ตั้งแต่ต้นโปรเจค
> (ดู `docs/project-context/decisions.md`, 2026-09-02) คือ **"คงดีไซน์/UX/workflow
> เดิมไว้ทุกประการ"** ระหว่างย้ายมาใช้ org standard infra (DB/Auth/CI) — ไฟล์นี้จึง
> บันทึก **สิ่งที่แอปทำอยู่จริงวันนี้เป็นข้อตกลง** ไม่ใช่ค่ากลางองค์กร และรายการที่
> ต่างจากมาตรฐานกลาง **ทั้งหมด** ถูกบันทึกเป็น deviation ที่ตั้งใจ (ส่วน 9) ไม่ใช่
> หนี้ทางเทคนิคที่ต้องตามแก้
> เปลี่ยนข้อตกลง = แก้ไฟล์นี้ + เพิ่มแถวใน "มติ" (ส่วน 10) พร้อมวันที่และเหตุผล

## 0. กฎเหล็ก (ทุกโปรเจคเหมือนกัน — ไม่มีข้อยกเว้น)

องค์กรกำหนดกฎเหล็ก 8 ข้อไว้ใน `ugt-core/contracts/design.md` (shadcn-first ladder,
lucide-only, ขนาด control มาตรฐาน, DataTable กลาง, `lib/format.ts` กลาง, a11y
ขั้นต่ำ, ไฟล์นี้ชนะโค้ด) — **โปรเจคนี้ยังไม่ได้ apply กฎเหล็กชุดนี้** เพราะยังไม่ได้
ติดตั้ง shadcn/ui หรือ org UI kit เลย (ดูเหตุผลในส่วน 9 และคำถามที่ยังไม่ปิดใน
`docs/design-questions.md`) กฎเหล็กที่ใช้จริงในโปรเจคนี้วันนี้คือกฎที่บันทึกไว้ใน
ส่วน 1–8 ด้านล่าง ซึ่งสรุปจากโค้ดจริง ไม่ใช่จากมาตรฐานกลาง

## 1. Visual identity

- **แหล่งอ้างอิง**: แอป UGT VoicePlatform เดิม (Vite+React SPA ก่อน migrate, ดู
  `docs/project-context/decisions.md` 2026-09-02) — ดีไซน์นี้ถูกออกแบบไว้ก่อน
  โปรเจคนี้จะเข้า org standard pipeline และเป็นสิ่งที่ต้องคงไว้ ไม่ใช่ทำใหม่
- **primary**: **indigo** (Tailwind `indigo-*` scale ตรง ๆ — `indigo-600`/`700`
  เป็นหลักสำหรับปุ่มหลัก/ลิงก์ที่ active/focus ring) — **ตรงกับค่ากลางองค์กร
  (indigo) พอดี โดยบังเอิญ** ไม่ต้องเปลี่ยน ถ้าวันหน้าติดตั้ง shadcn token จริง
  `--primary` ควร map ไปที่ indigo เดิม
- **base**: `slate-*` scale (พื้นหลัง `slate-50`, ข้อความ `slate-900`, เส้นขอบ
  `slate-200`) — ไม่ใช่ neutral hue 258 ตามค่ากลาง (Tailwind slate มี hue ที่
  ต่างจาก preset `base-mira` เล็กน้อย) ยังไม่เคยวัด/เทียบอย่างเป็นทางการ
- **dark mode**: **ไม่มี** — ไม่มี `ThemeProvider`/toggle ในโค้ด ทุกหน้า render
  เป็น light theme เดียว (ดูมติส่วน 10 — ตัดสินใจไม่ใส่ตอนนี้ เพราะไม่มีจุด mount
  ปุ่ม toggle ใน shell เดิม)
- **สีความหมายตามบทบาท/สถานะ** (ใช้แทนชุด `--status-*` มาตรฐาน 6 สี — โปรเจคนี้
  ไม่ได้ใช้ `StatusBadge` กลาง แต่ hardcode สีต่อจุดตามตาราง):

  | สี        | ใช้กับ                                                     |
  | --------- | ---------------------------------------------------------- |
  | `emerald` | บทบาทพนักงาน (Employee) · สถานะสำเร็จ/CSAT · toast สำเร็จ  |
  | `blue`    | บทบาท Gatekeeper · แจ้งเตือนทั่วไป (`clock` icon)          |
  | `purple`  | บทบาทผู้บริหาร (Executive/CEO) · แจ้งเตือน CEO alert       |
  | `rose`    | บทบาท Admin/RBAC · action อันตราย (ลบ/ยกเลิกสิทธิ์)        |
  | `indigo`  | primary/interactive — ปุ่มหลัก, tab ที่ active, focus ring |
  | `slate`   | พื้น/ข้อความ/เส้นขอบทั่วไป                                 |

  Mapping นี้ **สม่ำเสมอทุกจุดในแอป** (`Navbar.tsx`'s `roleLabels`, notification
  icon ใน `shell.tsx`, tab highlight) — เทียบเท่าการมี design token แม้จะไม่ได้
  ประกาศเป็น CSS variable จริง

- **มุมโค้ง**: ใช้หลายระดับผสมกันตามหน้า — `rounded-lg`/`rounded-xl` สำหรับ
  control/card ทั่วไป, **`rounded-2xl`/`rounded-3xl` ใช้จริงใน 12 ไฟล์ (32 จุด)**
  เช่น toast (`shell.tsx`), mobile-simulator frame, role dropdown menu — **นี่คือ
  deviation ตรงจากกฎเหล็กองค์กรข้อ "ห้าม rounded-2xl/3xl/4xl"** (ส่วน 9)
- **เมนู/dropdown**: พื้นทึบสีขาว, shadow-xl, ไม่มี translucent/blur (ยกเว้น
  backdrop overlay ของ notification drawer ที่ใช้ `backdrop-blur-xs`)

## 2. Typography

- **Inter + Noto Sans Thai โหลดจริงผ่าน `next/font/google`** (มติ 2026-09-02,
  ส่วน 10) — `src/app/layout.tsx` โหลดทั้งสอง font เป็น CSS variable
  (`--font-inter`, `--font-noto-sans-thai`) ผูกกับ `<html>`; `src/app/
globals.css`'s `@theme inline` map `--font-sans` ให้ชี้ไปที่ font เหล่านี้ ทำให้
  Tailwind utility `font-sans` เดิม (ที่ `shell.tsx`'s root div) ได้ font ใหม่
  โดยไม่ต้องแก้ className ที่ไหนเพิ่ม — ก่อนหน้านี้ fallback เป็น system font,
  เปลี่ยนแล้ว (เป็นการเปลี่ยน visual เล็กน้อยที่ตั้งใจ ไม่ใช่ค้าง)
- `<html lang="th">` — **แก้แล้ว** (เดิมเป็น `lang="en"` ทั้งที่เนื้อหาเป็นไทย
  ทั้งหมด, มติ 2026-09-02 ส่วน 10)
- ขนาดตัวอักษร: หลากหลายตามจุด ไม่ได้ตั้ง scale กลาง — พบ `text-[10px]` ถึง
  `text-lg` กระจายอยู่ (ไม่ผ่าน token กลางเหมือนกฎเหล็กองค์กร)

## 3. Layout & app shell

- **Shell**: **Topbar** (ไม่ใช่ sidebar) — `src/app/(shell)/shell.tsx` +
  `src/components/Navbar.tsx`:
  - Sticky top header (โลโก้ + ชื่อแอป + search กล่องติดตาม + ปุ่ม quick action,
    ปุ่มประวัติการค้นหา, ปุ่มสลับภาษา TH/EN, notification bell และเมนูตัวตน SSO
    พร้อมปุ่มออกจากระบบ — role มาจาก `user.appRole` ไม่มี role switcher แล้ว)
  - แถบ tab นำทางใต้ header (scroll แนวนอน, ไม่ wrap — ตรงกับกฎ overflow
    ขององค์กร)
  - Mobile: bottom nav bar คงที่ (5 ปุ่มหลัก) แทน tab bar — ไม่ใช่รูปแบบ
    "table→card / dialog→bottom-sheet" ของ org kit เพราะไม่มี DataTable/Dialog
    กลางให้ใช้
  - Notification: slide-over drawer จากขวา (ไม่ใช่ dropdown/`Sheet` primitive)
  - Modal: centered overlay (`TrackingTimelineModal`, `SatisfactionModal`,
    `ExportAnalyticsModal`, `InvestigationReportModal`) — hand-built ไม่ใช่ shadcn `Dialog`;
    การยืนยันใช้ `ConfirmDialog` กลาง (in-app แบบ upstream แทน `window.confirm`)
- **User menu**: เมนูตัวตน SSO แบบ hand-built ใน `Navbar.tsx` (ชื่อ/อีเมล/role + ออกจาก
  ระบบ) แทน role switcher เดิม (ปลดโดย `ugt-nextjs-auth-setup`) — ไม่ใช่ `NavUser` ของ org kit
- **ไม่มีโลโก้แยกไฟล์** — ไอคอน `Shield` (lucide) ในกล่อง gradient indigo→blue
  ทำหน้าที่แทนโลโก้บริษัท (ไม่มี `public/brand/*.svg`)
- Nav highlight: current tab = exact match กับ `activeTab` (ไม่ใช่ longest-prefix
  แบบ org rule เพราะโครงสร้าง route เป็น flat ไม่มี nested path ที่ชนกัน)
- Landing page: ไม่มี — เข้าแอปที่หน้า `/submit` (ยื่นคำร้อง) ทันที เทียบเท่า
  ค่ากลางองค์กร "ไม่มี — login เข้าแอปเลย" (แม้ตอนนี้ยังไม่มี login จริง)

## 4. Components

**โปรเจคนี้ไม่มี org UI kit / shadcn/ui component ใด ๆ ติดตั้งอยู่** —
`src/components/*.tsx` ทั้งหมด (12 ไฟล์) เป็น hand-built component ใช้ Tailwind
utility classes ตรง ๆ + `lucide-react` icon ไม่มี component primitive กลาง
(ไม่มี Button/Input/Dialog/Table ของ shadcn) รายละเอียดที่ต่างจากกฎเหล็กองค์กร:

- **ตาราง**: hand-rolled `<table>`/grid layout ใน `AdminGatekeeperManagement`,
  `GatekeeperInbox`, `RoleBasedAccessManagement`, `MyTicketsList` — ไม่มี
  `DataTable` กลาง, ไม่มี column persistence, ไม่มี server-side pagination
- **ฟอร์ม**: `useState` ต่อช่องใน `EmployeeSubmitForm` — ไม่ผ่าน zod +
  react-hook-form
- **วันที่/ตัวเลข**: `toLocaleDateString`/`toLocaleString` เรียกตรงในหลายจุด —
  ไม่มี `lib/format.ts` กลาง (มี `lib/` ระดับ root แล้วจาก `ugt-nextjs-
database-setup` แต่เป็นคนละเรื่อง — ไม่มี formatter ในนั้น)
- **Icon**: lucide-react ล้วน (ตรงกับกฎเหล็กองค์กรข้อนี้ข้อเดียว) แต่ไม่มี
  mapping ตายตัวที่บันทึกเป็นเอกสาร — อนุมานจากการใช้งานจริง: เพิ่ม/ยื่นคำร้อง
  `FileText`, ลบ/ปฏิเสธ ไม่มี pattern ชัดเจน (ยังไม่เคยมีปุ่มลบในแอป), Badge
  แจ้งเตือน `Bell`, สำเร็จ `CheckCircle2`, เวลา/รอ `Clock`, ปิด `X`
- **Badge/สถานะ**: สีสถานะ hardcode ต่อจุด (ดูตารางส่วน 1) ไม่ผ่าน `StatusBadge`
  กลาง
- ไม่มี export UI (`ExportAnalyticsModal`'s SQL Studio เป็นกรณีพิเศษที่มีมติ
  แยกอยู่แล้วใน `decisions.md` — จะเปลี่ยนเป็น preset reports ก่อนต่อ SQL Server
  จริง)

## 5. Format การแสดงผล

- **ยังไม่มี `lib/format.ts` กลาง** — วันที่ใช้ `toLocaleDateString('th-TH', …)`/
  `toLocaleTimeString([], …)` เรียกตรงในคอมโพเนนต์ (ไม่รวมศูนย์) ต่างจาก
  กฎเหล็กองค์กร "ผ่าน `lib/format.ts` เท่านั้น" — deviation ที่บันทึกไว้ (ส่วน 9)
  รูปแบบที่เห็นจริงคือปฏิทิน ค.ศ. (`Date` object มาตรฐาน JS) ไม่มีปัญหาปีพ.ศ.
- **ภาษา UI**: สองภาษา TH/EN (ค่าเริ่มต้นไทย) ผ่าน `src/context/LanguageContext.tsx`
  แบบเดียวกับ upstream — ไม่ใช้ `next-intl` (ดูมติ 2026-10-08 ใน §10)

## 6. Feedback & states

- Toast: กล่องลอยมุมขวาบน (`shell.tsx`'s `toastMessage` state) พื้นดำ
  (`bg-slate-900`) ไอคอน `CheckCircle2` สีเขียว — ใช้แบบเดียวสำหรับทุกข้อความ
  (ไม่แยก success/error/warning/info เหมือนกฎเหล็กองค์กร เพราะปัจจุบันมีแต่
  ข้อความแจ้งความสำเร็จ)
- Loading: ไม่มี `Skeleton` กลาง — จุดที่ต้องรอ (AI analyze) ใช้ spinner/disabled
  state ต่อจุด
- Empty state: ข้อความ + ไอคอนจางในกล่อง (เช่น notification drawer ว่าง) — ไม่มี
  component `ui/empty` กลาง แต่ pattern ที่ใช้จริง (icon opacity-30 + ข้อความ)
  ใกล้เคียงกับแนวทางองค์กร

## 7. Motion

- ใช้ `animate-in`/`fade-in`/`slide-in-from-*` (tailwindcss-animate utilities
  ที่ Tailwind v4 มีในตัว) สำหรับ toast, dropdown, drawer — ไม่มี `motion`
  library, ไม่มีการตรวจ `prefers-reduced-motion` อย่างชัดเจน (ยังไม่ได้ตรวจสอบ
  ว่า Tailwind's `animate-in` เคารพ media query นี้หรือไม่)

## 8. Governance

- ไฟล์นี้คือ source of truth ของ design ของโปรเจคนี้ — ขัดกันเมื่อไรไฟล์นี้ชนะโค้ด
  **แต่เนื้อหาในไฟล์นี้คือสิ่งที่แอปทำอยู่จริง ไม่ใช่มาตรฐานกลางที่ยังไม่ได้ apply**
- Skill เสริมความสวยงาม (`frontend-design`, `impeccable`) ใช้ช่วยคิดได้ แต่
  **ห้าม retheme/reskin หน้าใดหน้าหนึ่งของแอปนี้โดยไม่ถามผู้ใช้ก่อน** — นี่คือ
  มติหลักของทั้งโปรเจค (ดู `docs/project-context/decisions.md`)
- คำถาม design ที่ยังไม่ปิด (โดยเฉพาะเรื่องจะ adopt shadcn/ui + org kit เป็น
  ชั้น primitive สำหรับงานใหม่หรือไม่) → `docs/design-questions.md`
- มติ design ทั้งหมดอยู่ไฟล์นี้ (ส่วน 10) — **ไม่ใช่**
  `docs/project-context/decisions.md` ซึ่งเก็บมติเรื่องอื่นทั้งหมด

## 9. Deviations (จาก scan ตอนติดตั้ง 2026-09-02 — ทั้งหมด grandfathered ตามมติ

"คงดีไซน์เดิม" ที่ตั้งไว้ตั้งแต่เริ่ม migrate)

| จุดที่ขัดข้อตกลงองค์กร                                                                         | ตัดสินใจ                                                   | หมายเหตุ                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ไม่มี shadcn/ui / org UI kit ติดตั้งเลย (component ทั้งหมด hand-built, รวมหน้าใหม่ในอนาคตด้วย) | **grandfather ถาวร — ปิดคำถามแล้ว 2026-09-02** (ดูส่วน 10) | เหตุผลหลัก: มติเริ่มโปรเจค "คงดีไซน์/UX/workflow เดิมทุกประการ" ผู้ใช้ยืนยันให้หน้าใหม่ (login/admin จาก `ugt-nextjs-auth-setup`) เขียนแบบ hand-built Tailwind เหมือนหน้าเดิมทั้งหมดด้วย ไม่ติดตั้ง shadcn/ui แม้เป็นชั้น primitive สำหรับหน้าใหม่ล้วน |
| Shell เป็น hand-built Navbar+tab bar (ไม่ใช่ shadcn `sidebar-07`/`navigation-menu` block)      | grandfather ถาวร                                           | เทียบเท่า "Topbar" ตามหมวดของ org (ไม่ใช่ sidebar) แต่ implementation เป็นของเดิมทั้งหมด ไม่ migrate มาที่ shadcn composition                                                                                                                          |
| `rounded-2xl`/`rounded-3xl` ใช้ตรง (32 จุด, 12 ไฟล์) ขัดกฎเหล็ก "ห้าม rounded เกิน xl"         | grandfather                                                | เปลี่ยน radius = เปลี่ยนหน้าตาที่เห็นชัด ขัดมติ "ไม่เปลี่ยน visual"                                                                                                                                                                                    |
| ตารางทั้งหมด hand-rolled ไม่ผ่าน `DataTable` กลาง                                              | grandfather                                                | ไม่มี `DataTable` component ติดตั้งในโปรเจคนี้                                                                                                                                                                                                         |
| ฟอร์มใช้ `useState` ต่อช่อง ไม่ผ่าน zod + react-hook-form                                      | grandfather                                                | `EmployeeSubmitForm` ทำงานถูกต้องอยู่แล้ว การ migrate ไม่มีประโยชน์เชิงพฤติกรรมและมีความเสี่ยง regression                                                                                                                                              |
| วันที่/เวลา format inline (`toLocaleDateString`/`toLocaleString`) ไม่ผ่าน `lib/format.ts` กลาง | grandfather                                                | ไม่มีปัญหาปี พ.ศ./UTC ที่เจอจริงในโค้ดปัจจุบัน — ความเสี่ยงต่ำ                                                                                                                                                                                         |
| ไม่มี dark mode                                                                                | grandfather (ตอนนี้)                                       | ไม่มีจุด mount toggle เพราะไม่มี site-header/shell block — จะพิจารณาใหม่ถ้ามี shell block ในอนาคต                                                                                                                                                      |
| สี base ใช้ Tailwind `slate-*` ตรง ๆ ไม่ใช่ neutral hue 258 ของ preset `base-mira`             | grandfather                                                | ยังไม่ได้ติดตั้ง preset ใด ๆ — ไม่มี conflict จริงจนกว่าจะติดตั้ง shadcn                                                                                                                                                                               |

## 10. มติ (decision log)

| วันที่     | มติ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | เหตุผล                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-02 | ติดตั้งข้อตกลงฉบับแรกในโหมด **existing-project scan** — บันทึกดีไซน์ที่แอปมีอยู่จริงทั้งหมดเป็นข้อตกลง (ไม่ใช่ค่ากลางองค์กร) ทุกจุดที่ต่างจากมาตรฐานกลางถูกบันทึกเป็น deviation ที่ตั้งใจในส่วน 9                                                                                                                                                                                                                                                                                                                                                     | ตาม interview เชิง scan (ตอบโดยผู้ดำเนินการ migration ตามมติต้นโปรเจค "คงดีไซน์เดิมทุกประการ" ที่บันทึกไว้ใน `docs/project-context/decisions.md` แล้วตั้งแต่ 2026-09-02)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-09-02 | **ไม่ติดตั้ง shadcn/ui + org UI kit เต็มรูปแบบในรอบนี้** (ไม่รัน `shadcn init`, ไม่แตะ `app/globals.css`/`app/layout.tsx`, ไม่ติดตั้ง shell block ใด ๆ)                                                                                                                                                                                                                                                                                                                                                                                               | การติดตั้งเต็มรูปแบบตามที่ skill กำหนด (Base UI primitives, next-intl ทั้งชุด, DataTable, sidebar/topbar block ทดแทน shell เดิม) มีความเสี่ยงเปลี่ยนพฤติกรรม/หน้าตาแอปที่กำลังรันอยู่ และมติต้นโปรเจคห้ามการเปลี่ยนแปลง visual/UX โดยไม่ถามก่อน — ตัดสินใจเลือกโหมด "บันทึกข้อตกลงก่อน ติดตั้ง substrate ทีหลังเมื่อมีมติชัดเจน" แทน · ทางเลือกที่ปัดตก: ติดตั้งแบบเต็มแล้ว grandfather หน้าเดิมทั้งหมด (เสี่ยงเกินไปสำหรับ root files ที่ทั้งแอป share เช่น `globals.css`/`layout.tsx` และการติดตั้ง next-intl/Base UI ทั้งชุดเป็น dependency footprint ใหญ่ที่ยังไม่มีใครยืนยันว่าต้องการ) · ทางเลือกที่ปัดตก: ข้ามการติดตั้ง skill นี้ไปเลย (ขัดกับคิวงานที่วางไว้ใน `.claude/state/handoff.md` และจะทำให้ auth-setup chunk ถัดไปไม่มี design token อ้างอิงสำหรับหน้า login/admin ที่จะ generate ใหม่) — คำถามเปิดเรื่องนี้บันทึกไว้ที่ `docs/design-questions.md` ข้อ 1 รอผู้ใช้ตัดสินใจก่อนดำเนินการต่อ |
| 2026-09-02 | Primary color = indigo (ตรงกับค่ากลางองค์กร indigo `oklch(0.488 0.243 264.4)` พอดีโดยบังเอิญ) — ยืนยันเป็นข้อตกลงอย่างเป็นทางการ ไม่ต้องเปลี่ยน                                                                                                                                                                                                                                                                                                                                                                                                       | สีที่ใช้จริงในแอปคือ Tailwind `indigo-600`/`700` ซึ่งใกล้เคียงค่ากลางองค์กรมากพอที่จะไม่ต้องมีมติแยก                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-09-02 | Shell classification = **Topbar** (ตามหมวดหมู่ขององค์กร) แต่ implementation ยังคงเป็นของเดิม (hand-built Navbar) — ไม่ migrate มาที่ shadcn `navigation-menu` composition ในรอบนี้                                                                                                                                                                                                                                                                                                                                                                    | shell เดิมทำงานสมบูรณ์และเป็น UX ที่มติต้นโปรเจคต้องการคงไว้ 100%                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-02 | Dark mode = **ไม่มี** (token ยังไม่เตรียมไว้เพราะยังไม่ได้ติดตั้ง token substrate)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | ไม่มีจุด mount toggle ในแอปปัจจุบัน (ไม่มี site-header) — จะพิจารณาใหม่พร้อมกับคำถามข้อ 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-02 | ภาษา UI = **ไทยล้วน** (ตรงกับค่ากลางองค์กรโดยพฤตินัย — ไม่มี i18n catalog)                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | ทุกข้อความในโค้ดเป็นภาษาไทย hardcode อยู่แล้ว ไม่มี requirement ให้รองรับอังกฤษ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-02 | **ปิดคำถามข้อ 1 ใน `docs/design-questions.md`**: หน้าใหม่จาก `ugt-nextjs-auth-setup` (login, `/admin/setup` ฯลฯ) เขียนเป็น **hand-built Tailwind ตาม pattern เดิมของแอปทั้งหมด** — **ไม่ติดตั้ง shadcn/ui/org UI kit เลยแม้เป็นชั้น primitive สำหรับหน้าใหม่ล้วน**                                                                                                                                                                                                                                                                                    | ผู้ใช้ยืนยันตรงๆ ว่าต้องการให้ทุกหน้า "หน้าตาเหมือนแอปทุกหน้า" รวมหน้าที่ยังไม่มีอยู่ด้วย — ทางเลือก (ก) ติดตั้งเป็นชั้น primitive เงียบๆ ถูกปัดตกเพราะจะทำให้แอปมีสอง design system คู่ขนาน (หน้าเก่า hand-built, หน้าใหม่ shadcn) ซึ่งขัดกับความสม่ำเสมอที่ผู้ใช้ต้องการมากกว่าที่จะได้ประโยชน์จาก DataTable/FormDialog กลาง                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-02 | Font: เปลี่ยนจาก system-sans fallback เป็น **Inter + Noto Sans Thai จริงผ่าน `next/font/google`**                                                                                                                                                                                                                                                                                                                                                                                                                                                     | ผู้ใช้ยืนยันรับการเปลี่ยน visual เล็กน้อยนี้เพื่อให้สระ/วรรณยุกต์ไทยเรนเดอร์แม่นยำขึ้น — ตรวจแล้วด้วย browser (computed `font-family` = Inter/Noto Sans Thai) ไม่กระทบ layout จุดอื่น, `npm run build` ผ่านสะอาด                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-09-02 | แก้ `<html lang="en">` → `lang="th"` ใน `src/app/layout.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | เป็นบั๊ก accessibility จริง (เนื้อหาทั้งแอปเป็นไทย) ไม่ใช่ design change — ผู้ใช้ยืนยันให้แก้ทันที ความเสี่ยงต่ำมาก (ไม่กระทบ visual)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-10-08 | ภาษา UI = **สองภาษา TH/EN** (แทนมติ "ไทยล้วน" 2026-09-02) — port `LanguageContext` ของ upstream มาตรง ๆ ค่าเริ่มต้นไทย มีปุ่มสลับภาษาใน Navbar                                                                                                                                                                                                                                                                                                                                                                                                        | ผู้ใช้ตัดสินให้แอปเหมือน upstream (`pisanu90853-cmd/UGTVoice-platform`) ที่เพิ่ม i18n แล้ว · ไม่ใช้ `next-intl` เพื่อให้ port รอบหน้าไม่ต้องเขียนใหม่ (รายละเอียดใน `docs/project-context/decisions.md`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-10-09 | **Header + hero แบบ responsive** (ผู้ใช้ขอ — ปุ่ม "ส่งออกข้อมูล" ตกสามบรรทัดที่ ~1060px, ปุ่มบทบาทหลุดขอบจอ): ปุ่มใน header ไม่ตัดบรรทัด (`whitespace-nowrap`/`shrink-0`); Dashboard/ส่งออกข้อมูลเป็นไอคอน + tooltip จนจอ ≥1536px (header ขยายเป็น `2xl:max-w-screen-2xl`); badge/คำอธิบายใต้ชื่อแอปแสดงตั้งแต่ `xl`; มือถือแสดงโลโก้อย่างเดียว + ปุ่มลูกโลก TH/EN; แท็บขึ้นบรรทัดใหม่ตั้งแต่ `lg` (มือถือปัดได้); นิยาม utility `no-scrollbar` ที่ upstream ใช้แต่ไม่เคยนิยาม; hero หน้า RBAC เรียงข้างกันตั้งแต่ `xl`, หน้า Gatekeeper ตั้งแต่ `lg` | upstream มีปัญหาเดียวกัน แต่ของเราหนักกว่าเพราะมีเมนูบทบาท/ออกจากระบบ (SSO) เพิ่ม · ตรวจด้วย browser ที่ 375/768/1060/1280/1600px ทุกหน้า: ไม่มี scroll แนวนอน ไม่มีปุ่มตัดบรรทัด · ทางเลือกที่ปัดตก: ย่อฟอนต์/ตัดข้อความปุ่ม (อ่านยาก, ต่างจาก upstream มากกว่า)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
