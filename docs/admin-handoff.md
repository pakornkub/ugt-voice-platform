# คำขอตั้งค่าระบบ — UGT VoicePlatform (`ugt-voice-platform`)

> **เอกสารส่งต่อทีม Admin / DBA / DevOps** · สร้างครั้งแรกเมื่อ 2026-09-02
> (chunk: `ugt-nextjs-database-setup`) — ไฟล์นี้จะถูกเติมต่อโดย chunk ถัดไป
> (`ugt-nextjs-auth-setup`, `ugt-nextjs-cicd-setup`) แต่ละ section มีคอมเมนต์บอก
> ว่าใครสร้าง — **อย่าลบ section ของ chunk อื่น**
>
> ทำเสร็จแล้วกรุณา**กรอกหัวข้อสุดท้าย "ค่าที่ต้องส่งกลับ" แล้วส่งไฟล์นี้คืน**ทีมพัฒนา

## ภาพรวม 1 นาที — ต้องทำอะไรบ้าง

| #   | ระบบ        | งาน                                                                          | ใช้เวลาโดยประมาณ |
| --- | ----------- | ---------------------------------------------------------------------------- | ---------------- |
| 1   | SQL Server  | สร้าง database prod + dev + login 1 ตัว + สิทธิ์                             | ~10 นาที         |
| 1.4 | HR view     | view ข้อมูลพนักงาน (อ่านอย่างเดียว) ให้ login ของแอป `SELECT` ได้ (ดู §1.4)  | ประสาน HR        |
| 2   | Keycloak    | สร้าง client 1 ตัวในระบบ SSO กลางขององค์กร (Client ID `ugt-voice-platform`)  | ~10 นาที         |
| 3   | SMTP        | ให้ host/port ของ SMTP relay + ที่อยู่อีเมลผู้ส่งที่ relay อนุญาต            | ~5 นาที          |
| 4   | Jenkins     | สร้าง credentials 2 ตัว + pipeline job + webhook (ดูข้อ 5)                   | ~15 นาที         |
| 5   | SonarQube   | สร้าง 2 projects + ผูก Quality Gate + webhook (ดูข้อ 5)                      | ~10 นาที         |
| 6   | Docker host | ยืนยัน host port จริง (prod/dev) + เตรียม `/home/docker02/appdata` (ดูข้อ 5) | ~5 นาที          |

---

<!-- [DATABASE] เพิ่มโดย ugt-nextjs-database-setup เมื่อ 2026-09-02 — อย่าลบ section นี้ -->

## 1. SQL Server (Database)

โปรเจคนี้ยังไม่มี SQL Server จริงให้เชื่อมต่อ (ตอนติดตั้งใช้ค่า placeholder
ล้วน — ดู `.env.example`) โครง Prisma schema, migration file แรก และ seed
script **พร้อมใช้งานทันที** ที่ได้ค่าจริงด้านล่างนี้

### 1.1 สิ่งที่ต้องสร้าง

| อะไร                                             | ชื่อที่แนะนำ                  | หมายเหตุ                                                                                                                                                                                                       |
| ------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database prod (branch `main`)                    | `UGT_VoicePlatform`           | ชื่อตามรูปแบบองค์กร — **ถ้า DBA อยากใช้ชื่ออื่น แจ้งกลับแทนที่จะเปลี่ยนเงียบ ๆ** (ชื่ออยู่ใน `DATABASE_URL` เท่านั้น ทีมพัฒนาต้องอัปเดต `.env`/Jenkins secret ให้ตรง)                                          |
| Database dev (branch `develop` + พัฒนาในเครื่อง) | `UGT_VoicePlatform_DEV`       | ฐานแยกจาก prod บน instance เดียวกันได้ (รูปแบบเดียวกับโปรเจคอื่น เช่น `UGT_RDVelocity_DEV`) — ใช้ใน secret `env-ugt-voice-platform-dev` (§5.1)                                                                 |
| SQL Login สำหรับแอป                              | เช่น `ugt_voice_platform_app` | ต้องมีสิทธิ์ `db_datareader`/`db_datawriter`/`db_ddladmin` บนฐาน prod และ dev (ddladmin เพื่อให้ `prisma migrate deploy` สร้าง/แก้ตารางได้) — ไม่ต้องมี shadow database (โปรเจคนี้สร้าง migration แบบ offline) |

### 1.2 เชื่อมต่อแบบไหน

