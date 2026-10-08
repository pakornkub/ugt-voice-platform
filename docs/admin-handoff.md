# คำขอตั้งค่าระบบ — UGT VoiceCare (`ugt-voicecare`)

> **เอกสารส่งต่อทีม Admin / DBA / DevOps** · สร้างครั้งแรกเมื่อ 2026-09-02
> (chunk: `ugt-nextjs-database-setup`) — ไฟล์นี้จะถูกเติมต่อโดย chunk ถัดไป
> (`ugt-nextjs-auth-setup`, `ugt-nextjs-cicd-setup`) แต่ละ section มีคอมเมนต์บอก
> ว่าใครสร้าง — **อย่าลบ section ของ chunk อื่น**
>
> ทำเสร็จแล้วกรุณา**กรอกหัวข้อสุดท้าย "ค่าที่ต้องส่งกลับ" แล้วส่งไฟล์นี้คืน**ทีมพัฒนา

## ภาพรวม 1 นาที — ต้องทำอะไรบ้าง

| #   | ระบบ        | งาน                                                                          | ใช้เวลาโดยประมาณ |
| --- | ----------- | ---------------------------------------------------------------------------- | ---------------- |
| 1   | SQL Server  | สร้าง database 2 ตัว (จริง + shadow) + login/user 1 ตัว + สิทธิ์             | ~10 นาที         |
| 2   | Keycloak    | สร้าง client 1 ตัวในระบบ SSO กลางขององค์กร (Client ID `ugt-voicecare`)       | ~10 นาที         |
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

| อะไร                                                                        | ชื่อที่แนะนำ             | หมายเหตุ                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database หลัก (prod/dev ใช้ชื่อเดียวกันได้ต่างเครื่อง/instance)             | `UGT_VoiceCare`          | ทีมพัฒนาตั้งชื่อนี้ไว้ล่วงหน้าในโค้ด — **ถ้า DBA อยากใช้ชื่ออื่น แจ้งกลับแทนที่จะเปลี่ยนเงียบ ๆ** เพราะ frontend ไม่ผูกกับชื่อนี้ตรง ๆ (อยู่ใน `DATABASE_URL` เท่านั้น) แต่ทีมพัฒนาต้องอัปเดต `.env.local`/เอกสารให้ตรง     |
| Database เปล่าสำหรับ shadow (**dev เท่านั้น**, ใช้โดย `prisma migrate dev`) | `UGT_VoiceCare_Shadow`   | Prisma จะ**ล้างข้อมูลทั้งหมด**ในฐานนี้ทุกครั้งที่รัน migrate dev — ห้ามชี้ไปฐานที่มีข้อมูลจริงเด็ดขาด ไม่ต้องสร้างถ้า login มีสิทธิ์ `CREATE DATABASE` เองอยู่แล้ว (Prisma จะสร้าง/ลบเองอัตโนมัติ)                          |
| SQL Login สำหรับแอป                                                         | เช่น `ugt_voicecare_app` | ต้องมีสิทธิ์ `db_datareader`/`db_datawriter`/`db_ddladmin` บนฐานหลัก (ddladmin เพื่อให้ `prisma migrate deploy` สร้าง/แก้ตารางได้) และสิทธิ์เต็มบนฐาน shadow (ถ้าใช้ทางเลือกฐาน shadow แยก ไม่ใช่ `CREATE DATABASE` โดยตรง) |

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

### 1.4 View ข้อมูลพนักงานจาก HR (เพิ่ม 2026-10-08)

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

| ค่า                                      | มาจากไหน                                                                                                | กรอกตรงนี้                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **→ SQL Server host/instance**           | เช่น `10.20.x.x` หรือ `sql01.company.local\INSTANCE`                                                    |                                         |
| **→ Port**                               | ปกติ `1433` เว้นแต่ตั้งพอร์ตอื่น                                                                        |                                         |
| **→ ชื่อ database หลัก**                 | ยืนยันว่าใช้ `UGT_VoiceCare` ตามที่เสนอ หรือแจ้งชื่อจริง                                                |                                         |
| **→ ชื่อ database shadow (ถ้าสร้างแยก)** | ยืนยันว่าใช้ `UGT_VoiceCare_Shadow` หรือแจ้งชื่อจริง — เว้นว่างถ้า login มีสิทธิ์ `CREATE DATABASE` เอง |                                         |
| **→ Username**                           | SQL Login ที่สร้างให้แอป                                                                                |                                         |
| **→ Password**                           | รหัสผ่านของ login ด้านบน                                                                                | **ส่งช่องทางปลอดภัย อย่ากรอกในไฟล์นี้** |
| **→ TLS**                                | `trustServerCertificate=true` (self-signed/dev) หรือแนบไฟล์ CA cert (`.pem`/`.crt`)                     |                                         |

