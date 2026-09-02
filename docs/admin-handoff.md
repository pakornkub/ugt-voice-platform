# คำขอตั้งค่าระบบ — UGT VoiceCare (`ugt-voicecare`)

> **เอกสารส่งต่อทีม Admin / DBA / DevOps** · สร้างครั้งแรกเมื่อ 2026-09-02
> (chunk: `ugt-nextjs-database-setup`) — ไฟล์นี้จะถูกเติมต่อโดย chunk ถัดไป
> (`ugt-nextjs-auth-setup`, `ugt-nextjs-cicd-setup`) แต่ละ section มีคอมเมนต์บอก
> ว่าใครสร้าง — **อย่าลบ section ของ chunk อื่น**
>
> ทำเสร็จแล้วกรุณา**กรอกหัวข้อสุดท้าย "ค่าที่ต้องส่งกลับ" แล้วส่งไฟล์นี้คืน**ทีมพัฒนา

## ภาพรวม 1 นาที — ต้องทำอะไรบ้าง

| #   | ระบบ       | งาน                                                              | ใช้เวลาโดยประมาณ |
| --- | ---------- | ---------------------------------------------------------------- | ---------------- |
| 1   | SQL Server | สร้าง database 2 ตัว (จริง + shadow) + login/user 1 ตัว + สิทธิ์ | ~10 นาที         |

<!-- แถวใหม่จะถูกเพิ่มโดย ugt-nextjs-auth-setup (Keycloak) และ
     ugt-nextjs-cicd-setup (Jenkins/SonarQube) ในภายหลัง -->

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

- ไม่มี stored procedure / linked server ให้ตั้งค่าในชุดนี้ (โปรเจคยังไม่ใช้)
- ไม่ต้อง seed ข้อมูลเอง — ทีมพัฒนามี `prisma/seed.ts` รันเองผ่าน
  `npx prisma db seed` ทันทีที่ได้ `DATABASE_URL` จริง

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

<!-- ส่วนของ ugt-nextjs-auth-setup (Keycloak/LDAP), ugt-nextjs-cicd-setup
     (Jenkins/SonarQube) และผู้ดูแลระบบคนแรกจะถูกเพิ่มต่อท้ายไฟล์นี้โดย
     chunk เหล่านั้นเอง เมื่อรัน -->