ทีมพัฒนาใช้ `@prisma/adapter-mssql` (SQL Server driver adapter) เชื่อมผ่าน
`encrypt=true` เสมอ — ถ้า SQL Server ใช้ certificate ที่เซ็นเอง (self-signed
หรือ internal CA) ต้องแจ้งกลับว่าจะให้ตั้ง `trustServerCertificate=true`
(ยอมรับ cert โดยไม่ตรวจ — ใช้ได้เฉพาะ dev/intranet ปิด) หรือจะส่ง CA
certificate มาให้ตั้ง trust chain จริง (แนะนำสำหรับ production)

### 1.3 ไม่ต้องทำ (ตอนนี้)

- ไม่มี stored procedure ให้ตั้งค่าในชุดนี้ (linked server สำหรับ HR ดู §1.4)
- ไม่ต้อง seed ข้อมูลเอง — ทีมพัฒนามี `prisma/seed.ts` รันเองผ่าน
  `npx prisma db seed` ทันทีที่ได้ `DATABASE_URL` จริง

### 1.4 View ข้อมูลพนักงานจาก HR (เพิ่ม 2026-10-08 — ✅ ได้รับแล้ว 2026-10-09)

พนักงาน: `[thrygsd002].[ICTPortal_PRD].[dbo].[vwHR_SC_Employee]` · สายอนุมัติ (ยังไม่ใช้):
`[thrygsd002].[ICTPortal_PRD].[dbo].[HR_SC_AuthorizeEmployee_ms]` — login ของแอปอ่านได้ทั้งสองตัวแล้ว

แอปต้องจับคู่อีเมลที่ login (Keycloak) กับข้อมูลพนักงาน (รหัส ชื่อ แผนก ตำแหน่ง)
ตอนนี้ใช้ข้อมูลจำลองอยู่ ขอให้ DBA/HR เตรียม **view แบบอ่านอย่างเดียว** ให้ SQL Login
ของแอปอ่านได้ (ผ่าน linked server หรืออยู่ใน instance เดียวกันก็ได้)

| ค่าที่ต้องส่งกลับ                                                | ตัวอย่าง                                  |
| ---------------------------------------------------------------- | ----------------------------------------- |
| ชื่อ linked server (ถ้ามี) + database.schema.view                | `[HRSRV].[HRDB].[dbo].[vw_Employee]`      |
| คอลัมน์ที่มี (อย่างน้อย อีเมล รหัส ชื่อ แผนก ตำแหน่ง สถานะทำงาน) | `Email, EmpCode, FullNameTh, DeptName, …` |
| สิทธิ์: `SELECT` บน view ให้ SQL Login ของแอป                    | —                                         |

---

## ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า                            | มาจากไหน                                                                            | กรอกตรงนี้                              |
| ------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------- |
| **→ SQL Server host/instance** | เช่น `10.20.x.x` หรือ `sql01.company.local\INSTANCE`                                |                                         |
| **→ Port**                     | ปกติ `1433` เว้นแต่ตั้งพอร์ตอื่น                                                    |                                         |
| **→ ชื่อ database prod**       | ยืนยันว่าใช้ `UGT_VoicePlatform` ตามที่เสนอ หรือแจ้งชื่อจริง                        |                                         |
| **→ ชื่อ database dev**        | ยืนยันว่าใช้ `UGT_VoicePlatform_DEV` ตามที่เสนอ หรือแจ้งชื่อจริง                    |                                         |
| **→ Username**                 | SQL Login ที่สร้างให้แอป                                                            |                                         |
| **→ Password**                 | รหัสผ่านของ login ด้านบน                                                            | **ส่งช่องทางปลอดภัย อย่ากรอกในไฟล์นี้** |
| **→ TLS**                      | `trustServerCertificate=true` (self-signed/dev) หรือแนบไฟล์ CA cert (`.pem`/`.crt`) |                                         |

## เช็คก่อนปิดงาน (ฝั่ง Admin/DBA)

- [ ] Database prod + dev สร้างแล้ว ชื่อยืนยันตรงกับที่แจ้งกลับ
- [ ] SQL Login สร้างแล้ว พร้อมสิทธิ์ตามตาราง 1.1
- [ ] `encrypt=true` เปิดใช้งานบน SQL Server (ไม่ใช่ plaintext connection)
- [ ] ตัดสินใจเรื่อง TLS แล้ว (self-signed ยอมรับ หรือส่ง CA cert)
- [ ] กรอก "ค่าที่ต้องส่งกลับ" ด้านบน + ส่ง password ช่องทางปลอดภัยแล้ว

