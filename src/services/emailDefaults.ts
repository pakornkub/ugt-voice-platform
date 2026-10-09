// Pure (no server / browser APIs) so the admin screen and the server-side dispatcher share one
// source for the defaults and the `{token}` interpolation (rewiring slice 3, 2026-10-09).
import type { EmailNotificationSettings } from '../types';

export const DEFAULT_EMAIL_SETTINGS: EmailNotificationSettings = {
  masterEnabled: true,
  onTicketSubmitted: {
    enabled: true,
    subject:
      '[VoicePlatform แจ้งเรื่องใหม่] {ticketId}: มีข้อร้องเรียนใหม่ ({categoryTh}) - {urgency}',
    body: `เรียน ทีมงาน Gatekeeper ประจำฝ่าย {categoryTh},

ระบบ VoicePlatform ขอแจ้งเตือนว่ามีผู้ยื่นเรื่องข้อร้องเรียน/ข้อเสนอแนะใหม่เข้าระบบ โดยมีรายละเอียดดังนี้:

- รหัสติดตาม (Tracking ID): {ticketId}
- หมวดหมู่ (Category): {categoryTh} ({category})
- หัวข้อเรื่อง (Title): {title}
- ระดับความเร่งด่วน (Urgency): {urgency}
- ผู้ยื่นเรื่อง (Submitter): {senderName} ({senderDept})
- วันที่และเวลาที่ยื่น (Submitted At): {submissionDate}

รายละเอียดข้อร้องเรียน:
"{description}"

กรุณาเข้าสู่ระบบเพื่อดำเนินการคัดกรอง (Triage), ตรวจสอบความถูกต้อง, มอบหมายเจ้าหน้าที่ผู้รับผิดชอบ และประสานงานแก้ไขปัญหาตามระเบียบนโยบายขององค์กรต่อไป

เข้าสู่ระบบจัดการเคส: {trackingUrl}

ขอแสดงความนับถือ,
ระบบรับเรื่องร้องเรียนและข้อเสนอแนะองค์กร VoicePlatform`,
  },
  onTicketResolved: {
    enabled: true,
    subject:
      '[VoicePlatform แจ้งผลการแก้ไข] เรื่อง {ticketId}: ดำเนินการแก้ไขเสร็จสิ้นเรียบร้อยแล้ว',
    body: `เรียน คุณ {recipientName},

ระบบ VoicePlatform ขอแจ้งให้ท่านทราบว่า ข้อร้องเรียน/ข้อเสนอแนะของท่านได้รับการตรวจสอบและดำเนินการแก้ไขเสร็จสิ้นเรียบร้อยแล้ว

ข้อมูลสรุปการดำเนินงาน:
- รหัสติดตาม (Tracking ID): {ticketId}
- หัวข้อเรื่อง (Title): {title}
- หมวดหมู่ (Category): {categoryTh}
- ผู้ดำเนินการปิดเคส: {resolvedBy}
- วันที่ดำเนินการเสร็จสิ้น: {resolvedDate}

สรุปผลการแก้ไขและการดำเนินงาน:
"{resolutionNotes}"

ท่านสามารถเข้าสู่ระบบเพื่อตรวจสอบรายละเอียดการดำเนินงานย้อนหลัง (Audit Timeline) และโปรดร่วมสละเวลา 1 นาทีในการทำแบบประเมินความพึงพอใจ (CSAT Rating) เพื่อเป็นข้อมูลในการปรับปรุงมาตรฐานการบริการขององค์กรต่อไป

ตรวจสอบผลการแก้ไขและทำแบบประเมิน: {trackingUrl}

ขอแสดงความนับถือ,
ทีมงาน VoicePlatform & แผนก {categoryTh}`,
  },
  updatedAt: new Date().toISOString(),
};

/** Substitutes `{token}` placeholders; a nullish value becomes `-`. Plain text in, plain text out. */
export function interpolateEmailTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    // split/join, not String.replace — a "$&" in user text must not act as a pattern
    result = result.split(`{${key}}`).join(val ?? '-');
  }
  return result;
}
