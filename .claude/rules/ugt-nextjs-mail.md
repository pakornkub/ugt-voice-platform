---
paths:
  - 'lib/email.ts'
  - 'lib/mail-templates.ts'
  - 'lib/types/mail-templates.ts'
  - 'lib/actions/**/*.ts'
---

# Sending email in this project

Every workflow email goes through **`sendTemplatedMail`** — never
`sendMail` directly, and never a fresh nodemailer transport.

| กฎ                                                                                                          | เหตุผล                                                                                                       |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| ส่งเมล**ห้ามทำให้การบันทึกข้อมูลล้ม** — เรียกหลัง transaction commit แล้ว `catch` + log ไว้                 | ผู้ใช้กดยืนยันแล้วต้องสำเร็จ แม้ SMTP ล่ม                                                                    |
| ต้องส่ง `actor` (email + `hasDevMode`) ทุกครั้ง                                                             | ไม่ส่ง = dev mode ไม่ทำงาน เมลทดสอบวิ่งไปหาคนจริง                                                            |
| ค่าที่ผู้ใช้พิมพ์ (เหตุผล, หมายเหตุ) ใส่เป็น `{{token}}` ธรรมดาเท่านั้น                                     | ระบบ escape ให้อัตโนมัติ                                                                                     |
| **ห้ามเพิ่ม token ที่มาจากผู้ใช้ลง `htmlVariables`**                                                        | นั่นคือช่องเดียวที่ข้าม escape — สำหรับ HTML ที่ server สร้างเองเท่านั้น (เช่นตารางที่ escape ราย cell แล้ว) |
| เพิ่ม template ใหม่: เติมทั้ง `MAIL_TEMPLATE_KEYS` + `MAIL_TEMPLATE_DEFINITIONS` + `DEFAULT_MAIL_TEMPLATES` | ขาดตัวใดตัวหนึ่ง TypeScript จะฟ้อง หรือ (แย่กว่า) เมลออกโดยไม่มีเนื้อหา                                      |
| ลิงก์ในเมลใช้ URL เต็มจาก env (มี basePath)                                                                 | เมลเปิดนอกแอป ลิงก์ relative ใช้ไม่ได้                                                                       |
| แก้ chrome (header/footer/banner/CTA) ที่ `lib/types/mail-templates.ts` เท่านั้น                            | admin แก้ได้แค่เนื้อหา — layout กับข้อความ disclaimer ต้องคงที่ทุกฉบับ                                       |

Template keys ในโปรเจคนี้ตรงกับ `NotificationItem['type']` (src/types.ts) แบบ
1:1 — `ticket.new_ticket` / `ticket.status_update` /
`ticket.satisfaction_pending` / `ticket.direct_ceo_alert` /
`ticket.sla_warning`. ไม่มี `auth.password-reset` — โปรเจคนี้ใช้ SSO
(Keycloak) เท่านั้น ไม่มีบัญชี local ให้ตั้งรหัสผ่าน.

จุดเรียกจริง: `lib/actions/tickets.ts`'s `submitTicket`/`updateTicketWorkflow`
(Prisma Server Actions) — **ไม่ใช่** `src/services/api.ts` (client-side,
เรียก nodemailer ไม่ได้). ดู docs/project-context/decisions.md สำหรับมติเรื่อง
scope นี้ — วันนี้ยังไม่มี component ไหนเรียก Server Action พวกนี้จริง
(ยังใช้ localStorage ผ่าน api.ts อยู่) จึงยังไม่มีอีเมลออกจริงจนกว่าจะสลับ
call site.

```ts
// ✅ อัปเดตสถานะสำเร็จก่อน แล้วค่อยส่งเมล — เมลล้มไม่ย้อนธุรกรรม
await prisma.notification.create({/* ... */});
try {
  await sendTemplatedMail({
    templateKey: 'ticket.status_update',
    to: updated.submitterEmail,
    vars: {
      appName: 'UGT VoicePlatform',
      recipientName: updated.submitterName,
      trackingCode: updated.trackingCode,
      notificationTitle: notifTitle,
      notificationMessage: notifMsg,
      detailUrl,
    },
    actor: { email: session?.user.email, hasDevMode: perms.includes(PERMISSIONS.DEV_MODE) },
  });
} catch (error) {
  console.error('mail failed', { templateKey: 'ticket.status_update', error });
}
```