**เมื่อทีมพัฒนาได้ค่าครบ ขั้นตอนฝั่งโค้ด (ทำเองไม่ต้องรอ Admin เพิ่ม):**

```bash
# ใส่ค่าจริงใน .env.local (host/port/database/user/password ตามตารางด้านบน)
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
# schema เปลี่ยนในอนาคต: สร้าง migration แบบ offline (ไม่ใช้ migrate dev — ไม่มี shadow)
# npx prisma migrate diff --from-schema <schema เดิม> --to-schema prisma/schema.prisma --script > prisma/migrations/<ts>_<name>/migration.sql
```

<!-- /[DATABASE] -->

---

<!-- [AUTH] เพิ่มโดย ugt-nextjs-auth-setup เมื่อ 2026-09-02 — อย่าลบ section นี้ -->

## 2. Keycloak SSO

โปรเจคนี้ใช้ **SSO (Keycloak) เท่านั้น** — ไม่มี LDAP/AD bind และไม่มีรหัสผ่านแบบ
local ในระบบ (มติ: `docs/project-context/decisions.md`) ระบบ Login/RBAC ทั้งชุด
(Better Auth + ตาราง User/Session/Account/Role/Permission ฯลฯ) ถูกสร้างไว้พร้อม
ใช้งานแล้วในโค้ด แต่ **ยังไม่มี Keycloak client จริงให้เชื่อมต่อ** — ค่าที่ใช้ตอนนี้ใน
`.env.local` เป็น placeholder ทั้งหมด

### 2.1 สิ่งที่ต้องขอจากทีม Keycloak องค์กร

| อะไร                               | ค่าที่ต้องระบุ                                                          | หมายเหตุ                                                                |
| ---------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Client ใหม่ในระบบ Keycloak กลาง    | Client ID: `ugt-voice-platform`                                         | โปรเจคนี้มี client เป็นของตัวเอง — **ห้ามใช้ client ร่วมกับโปรเจคอื่น** |
| Client authentication              | เปิด (Confidential client — มี client secret)                           |                                                                         |
| Standard flow (Authorization Code) | เปิด                                                                    | ปิด direct access grants / implicit flow / service accounts — ไม่ใช้    |
| PKCE                               | S256                                                                    | ตั้งที่ Advanced → Proof Key for Code Exchange Code Challenge Method    |
| Valid redirect URIs                | ดูตารางด้านล่าง (ต้องตรงตัวอักษรทุกตัว รวม `/` ท้าย URI)                |                                                                         |
| Web origins                        | `https://ugtweb.ube.co.th` (และ `http://localhost:3000` สำหรับนักพัฒนา) |                                                                         |

**Redirect URI** (แอปอยู่ใต้ basePath บน `https://ugtweb.ube.co.th` เหมือนโปรเจคอื่น):

```
https://ugtweb.ube.co.th/ugt-voice-platform/api/auth/callback/keycloak        (prod)
https://ugtweb.ube.co.th/ugt-voice-platform-dev/api/auth/callback/keycloak    (dev)
http://localhost:3000/api/auth/callback/keycloak                              (นักพัฒนารันในเครื่อง)
```

**Logout**: ไม่ต้องตั้งค่า Valid post logout redirect URIs — แอปใช้ backchannel
logout (server ยิง POST ไปหา Keycloak เอง เบราว์เซอร์ไม่ถูก redirect ผ่าน Keycloak)

### 2.2 TLS ภายในองค์กร

ถ้า Keycloak ใช้ certificate จาก internal CA ขององค์กร (ไม่ใช่ public CA) ต้องแจ้ง
กลับมาว่าจะให้ตั้ง `NODE_EXTRA_CA_CERTS` ชี้ไปที่ไฟล์ CA cert (แนะนำ) หรือปิดการ
ตรวจสอบ cert ทั้งหมดด้วย `NODE_TLS_REJECT_UNAUTHORIZED=0` (ใช้ได้เฉพาะ
intranet ปิด — ตัดสินใจนี้เป็นของทีม infra ไม่ใช่ค่า default ที่ตั้งเงียบ ๆ)

### ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า                          | มาจากไหน                                                                                                             | กรอกตรงนี้                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **→ KEYCLOAK_ISSUER**        | `https://<keycloak host>/realms/<realm>` — ตรวจด้วยการเปิด `<issuer>/.well-known/openid-configuration` ในเบราว์เซอร์ |                                         |
| **→ KEYCLOAK_CLIENT_ID**     | ยืนยันว่าใช้ `ugt-voice-platform` ตามที่เสนอ หรือแจ้งชื่อจริง                                                        |                                         |
| **→ KEYCLOAK_CLIENT_SECRET** | จาก client → tab Credentials                                                                                         | **ส่งช่องทางปลอดภัย อย่ากรอกในไฟล์นี้** |
| **→ TLS**                    | internal CA cert (`.pem`/`.crt`) หรือยืนยันว่าเป็น intranet ปิด                                                      |                                         |

เมื่อได้ค่าครบ ใส่ใน `.env.local` แทนที่ `KEYCLOAK_ISSUER`/`KEYCLOAK_CLIENT_ID`/
`KEYCLOAK_CLIENT_SECRET` แล้วรีสตาร์ทแอป — ไม่ต้องแก้โค้ดใด ๆ เพิ่ม

### 2.3 ผู้ดูแลระบบคนแรก (First Admin)

**ไม่มีบัญชี Administrator ตั้งไว้ล่วงหน้า** — คนแรกที่เข้าสู่ระบบด้วย SSO จะถูกพา
ไปหน้า `/admin/setup` โดยอัตโนมัติ และกดปุ่มเดียวเพื่อให้ตัวเองเป็น Administrator
(ได้สิทธิ์ครบทุกอย่างในหน้าจัดการผู้ใช้/บทบาท/บันทึกการใช้งาน และบทบาทหลักของแอป
เป็น "Admin" ทันที) **จึงสำคัญมากที่ต้องเลือกให้ถูกว่าใครจะเป็นคนแรกที่ login เข้าระบบ
จริง** — หลังจากนั้นผู้ดูแลระบบคนนี้จะเป็นคนกำหนดบทบาทให้ผู้ใช้คนอื่นทั้งหมดจากหน้า
"จัดการผู้ใช้" เอง ไม่มีขั้นตอนแอดมินคนอื่นให้อนุมัติเพิ่ม

<!-- /[AUTH] -->

---

<!-- [MAIL] เพิ่มโดย ugt-nextjs-mail-setup เมื่อ 2026-09-02 — อย่าลบ section นี้ -->

## 3. SMTP (อีเมลแจ้งเตือน)

โปรเจคนี้ส่งอีเมลจริงเมื่อ**มีเรื่องร้องเรียนใหม่** (แจ้ง Lead Gatekeeper ของหมวดนั้น)
และเมื่อ**เรื่องได้รับการแก้ไขแล้ว** (แจ้งผู้ยื่นเรื่อง) — admin เปิด/ปิดและแก้ข้อความ
อีเมลได้เองในแอป (แท็บตั้งค่าแจ้งเตือนอีเมลในหน้าจัดการ Gatekeeper) ยังไม่มี SMTP relay
จริงให้เชื่อมต่อ (ตอนนี้ใช้ค่า placeholder ล้วน — ดู `.env.example`) ฝั่งแอปพร้อมใช้
ทันทีที่ได้ค่าจริงด้านล่างนี้ — ไม่ต้องแก้โค้ดเพิ่ม แค่เติม `.env.local` แล้ว restart แอป

### 3.1 สิ่งที่ต้องขอจากทีม IT/Network

| อะไร                       | ค่าที่ต้องระบุ                                                          | หมายเหตุ                                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| SMTP relay host/port       | เช่น `smtp.company.local` พอร์ต `25`/`587`/`465`                        | relay ภายในองค์กรส่วนใหญ่รับอีเมลจากเครื่องในเครือข่ายโดยไม่ต้อง auth — ถ้า relay ต้อง auth แจ้ง username/password กลับมาด้วย (ส่งช่องทางปลอดภัย) |
| TLS                        | STARTTLS (พอร์ต 25/587, ปกติ) หรือ Implicit TLS (พอร์ต 465)             | ถ้าเป็น 465 ต้องตั้ง `SMTP_SECURE=true`                                                                                                           |
| ที่อยู่อีเมลผู้ส่ง (From)  | ที่อยู่ที่ relay **อนุญาตให้ส่งในนามนี้** เช่น `no-reply@company.co.th` | ถ้าใช้ที่อยู่ที่ relay ไม่อนุญาต อีเมลจะถูกปฏิเสธทั้งหมดโดยไม่มีใครในระบบเห็น error                                                               |
| ผู้ติดต่อสนับสนุน (footer) | ทีม/อีเมลที่จะโชว์ท้ายอีเมลทุกฉบับ ("หากพบปัญหากรุณาติดต่อ...")         | ค่าเริ่มต้นตอนนี้คือ "ทีม HR/IT Support" — ยืนยันหรือแจ้งชื่อ/อีเมลจริงกลับมา (แก้ที่ `lib/types/mail-templates.ts`)                              |