## เช็คก่อนปิดงาน (ฝั่ง Admin/DBA)

- [ ] Database หลักสร้างแล้ว ชื่อยืนยันตรงกับที่แจ้งกลับ
- [ ] Database shadow สร้างแล้ว **หรือ** login ได้สิทธิ์ `CREATE DATABASE` แทน
- [ ] SQL Login สร้างแล้ว พร้อมสิทธิ์ตามตาราง 1.1
- [ ] `encrypt=true` เปิดใช้งานบน SQL Server (ไม่ใช่ plaintext connection)
- [ ] ตัดสินใจเรื่อง TLS แล้ว (self-signed ยอมรับ หรือส่ง CA cert)
- [ ] กรอก "ค่าที่ต้องส่งกลับ" ด้านบน + ส่ง password ช่องทางปลอดภัยแล้ว

**เมื่อทีมพัฒนาได้ค่าครบ ขั้นตอนฝั่งโค้ด (ทำเองไม่ต้องรอ Admin เพิ่ม):**

```bash
# ใส่ค่าจริงใน .env.local (host/port/database/user/password ตามตารางด้านบน)
npx prisma migrate resolve --applied 20260902000000_init
npx prisma generate
npx prisma db seed
# schema เปลี่ยนเพิ่มเติมในอนาคต ใช้ปกติ:
# npx prisma migrate dev --name <describes_the_change>
```

<!-- /[DATABASE] -->

---

<!-- [AUTH] เพิ่มโดย ugt-nextjs-auth-setup เมื่อ 2026-09-02 — อย่าลบ section นี้ -->

## 2. Keycloak SSO

โปรเจคนี้ใช้ **SSO (Keycloak) เท่านั้น** — ไม่มี LDAP/AD bind และไม่มีรหัสผ่านแบบ
local ในระบบ (มติ: `docs/project-context/decisions.md`) ระบบ Login/RBAC ทั้งชุด
(Better Auth + ตาราง User/Session/Account/Role/Permission ฯลฯ) ถูกสร้างไว้พร้อม
ใช้งานแล้วในโค้ด แต่ **ยังไม่มี Keycloak client จริงให้เชื่อมต่อ** — ค่าที่ใช้ตอนนี้ใน
`.env.local` เป็น placeholder ทั้งหมด (`__KEYCLOAK_HOST__`/`__REALM__`/
`__KEYCLOAK_CLIENT_SECRET__`)

### 2.1 สิ่งที่ต้องขอจากทีม Keycloak องค์กร

| อะไร                               | ค่าที่ต้องระบุ                                           | หมายเหตุ                                                                |
| ---------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Client ใหม่ในระบบ Keycloak กลาง    | Client ID: `ugt-voicecare`                               | โปรเจคนี้มี client เป็นของตัวเอง — **ห้ามใช้ client ร่วมกับโปรเจคอื่น** |
| Client authentication              | เปิด (Confidential client — มี client secret)            |                                                                         |
| Standard flow (Authorization Code) | เปิด                                                     | ปิด direct access grants / implicit flow / service accounts — ไม่ใช้    |
| PKCE                               | S256                                                     | ตั้งที่ Advanced → Proof Key for Code Exchange Code Challenge Method    |
| Valid redirect URIs                | ดูตารางด้านล่าง (ต้องตรงตัวอักษรทุกตัว รวม `/` ท้าย URI) |                                                                         |
| Web origins                        | origin จริงของแอปที่ deploy (เช่น `https://<app-host>`)  |                                                                         |

**Redirect URI** (โปรเจคนี้ไม่มี basePath — deploy standalone ตามที่ตกลงไว้ตอนนี้ —
ยืนยันซ้ำอีกครั้งใน §5 ของหัวข้อ CI/CD ด้านล่าง):