### 3.2 ไม่ต้องทำ (ตอนนี้)

- ไม่ต้องสร้าง mailbox/บัญชีผู้ใช้แยก — relay ภายในองค์กรทั่วไปส่งแบบ
  unauthenticated จากเครื่องในเครือข่ายได้เลย (เว้นแต่ IT แจ้งว่าต้อง auth)
- ไม่ต้องตั้งค่า SPF/DKIM ฝั่งแอป — เป็นเรื่องของ mail server/DNS ขององค์กร
  ไม่ใช่โค้ดฝั่งนี้

### ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า                         | มาจากไหน                                                           | กรอกตรงนี้                              |
| --------------------------- | ------------------------------------------------------------------ | --------------------------------------- |
| **→ SMTP_HOST**             | โฮสต์ของ SMTP relay ภายในองค์กร                                    |                                         |
| **→ SMTP_PORT**             | ปกติ `25` (unauthenticated) หรือ `587`/`465`                       |                                         |
| **→ SMTP_SECURE**           | `true` เฉพาะพอร์ต 465 (Implicit TLS) มิฉะนั้น `false`              |                                         |
| **→ SMTP_USER / SMTP_PASS** | เว้นว่างถ้า relay รับแบบ unauthenticated — ถ้าต้อง auth ระบุมาด้วย | **ส่งช่องทางปลอดภัย อย่ากรอกในไฟล์นี้** |
| **→ SMTP_FROM**             | ที่อยู่อีเมลผู้ส่งที่ relay อนุญาตให้ส่งในนามนี้                   |                                         |
| **→ ผู้ติดต่อสนับสนุน**     | ข้อความ/อีเมลที่จะโชว์ท้ายอีเมลทุกฉบับ                             |                                         |

เมื่อได้ค่าครบ ใส่ใน `.env.local` แทนที่ `SMTP_HOST`/`SMTP_FROM` แล้วรีสตาร์ทแอป
— ไม่ต้องแก้โค้ดใด ๆ เพิ่ม (ยกเว้นผู้ติดต่อสนับสนุนซึ่งเป็นข้อความ hardcode ที่
`lib/types/mail-templates.ts`)

## เช็คก่อนปิดงาน (ฝั่ง IT/Network)

- [ ] SMTP relay host/port ยืนยันแล้ว พร้อม TLS mode ที่ถูกต้อง
- [ ] ที่อยู่อีเมลผู้ส่ง (`SMTP_FROM`) ยืนยันว่า relay อนุญาตให้ส่งในนามนี้
- [ ] ตัดสินใจเรื่อง auth แล้ว (unauthenticated ภายในเครือข่าย หรือ
      username/password)
- [ ] ยืนยันข้อความผู้ติดต่อสนับสนุนท้ายอีเมล
- [ ] กรอก "ค่าที่ต้องส่งกลับ" ด้านบน + ส่ง password (ถ้ามี) ช่องทางปลอดภัยแล้ว

<!-- /[MAIL] -->

---

<!-- [UPLOAD] เพิ่มโดย ugt-nextjs-upload-setup เมื่อ 2026-09-02 — อย่าลบ section นี้ -->

## 4. ไฟล์แนบ (Upload)

โปรเจคนี้เก็บไฟล์แนบจริงบน Docker volume (ไม่ใช่ใน database, ไม่ใช่ใน image) — **ไม่มีการ
สแกนไวรัส** (มติเจ้าของโปรเจค) โค้ดฝั่งแอปพร้อมใช้งานแล้ว
(`lib/storage.ts`, `src/app/api/files/**`) และ volume bind-mount อยู่ในทั้งสอง compose แล้ว —
ฝั่ง Admin เตรียมแค่โฟลเดอร์/backup ตาม §4.1 และ §5.5

### 4.1 สิ่งที่ทีม Admin/DevOps ต้องรู้ (สำคัญ — ผลกระทบจริงเมื่อ deploy)

- **`/home/docker02/appdata/ugt-voice-platform/storage` คือสำเนาไฟล์แนบชุดเดียวเท่านั้น**
  ไม่ได้อยู่ใน image และไม่ได้อยู่ใน database จึง**ไม่อยู่ในแผน backup ของฐานข้อมูล** —
  ต้องมี backup job แยกต่างหากสำหรับโฟลเดอร์นี้
- ลบโฟลเดอร์นี้บน host = ไฟล์แนบทุกไฟล์หายถาวร (container ลบ/สร้างใหม่ได้อิสระ
  `docker compose down && up -d` ปลอดภัย — แต่โฟลเดอร์นี้ห้ามลบ)
- **reverse proxy ของ `ugtweb.ube.co.th` ต้องตั้ง body-size limit ให้ ≥ 25 MB**
  สำหรับ path `/ugt-voice-platform` และ `/ugt-voice-platform-dev` (`UPLOAD_MAX_BYTES`
  ปัจจุบัน) เช่น nginx `client_max_body_size 25m;` — มิฉะนั้นไฟล์แนบขนาดใหญ่จะถูก proxy
  ปฏิเสธด้วย 413 ก่อนถึงแอป โดยที่แอปไม่เห็น error ใด ๆ

### ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า                                                                               | มาจากไหน                                       | กรอกตรงนี้ |
| --------------------------------------------------------------------------------- | ---------------------------------------------- | ---------- |
| **→ ตั้ง body-size limit ≥ 25 MB บน proxy แล้ว**                                  | ตาม §4.1                                       |            |
| **→ ใครรับผิดชอบ backup ของ `/home/docker02/appdata/ugt-voice-platform/storage`** | ไม่ใช่ backup เดียวกับ database — ต้องมีแผนแยก |            |

## เช็คก่อนปิดงาน (ฝั่ง Admin/DevOps)

- [ ] มีแผน backup แยกสำหรับโฟลเดอร์ storage (ไม่ใช่แผนเดียวกับ database)
- [ ] ปรับ body-size limit ของ reverse proxy (`ugtweb.ube.co.th`) ≥ 25 MB แล้ว

<!-- /[UPLOAD] -->

---

<!-- [CICD] เพิ่มโดย ugt-nextjs-cicd-setup เมื่อ 2026-09-02 — อย่าลบ section นี้ -->

## 5. Jenkins / SonarQube / Docker host — CI/CD

> สร้างอัตโนมัติเมื่อ 2026-09-02 · ผู้ขอ: pakornwo@ube.co.th
> โปรเจค: `ugt-voice-platform` · repo: `https://github.com/pakornkub/ugt-voice-platform`
> (branch `main` = prod, `develop` = dev)
>
> URL: prod `https://ugtweb.ube.co.th/ugt-voice-platform` · dev
> `https://ugtweb.ube.co.th/ugt-voice-platform-dev` (basePath `/ugt-voice-platform`,
> `/ugt-voice-platform-dev`) · **ไม่ใช้ Sentry** (มติ: `docs/project-context/decisions.md`)
> ชื่อทุกตัวด้านล่างถูก generate ให้ตรงกับค่าที่ตั้งไว้ในโปรเจคแล้ว —
> **กรุณาใช้ชื่อตามนี้เป๊ะ ๆ** (ต่างแม้ตัวเดียว pipeline จะไม่ทำงาน)

Jenkins server นี้มีโปรเจคอื่นตั้งไว้แล้ว (งานระดับ server — plugins, tools, `nvd`
credential, `NOTIFY_EMAIL`, `/home/docker02/appdata`, `proxy-network` — ทำไปแล้ว) ทำ
เฉพาะระดับโปรเจคด้านล่าง

### 5.1 Jenkins — Credentials (Manage Jenkins → Credentials → Global)

| ชื่อ credential (ID)         | ชนิด            | ใส่อะไร                                                                              |
| ---------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| `env-ugt-voice-platform`     | **Secret file** | ไฟล์ `.env` ของ **prod** (ทีมพัฒนาแนบให้ / นัดส่งช่องทางปลอดภัย)                     |
| `env-ugt-voice-platform-dev` | **Secret file** | ไฟล์ `.env` ของ **dev** — ห้ามใช้ไฟล์เดียวกับ prod (คนละ `DATABASE_URL` คนละ secret) |