```
http://localhost:3000/api/auth/callback/keycloak        (dev — ค่า placeholder ก่อน admin แจ้ง APP_PORT/host จริง)
https://<app-host>/api/auth/callback/keycloak            (prod — แจ้ง host จริงกลับมาด้วย ดูตาราง "ค่าที่ต้องส่งกลับ" ของ §5)
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
| **→ KEYCLOAK_CLIENT_ID**     | ยืนยันว่าใช้ `ugt-voicecare` ตามที่เสนอ หรือแจ้งชื่อจริง                                                             |                                         |
| **→ KEYCLOAK_CLIENT_SECRET** | จาก client → tab Credentials                                                                                         | **ส่งช่องทางปลอดภัย อย่ากรอกในไฟล์นี้** |
| **→ App host จริง (prod)**   | สำหรับลงทะเบียน redirect URI ที่ถูกต้อง                                                                              |                                         |
| **→ TLS**                    | internal CA cert (`.pem`/`.crt`) หรือยืนยันว่าเป็น intranet ปิด                                                      |                                         |

เมื่อได้ค่าครบ ใส่ใน `.env.local` แทนที่ `KEYCLOAK_ISSUER`/`KEYCLOAK_CLIENT_ID`/
`KEYCLOAK_CLIENT_SECRET` แล้วรีสตาร์ทแอป — ไม่ต้องแก้โค้ดใด ๆ เพิ่ม

## 3. ผู้ดูแลระบบคนแรก (First Admin)

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

โปรเจคนี้ส่งอีเมลจริงสำหรับการแจ้งเตือนที่แอปสร้างอยู่แล้ว (ยื่นเรื่องสำเร็จ /
อัปเดตสถานะ / ขอประเมินความพึงพอใจ / แจ้งเตือน CEO ด่วน) —
ยังไม่มี SMTP relay จริงให้เชื่อมต่อ (ตอนติดตั้งใช้ค่า placeholder ล้วน — ดู
`.env.example`) โครงเทมเพลตอีเมล ตัวส่ง และหน้าแก้ไขเทมเพลตที่
`/admin/mail-templates` **พร้อมใช้งานทันที** ที่ได้ค่าจริงด้านล่างนี้ — ไม่ต้อง
แก้โค้ดเพิ่ม แค่เติม `.env.local` แล้ว restart แอป

### 3.1 สิ่งที่ต้องขอจากทีม IT/Network

| อะไร                       | ค่าที่ต้องระบุ                                                          | หมายเหตุ                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| SMTP relay host/port       | เช่น `smtp.company.local` พอร์ต `25`/`587`/`465`                        | relay ภายในองค์กรส่วนใหญ่รับอีเมลจากเครื่องในเครือข่ายโดยไม่ต้อง auth — ถ้า relay ต้อง auth แจ้ง username/password กลับมาด้วย (ส่งช่องทางปลอดภัย)  |
| TLS                        | STARTTLS (พอร์ต 25/587, ปกติ) หรือ Implicit TLS (พอร์ต 465)             | ถ้าเป็น 465 ต้องตั้ง `SMTP_SECURE=true`                                                                                                            |
| ที่อยู่อีเมลผู้ส่ง (From)  | ที่อยู่ที่ relay **อนุญาตให้ส่งในนามนี้** เช่น `no-reply@company.co.th` | ถ้าใช้ที่อยู่ที่ relay ไม่อนุญาต อีเมลจะถูกปฏิเสธทั้งหมดโดยไม่มีใครในระบบเห็น error                                                                |
| ผู้ติดต่อสนับสนุน (footer) | ทีม/อีเมลที่จะโชว์ท้ายอีเมลทุกฉบับ ("หากพบปัญหากรุณาติดต่อ...")         | ค่าเริ่มต้นตอนนี้คือ "ทีม HR/IT Support" — ยืนยันหรือแจ้งชื่อ/อีเมลจริงกลับมา (แก้ที่ `lib/types/mail-templates.ts`'s `__SUPPORT_CONTACT_EMAIL__`) |

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

## 4. ไฟล์แนบ (Upload) + การตรวจไวรัส (ClamAV)

โปรเจคนี้เก็บไฟล์แนบจริงบน Docker volume (ไม่ใช่ใน database, ไม่ใช่ใน image) และสแกน
ไวรัสทุกไฟล์ก่อนเขียนลงดิสก์ (ClamAV, fail-closed — สแกนเนอร์ล่ม = ปฏิเสธการอัปโหลด
ไม่ใช่ปล่อยผ่าน) โค้ดฝั่งแอปพร้อมใช้งานจริงแล้ว (`lib/storage.ts`, `lib/virus-scan.ts`,
`src/app/api/files/**`) **แต่ service `clamav` และ volume bind-mount ยังไม่มีใน
`docker-compose.yml`/`docker-compose.dev.yml`/`Dockerfile` เลย** เพราะไฟล์เหล่านั้นยังไม่
ถูกสร้าง (`ugt-nextjs-cicd-setup` ยังไม่รัน) — ส่วนนี้จะถูกเติมเป็นขั้นตอนปิดงาน (close-out)
ทันทีหลัง CI/CD chunk ติดตั้ง Dockerfile เสร็จ (ดู `.claude/state/handoff.md`)

### 4.1 สิ่งที่ทีม Admin/DevOps ต้องรู้ (สำคัญ — ผลกระทบจริงเมื่อ deploy)

- **`/home/docker02/appdata/ugt-voicecare/storage` คือสำเนาไฟล์แนบชุดเดียวเท่านั้น**
  ไม่ได้อยู่ใน image และไม่ได้อยู่ใน database จึง**ไม่อยู่ในแผน backup ของฐานข้อมูล** —
  ต้องมี backup job แยกต่างหากสำหรับโฟลเดอร์นี้
- ลบโฟลเดอร์นี้บน host = ไฟล์แนบทุกไฟล์หายถาวร (container ลบ/สร้างใหม่ได้อิสระ
  `docker compose down && up -d` ปลอดภัย — แต่โฟลเดอร์นี้ห้ามลบ)
- ClamAV ต้องการ RAM ประมาณ **2 GB** และอัปเดต signature เอง (`freshclam` รันในตัว
  image) — boot ครั้งแรกดาวน์โหลด signature DB ~1 GB จากอินเทอร์เน็ต ถ้า host ไม่มี
  outbound internet ต้อง preload ไฟล์ signature เอง (รายละเอียดใน
  `ugt-nextjs-upload-setup`'s SKILL.md §7)
- **ถ้ามี reverse proxy (nginx/traefik) อยู่หน้าแอปใน production ต้องปรับ body-size
  limit ของ proxy ให้ ≥ 25 MB** (`UPLOAD_MAX_BYTES` ปัจจุบัน) เช่น nginx
  `client_max_body_size 25m;` — มิฉะนั้นไฟล์แนบขนาดใหญ่จะถูก proxy ปฏิเสธด้วย 413 ก่อน
  ถึงแอปเลย โดยที่แอปไม่เห็น error ใด ๆ — **ยังไม่ยืนยันว่า production มี reverse proxy
  หรือไม่** (รอมติเรื่อง basePath/shared-domain จาก `ugt-nextjs-cicd-setup`, ดู
  `.claude/state/handoff.md`) — ถือว่าคำแนะนำนี้ใช้ได้ไม่ว่าคำตอบจะเป็นอะไร

### 4.2 ขั้นตอนที่ยังไม่ได้ทำ (รอ CI/CD chunk ก่อน)

เมื่อ `ugt-nextjs-cicd-setup` สร้าง `Dockerfile`/`docker-compose.yml`/
`docker-compose.dev.yml` แล้ว ให้ apply
`assets/compose-and-dockerfile.snippet.md` จาก `ugt-nextjs-upload-setup` skill:

- Dockerfile: `RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage`
  ก่อน `USER nextjs`
- compose (ทั้งสองไฟล์): env `STORAGE_ROOT`/`UPLOAD_MAX_BYTES`/`CLAMAV_HOST`/
  `CLAMAV_PORT`/`CLAMAV_TIMEOUT_MS`, volume bind mount
  `/home/docker02/appdata/ugt-voicecare/storage:/app/storage` (bind mount เท่านั้น
  ห้าม named volume — ตาม cicd contract §2.8), service `clamav` พร้อม
  `depends_on: clamav: condition: service_healthy` และ `start_period: 300s` ใน
  healthcheck (boot แรกโหลด signature ~1 GB)
- Jenkinsfile's `[VOLUME]` mkdir -p line: เพิ่ม `storage` และ `clamav-db` เข้าไป

### ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า                                                                          | มาจากไหน                                                                                                               | กรอกตรงนี้ |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| **→ มี reverse proxy หน้าแอปใน production ไหม**                              | เช่น nginx/traefik ที่ terminate TLS หรือ route หลาย path บน domain เดียวกัน — ถ้ามี ต้องปรับ body-size limit ตาม §4.1 |            |
| **→ ใครรับผิดชอบ backup ของ `/home/docker02/appdata/ugt-voicecare/storage`** | ไม่ใช่ backup เดียวกับ database — ต้องมีแผนแยก                                                                         |            |
| **→ host มี outbound internet ให้ ClamAV ดาวน์โหลด signature DB ไหม**        | ถ้าไม่มี ต้อง preload ไฟล์ signature เอง — ดู SKILL.md §7 ของ `ugt-nextjs-upload-setup`                                |            |

## เช็คก่อนปิดงาน (ฝั่ง Admin/DevOps) — หลัง CI/CD chunk ติดตั้ง compose แล้วเท่านั้น

- [ ] `docker-compose.yml`/`docker-compose.dev.yml` มี volume bind mount ที่
      `/app/storage` และ service `clamav` (ไม่ใช่ named volume)
- [ ] มีแผน backup แยกสำหรับโฟลเดอร์ storage (ไม่ใช่แผนเดียวกับ database)
- [ ] ยืนยัน/ปฏิเสธเรื่อง reverse proxy แล้ว — ถ้ามี ปรับ body-size limit แล้ว
- [ ] ยืนยันแล้วว่า host มี/ไม่มี outbound internet สำหรับ ClamAV signature DB

<!-- /[UPLOAD] -->

---

<!-- [CICD] เพิ่มโดย ugt-nextjs-cicd-setup เมื่อ 2026-09-02 — อย่าลบ section นี้ -->

## 5. Jenkins / SonarQube / Docker host — CI/CD

> สร้างอัตโนมัติเมื่อ 2026-09-02 · ผู้ขอ: pakorn.worakarn@gmail.com
> โปรเจค: `ugt-voicecare` (repo git ยังเป็น local-only ตอนนี้ — ยังไม่ได้ push
> ขึ้น GitHub/GitLab/Gitea ใด ๆ — ดูหมายเหตุท้ายข้อ 5.1 ก่อนตั้ง webhook)
>
> โปรเจคนี้**ไม่มี basePath** (deploy standalone ที่ root path) และ**ไม่ใช้
> Sentry** — ยืนยันแล้วในชุดนี้ (มติ: `docs/project-context/decisions.md`)
> ชื่อทุกตัวด้านล่างถูก generate ให้ตรงกับค่าที่ตั้งไว้ในโปรเจคแล้ว —
> **กรุณาใช้ชื่อตามนี้เป๊ะ ๆ** (ต่างแม้ตัวเดียว pipeline จะไม่ทำงาน)

<!-- ถ้า Jenkins server นี้เคยตั้งโปรเจคอื่นแล้ว งานระดับ server (plugins, tools,
     nvd credential, NOTIFY_EMAIL, การสร้าง /home/docker02/appdata ครั้งแรก)
     ทำไปแล้ว — ทำเฉพาะระดับโปรเจคด้านล่าง (5.1–5.3) ถ้าเป็นโปรเจคแรกของ server
     ดูภาคผนวก §5.6 ท้ายหัวข้อนี้ -->

### 5.1 Jenkins — Credentials (Manage Jenkins → Credentials → Global)

| ชื่อ credential (ID)    | ชนิด            | ใส่อะไร                                                                              |
| ----------------------- | --------------- | ------------------------------------------------------------------------------------ |
| `env-ugt-voicecare`     | **Secret file** | ไฟล์ `.env` ของ **prod** (ทีมพัฒนาแนบให้ / นัดส่งช่องทางปลอดภัย)                     |
| `env-ugt-voicecare-dev` | **Secret file** | ไฟล์ `.env` ของ **dev** — ห้ามใช้ไฟล์เดียวกับ prod (คนละ `DATABASE_URL` คนละ secret) |

(ไม่มีแถว `sentry-dsn-ugt-voicecare` — โปรเจคนี้ไม่ใช้ Sentry)

### 5.2 Jenkins — Pipeline job

1. New Item → ชื่อ `ugt-voicecare` → เลือก **Multibranch Pipeline**
2. Branch Sources → repo ของโปรเจคนี้ → discover branches `main` และ `develop`
   — **หมายเหตุ**: repo นี้ยังเป็น git local-only (ยังไม่มี remote บน
   GitHub/GitLab/Gitea ใด ๆ) ต้อง push ขึ้นที่เก็บโค้ดที่องค์กรใช้งานก่อน
   ถึงจะตั้ง Multibranch Pipeline ชี้ไปได้ — แจ้งกลับทีมพัฒนาว่าจะใช้ที่เก็บ
   โค้ดไหน (ดูตาราง "ค่าที่ต้องส่งกลับ" ท้ายหัวข้อนี้)
3. **สำคัญ**: ปิด "Lightweight checkout" (ถ้าเปิดไว้ stage แรกจะพัง)

### 5.3 Webhook ที่ที่เก็บโค้ด (หลัง push ขึ้นจริงแล้ว)

- Settings → Webhooks → Add: URL `http://<jenkins-host>:8080/github-webhook/`
  (หรือ path ของ webhook ที่ตรงกับระบบที่ใช้จริง ถ้าไม่ใช่ GitHub) · event:
  **push เท่านั้น**
- ถ้า Jenkins เข้าถึง repo ไม่ได้ (อยู่คนละเครือข่าย) ใช้ `pollSCM` แทนได้ —
  แจ้งทีมพัฒนาถ้าต้องสลับวิธีนี้

### 5.4 SonarQube

**สร้าง Projects** (Administration → Projects → Create):

| Project Key         | Display name        |
| ------------------- | ------------------- |
| `ugt-voicecare`     | UGT VoiceCare       |
| `ugt-voicecare-dev` | UGT VoiceCare (Dev) |

**ผูก Quality Gate**: ใช้ gate มาตรฐานองค์กร (`new_coverage ≥ 60%`,
`new_violations = 0`, `new_duplicated_lines_density ≤ 3%`,
`new_security_hotspots_reviewed = 100%` — ถ้ายังไม่มี gate นี้ สร้างตามเกณฑ์นี้)
→ assign ให้**ทั้งสอง** projects ข้างบน

**Webhook กลับไป Jenkins** (Administration → Configuration → Webhooks):
URL `http://<jenkins-host>:8080/sonarqube-webhook/` — **ถ้าไม่ตั้งข้อนี้
pipeline จะค้างตลอดไป** ที่ขั้นรอผล Quality Gate

### 5.5 Docker host

- โปรเจคนี้**ไม่มี basePath** — deploy ที่ root path ตรง ๆ ไม่ผ่าน reverse-proxy
  subpath ใด ๆ (ยืนยันแล้ว มติใน `docs/project-context/decisions.md`) ถ้า
  ภายหลังต้องการ subpath ต้องแจ้งทีมพัฒนากลับมาเพื่อเปิด `NEXT_PUBLIC_BASE_PATH`
  ใน `next.config.ts`/Jenkinsfile/compose ใหม่
- Host port ที่ทีมพัฒนาใช้เป็นค่าเริ่มต้นตอนนี้: prod `3000`, dev `3001` — ถ้า
  server จริงมี port อื่นที่จัดสรรให้แล้ว **แจ้งกลับ** (ดูตารางท้ายหัวข้อ)
- **ไฟล์แนบจริง (ClamAV + storage volume) ต่อเข้ากับ compose ในชุดนี้แล้ว**
  (ไม่ได้ค้างเป็น deferred อีกต่อไป — ดู §4 ด้านบน) ต้องเตรียม:
  - `/home/docker02/appdata/ugt-voicecare/storage` +
    `/home/docker02/appdata/ugt-voicecare/clamav-db` (prod)
  - `/home/docker02/appdata/ugt-voicecare-dev/storage` +
    `/home/docker02/appdata/ugt-voicecare-dev/clamav-db` (dev)
  - Deploy stage สร้าง/chown ให้เองครั้งแรกที่ deploy (idempotent) — **แต่ต้อง
    มี `/home/docker02/appdata` เองอยู่แล้วและ jenkins user เขียนได้** (ดู §5.6
    ถ้ายังไม่เคยตั้ง)
  - `clamav` ต้องการ RAM ~2 GB และดาวน์โหลด signature DB ~1 GB ตอน boot ครั้งแรก
    — ถ้า host ไม่มี outbound internet ต้อง preload เอง (ดู §4.1)
- เครือข่าย `proxy-network` (Docker external network สำหรับ reverse-proxy
  ที่ใช้ร่วมกันทั้ง host) ต้องสร้างไว้แล้ว: `docker network create proxy-network`
  (ครั้งเดียวต่อ host — ข้ามได้ถ้ามีโปรเจคอื่นสร้างไว้แล้ว)
- **ยังไม่ยืนยันว่ามี reverse proxy หน้าแอปใน production หรือไม่** — ถ้ามี
  ต้องปรับ body-size limit ให้ ≥ 25 MB (nginx `client_max_body_size 25m;`)
  ตาม §4.1 — แจ้งกลับในตาราง "ค่าที่ต้องส่งกลับ" ท้ายหัวข้อนี้

### ผู้ดูแลระบบคนแรก

ระบบ**ไม่มีบัญชี admin ที่ seed ไว้ล่วงหน้า** (บัญชี SSO เกิดเองตอน login
ครั้งแรก จึง seed ล่วงหน้าไม่ได้) — **คนแรกที่ login จะถูกพาไปหน้า
`/admin/setup` และกดปุ่มเดียวเพื่อเป็น Administrator** เลือกคนที่จะ login
คนแรกให้ถูกคน แล้วคนนั้นค่อยกำหนดบทบาทให้คนอื่นจากหน้า `/admin/users`
(ซ้ำกับหัวข้อ 3 ด้านบน — คัดลอกมาให้ครบในหัวข้อนี้ตามรูปแบบมาตรฐานของ
ugt-nextjs-cicd-setup)

---

### ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า                                             | มาจากไหน                                                                                                                                                            | กรอกตรงนี้                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **→ ที่เก็บโค้ดที่จะ push repo นี้ขึ้น**        | GitHub/GitLab/Gitea ภายในองค์กร หรืออื่น ๆ — **จำเป็นก่อนตั้ง Jenkins job**                                                                                         |                                              |
| **→ Jenkins host**                              | สำหรับตั้ง webhook ทั้งสองทาง (§5.3, §5.4)                                                                                                                          |                                              |
| **→ `APP_PORT` (prod)**                         | Host port ที่จัดสรรให้บน server จริง                                                                                                                                | จำเป็น — ใช้ `3000` เป็น placeholder ไว้ก่อน |
| **→ `APP_PORT` (dev)**                          | Host port ที่จัดสรรให้บน server dev                                                                                                                                 | จำเป็น — ใช้ `3001` เป็น placeholder ไว้ก่อน |
| **→ App host จริง (prod/dev)**                  | โดเมน/IP จริงที่แอปจะรันอยู่ — ใช้แทนค่าปัจจุบัน `http://localhost:3000`/`:3001` ใน build args (ดูข้อ 2 ด้านบนด้วย — ใช้ค่าเดียวกับที่ส่งให้ Keycloak redirect URI) |                                              |
| ยืนยัน Jenkins job สร้างแล้ว                    | ลิงก์ job                                                                                                                                                           |                                              |
| ยืนยัน SonarQube projects + webhook แล้ว        | ลิงก์ project                                                                                                                                                       |                                              |
| ยืนยัน `/home/docker02/appdata` พร้อมใช้แล้ว    | `sudo mkdir -p /home/docker02/appdata && sudo chown jenkins:jenkins /home/docker02/appdata` (ครั้งแรกของ server เท่านั้น)                                           |                                              |
| **→ มี reverse proxy หน้าแอปใน production ไหม** | ซ้ำกับ §4 ด้านบน — ยังไม่มีคำตอบ ณ ตอนติดตั้งชุดนี้                                                                                                                 |                                              |

### เช็คก่อนปิดงาน (ฝั่ง Admin/DevOps)

- [ ] ชื่อทุกตัวตรงกับตารางเป๊ะ (โดยเฉพาะ credential ID)
- [ ] repo ถูก push ขึ้นที่เก็บโค้ดจริงแล้ว + Jenkins job ชี้ไปถูกที่
- [ ] webhook ทั้งสองฝั่ง (VCS→Jenkins, SonarQube→Jenkins) ตั้งแล้ว
- [ ] `APP_PORT` (prod/dev) ส่งกลับแล้ว ไม่ใช่แค่ placeholder `3000`/`3001`
- [ ] App host จริง (prod/dev) ส่งกลับแล้ว
- [ ] `/home/docker02/appdata` พร้อมเขียนได้แล้ว (jenkins user)
- [ ] `proxy-network` (Docker external network) สร้างแล้ว
- [ ] ยืนยัน/ปฏิเสธเรื่อง reverse proxy แล้ว (ซ้ำ §4)

---

<!-- ภาคผนวก §5.6: ใส่เฉพาะเมื่อเป็นโปรเจคแรกบน Jenkins server นี้ — ถ้าไม่ใช่
     ลบทิ้ง -->

### 5.6 ภาคผนวก — ถ้าเป็นโปรเจคแรกบน Jenkins server นี้ (server-level setup)

**Jenkins plugins ที่ต้องลง**: NodeJS Plugin, SonarQube Scanner, OWASP
Dependency-Check, JUnit Plugin, HTML Publisher, Email Extension, Pipeline,
Git Plugin

**Jenkins → Tools (ชื่อต้องตรงเป๊ะ)**:

| Tool type         | ชื่อ (เป๊ะ)         | Version                        |
| ----------------- | ------------------- | ------------------------------ |
| NodeJS            | `NodeJS-22`         | Node 22.x                      |
| SonarQube Scanner | `SonarQube-Scanner` | Latest                         |
| Dependency-Check  | `Dependency-Check`  | Latest (Install automatically) |

**Jenkins → System → SonarQube servers → Add**: name `SonarQube` (ต้องตรงกับ
`withSonarQubeEnv('SonarQube')` ใน Jenkinsfile) · Server URL `http://<sonarqube-host>:9000`
· token เป็น Secret Text credential ที่ผูกไว้ในนี้ (ไม่ใช่ hardcode ใน Jenkinsfile)

**Jenkins → System → Global properties → Environment variables**:
`NOTIFY_EMAIL` (ผู้รับอีเมลผลลัพธ์ pipeline), `SMTP_FROM` (from-address) —
ตั้งค่า SMTP ที่ Extended E-mail Notification ด้วย

**`nvd` credential** (Secret text, server-level ใช้ร่วมกันทุกโปรเจค): NVD API
key จาก nvd.nist.gov — ถ้าไม่มี OWASP Dependency Check จะช้ามาก (rate limit
5 req/30s)

**Docker บน Jenkins host ติดตั้งผ่าน snap หรือเปล่า** (พบบน Ubuntu Core 24):
ถ้าใช่ bind-mount `/usr/bin/docker` เข้า Jenkins container ใช้ไม่ได้ — ต้อง
build custom Jenkins image ที่มี Docker CLI ข้างใน (รายละเอียด: ให้ทีมพัฒนา
ส่ง `references/jenkins-one-time-setup.md` ของ skill `ugt-nextjs-cicd-setup`
ให้ทีม Jenkins)

**`docker compose` v2 หรือ `docker-compose` v1**: เช็คด้วย `docker compose version`
— ถ้ามีแต่ v1 (legacy, EOL กลางปี 2023) แจ้งทีมพัฒนาให้แก้ Jenkinsfile กลับไปใช้
`docker-compose` (มีขีด)

**สร้าง `/home/docker02/appdata` ครั้งเดียว** (โปรเจคย่อยข้างในสร้างเองทีหลัง):

```bash
sudo mkdir -p /home/docker02/appdata && sudo chown jenkins:jenkins /home/docker02/appdata
docker network create proxy-network
```

**NVD update strategy**: Jenkinsfile ใช้ `--noupdate` (สแกนกับ cache local
เท่านั้น) — ต้องมี cron job แยก (`dependency-check --updateonly` รายวัน) หรือ
รันครั้งแรกโดยไม่ใส่ `--noupdate` (ใช้เวลา 60–90 นาที) แล้วค่อยใส่กลับ

<!-- /[CICD] -->