(ไม่มีแถว `sentry-dsn-ugt-voice-platform` — โปรเจคนี้ไม่ใช้ Sentry)

### 5.2 Jenkins — Pipeline jobs (2 ตัว ตามรูปแบบโปรเจคอื่นบน server นี้)

| ชื่อ job (New Item → **Pipeline**) | Repo                                              | Branch    | Script Path   |
| ---------------------------------- | ------------------------------------------------- | --------- | ------------- |
| `ugt-voice-platform`               | `https://github.com/pakornkub/ugt-voice-platform` | `main`    | `Jenkinsfile` |
| `ugt-voice-platform-dev`           | `https://github.com/pakornkub/ugt-voice-platform` | `develop` | `Jenkinsfile` |

- Definition: **Pipeline script from SCM** (Git) · ถ้า repo เป็น private ทีมพัฒนาจะ
  ส่ง GitHub credential ให้ (ยังเป็น public อยู่ตอนนี้ — แจ้งถ้าต้องการให้เป็น private)
- **สำคัญ**: ปิด "Lightweight checkout" (ถ้าเปิดไว้ stage แรกจะพัง)
- Jenkinsfile แยก prod/dev จากชื่อ branch เอง (`main` → prod, อื่น ๆ → dev) ไม่ต้อง
  ตั้ง parameter เพิ่ม

### 5.3 Webhook ที่ GitHub

- ทีมพัฒนาเพิ่ม webhook ที่ repo เอง (Settings → Webhooks → Add: URL
  `http://<jenkins-host>:8080/github-webhook/` · event: **push เท่านั้น**) —
  Admin แค่แจ้ง Jenkins host ที่ GitHub เรียกถึงได้
- ถ้า Jenkins เข้าถึง repo ไม่ได้ (อยู่คนละเครือข่าย) ใช้ `pollSCM` แทนได้ —
  แจ้งทีมพัฒนาถ้าต้องสลับวิธีนี้

### 5.4 SonarQube

**สร้าง Projects** (Administration → Projects → Create):

| Project Key              | Display name            |
| ------------------------ | ----------------------- |
| `ugt-voice-platform`     | UGT VoicePlatform       |
| `ugt-voice-platform-dev` | UGT VoicePlatform (Dev) |

**ผูก Quality Gate**: ใช้ gate มาตรฐานองค์กร (`new_coverage ≥ 60%`,
`new_violations = 0`, `new_duplicated_lines_density ≤ 3%`,
`new_security_hotspots_reviewed = 100%` — ถ้ายังไม่มี gate นี้ สร้างตามเกณฑ์นี้)
→ assign ให้**ทั้งสอง** projects ข้างบน

**Webhook กลับไป Jenkins** (Administration → Configuration → Webhooks):
URL `http://<jenkins-host>:8080/sonarqube-webhook/` — **ถ้าไม่ตั้งข้อนี้
pipeline จะค้างตลอดไป** ที่ขั้นรอผล Quality Gate

### 5.5 Docker host

- reverse proxy ของ `ugtweb.ube.co.th` ต้อง route **โดยไม่ตัด path ทิ้ง**:
  `/ugt-voice-platform` → container `ugt-voice-platform` (prod) และ
  `/ugt-voice-platform-dev` → container `ugt-voice-platform-dev` (dev) — แอปถูก build
  ให้รู้จัก basePath นี้เองแล้ว (เช่น nginx `proxy_pass http://<host>:<APP_PORT>;`
  ไม่มี `/` ท้าย) · ส่ง header `X-Forwarded-Proto` ด้วย
- Host port ที่ทีมพัฒนาใช้เป็นค่าเริ่มต้นตอนนี้: prod `3000`, dev `3001` — ถ้า
  server จริงมี port อื่นที่จัดสรรให้แล้ว **แจ้งกลับ** (ดูตารางท้ายหัวข้อ)
- **ไฟล์แนบจริง (storage volume) ต่อเข้ากับ compose ในชุดนี้แล้ว**
  (ไม่ได้ค้างเป็น deferred อีกต่อไป — ดู §4 ด้านบน) ต้องเตรียม:
  - `/home/docker02/appdata/ugt-voice-platform/storage` (prod)
  - `/home/docker02/appdata/ugt-voice-platform-dev/storage` (dev)
  - Deploy stage สร้าง/chown ให้เองครั้งแรกที่ deploy (idempotent) — **แต่ต้อง
    มี `/home/docker02/appdata` เองอยู่แล้วและ jenkins user เขียนได้** (server นี้
    มีโปรเจคอื่นใช้อยู่แล้ว — น่าจะพร้อม)
- เครือข่าย `proxy-network` (Docker external network สำหรับ reverse-proxy
  ที่ใช้ร่วมกันทั้ง host) ต้องสร้างไว้แล้ว: `docker network create proxy-network`
  (ครั้งเดียวต่อ host — ข้ามได้ถ้ามีโปรเจคอื่นสร้างไว้แล้ว)
- body-size limit ของ proxy ≥ 25 MB ตาม §4.1

### ผู้ดูแลระบบคนแรก

ระบบ**ไม่มีบัญชี admin ที่ seed ไว้ล่วงหน้า** (บัญชี SSO เกิดเองตอน login
ครั้งแรก จึง seed ล่วงหน้าไม่ได้) — **คนแรกที่ login จะถูกพาไปหน้า
`/admin/setup` และกดปุ่มเดียวเพื่อเป็น Administrator** เลือกคนที่จะ login
คนแรกให้ถูกคน แล้วคนนั้นค่อยกำหนดบทบาทให้คนอื่นจากหน้า `/admin/users`
(ซ้ำกับหัวข้อ 3 ด้านบน — คัดลอกมาให้ครบในหัวข้อนี้ตามรูปแบบมาตรฐานของ
ugt-nextjs-cicd-setup)

---

### ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า                                          | มาจากไหน                                                                                                                       | กรอกตรงนี้                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| **→ Jenkins host**                           | สำหรับตั้ง webhook ทั้งสองทาง (§5.3, §5.4) — ต้องเป็น host ที่ GitHub เรียกถึงได้ ถ้าไม่ได้ แจ้งกลับเพื่อเปลี่ยนเป็น `pollSCM` |                                              |
| **→ `APP_PORT` (prod)**                      | Host port ที่จัดสรรให้บน server จริง                                                                                           | จำเป็น — ใช้ `3000` เป็น placeholder ไว้ก่อน |
| **→ `APP_PORT` (dev)**                       | Host port ที่จัดสรรให้บน server dev                                                                                            | จำเป็น — ใช้ `3001` เป็น placeholder ไว้ก่อน |
| ยืนยัน route บน reverse proxy แล้ว           | `/ugt-voice-platform` → prod, `/ugt-voice-platform-dev` → dev (ตาม §5.5)                                                       |                                              |
| ยืนยัน Jenkins jobs (prod + dev) สร้างแล้ว   | ลิงก์ job                                                                                                                      |                                              |
| ยืนยัน SonarQube projects + webhook แล้ว     | ลิงก์ project                                                                                                                  |                                              |
| ยืนยัน `/home/docker02/appdata` พร้อมใช้แล้ว | `sudo mkdir -p /home/docker02/appdata && sudo chown jenkins:jenkins /home/docker02/appdata` (ครั้งแรกของ server เท่านั้น)      |                                              |

### เช็คก่อนปิดงาน (ฝั่ง Admin/DevOps)

- [ ] ชื่อทุกตัวตรงกับตารางเป๊ะ (โดยเฉพาะ credential ID)
- [ ] Jenkins jobs `ugt-voice-platform` + `ugt-voice-platform-dev` ชี้ repo/branch ถูก
- [ ] SonarQube→Jenkins webhook ตั้งแล้ว + แจ้ง Jenkins host ให้ทีมพัฒนาตั้ง GitHub webhook
- [ ] `APP_PORT` (prod/dev) ส่งกลับแล้ว ไม่ใช่แค่ placeholder `3000`/`3001`
- [ ] reverse proxy route `/ugt-voice-platform` + `/ugt-voice-platform-dev` แล้ว (ไม่ตัด path)
- [ ] `/home/docker02/appdata` พร้อมเขียนได้แล้ว (jenkins user)
- [ ] `proxy-network` (Docker external network) สร้างแล้ว
- [ ] body-size limit ของ proxy ≥ 25 MB แล้ว (ซ้ำ §4)

---

<!-- /[CICD] -->
