import { describe, expect, it } from 'vitest';
import { EXACT, localizeServerText } from './serverText';
import { CATEGORY_DEFINITIONS } from '../mockData';

const THAI = /[฀-๿]/;
// A person's name inside a demo message stays as written — the only Thai allowed in an EN value.
const NAME_IN_VALUE = ['กิตติศักดิ์ ชัยชนะ'];

const en = (text: string) => localizeServerText(text, 'en');

describe('localizeServerText — exact phrases', () => {
  const entries = Object.entries(EXACT);

  it('has a table to speak of', () => {
    expect(entries.length).toBeGreaterThan(60);
  });

  it.each(entries)('maps %s to its English', (th, english) => {
    expect(english.trim()).not.toBe('');
    expect(english).not.toBe(th);
    expect(en(th)).toBe(english);
  });

  it.each(entries)('leaves %s untouched in TH', (th) => {
    expect(localizeServerText(th, 'th')).toBe(th);
  });

  it.each(entries)('keeps Thai out of the English for %s', (th, english) => {
    const stripped = NAME_IN_VALUE.reduce((text, name) => text.replace(name, ''), english);
    expect(THAI.test(stripped)).toBe(false);
  });
});

describe('localizeServerText — what the server writes', () => {
  it('translates the status action labels', () => {
    expect(en('ยื่นเรื่องเข้าระบบ')).toBe('Ticket submitted');
    expect(en('ปิดเรื่องและประเมินผลความพึงพอใจ')).toBe('Ticket closed and satisfaction evaluated');
  });

  it('translates the redaction labels', () => {
    expect(en('ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)')).toBe('Submitter (anonymous)');
    expect(en('พนักงานผู้ร้องเรียน (ปกปิดตัวตน)')).toBe('Complainant (identity protected)');
  });

  it('translates the auto-assign timeline, keeping the officer name', () => {
    expect(en('ระบบจ่ายงานอัตโนมัติ (Auto-Assign)')).toBe('Auto-Assign');
    expect(en('มอบหมายเจ้าหน้าที่ผู้รับผิดชอบอัตโนมัติ: สมหญิง ใจดี')).toBe(
      'Automatically assigned the responsible officer: สมหญิง ใจดี'
    );
    expect(en('ตามรูปแบบการจ่ายงานที่ตั้งค่าไว้ของหมวดหมู่นี้')).toBe(
      "Per this category's configured assignment mode"
    );
  });

  it('translates the submitted notification and keeps the title, code and department', () => {
    expect(en('ยื่นเรื่องสำเร็จ: Wi-Fi ชั้น 18 ใช้งานไม่ได้...')).toBe(
      'Ticket submitted: Wi-Fi ชั้น 18 ใช้งานไม่ได้...'
    );
    expect(
      en(
        'รหัสติดตามของคุณคือ TK-2026-1234 หน่วยงาน People & Culture Department ได้รับเรื่องเข้าสู่ระบบเรียบร้อยแล้ว'
      )
    ).toBe(
      'Your tracking code is TK-2026-1234. People & Culture Department has received your ticket.'
    );
  });

  it('translates the CEO alert with its title, category and urgency', () => {
    expect(en('[CEO/EVP Alert] ข้อร้องเรียนสำคัญส่งตรงถึงผู้บริหาร')).toBe(
      '[CEO/EVP Alert] Critical grievance sent directly to executives'
    );
    expect(en('เรื่อง: เงินทอนไม่ครบ (หมวดหมู่: Fraud, ความเร่งด่วน: Critical)')).toBe(
      'Subject: เงินทอนไม่ครบ (Category: Fraud, Urgency: Critical)'
    );
  });

  it('translates the status notification, including the status label and the actor', () => {
    expect(en('อัปเดตความคืบหน้า (TK-2026-0001)')).toBe('Progress update (TK-2026-0001)');
    expect(
      en('เรื่องของคุณมีการเปลี่ยนสถานะเป็น "กำลังแก้ไข (In Progress)" โดย Gatekeeper Supervisor')
    ).toBe('Your ticket\'s status changed to "In Progress" by Gatekeeper Supervisor');
    expect(
      en(
        'เรื่องของคุณมีการเปลี่ยนสถานะเป็น "ปิดเรื่องสมบูรณ์ (Closed)" โดย พนักงานผู้ร้องเรียน (ปกปิดตัวตน)'
      )
    ).toBe('Your ticket\'s status changed to "Closed" by Complainant (identity protected)');
    expect(
      en('เรื่องของคุณมีการเปลี่ยนสถานะเป็น "ยื่นเรื่องแล้ว (Submitted)" โดย สมชาย ใจดี')
    ).toBe('Your ticket\'s status changed to "Submitted" by สมชาย ใจดี');
  });

  it('translates every status label', () => {
    expect(en('ยื่นเรื่องแล้ว (Submitted)')).toBe('Submitted');
    expect(en('หน่วยงานรับเรื่อง (Triaged)')).toBe('Triaged');
    expect(en('กำลังแก้ไข (In Progress)')).toBe('In Progress');
    expect(en('แก้ไขเสร็จสิ้น (Resolved)')).toBe('Resolved');
    expect(en('ปิดเรื่องสมบูรณ์ (Closed)')).toBe('Closed');
  });

  it('translates the resolved notification, keeping the tracking code', () => {
    expect(en('แก้ไขเสร็จสิ้น: รหัส TK-2026-0042')).toBe('Resolved: ticket TK-2026-0042');
    expect(
      en(
        'หน่วยงานได้ดำเนินการแก้ไขปัญหาเรียบร้อยแล้ว กรุณาให้คะแนนประเมินความพึงพอใจเพื่อพัฒนาองค์กร'
      )
    ).toBe(
      'The responsible unit has resolved the issue. Please rate your satisfaction to help us improve.'
    );
  });

  it('translates the CSAT close with the star count (singular and plural)', () => {
    expect(en('ประเมินความพึงพอใจ 5 ดาว และปิดเรื่อง (Closed)')).toBe(
      'Rated satisfaction 5 stars and closed the ticket'
    );
    expect(en('ประเมินความพึงพอใจ 1 ดาว และปิดเรื่อง (Closed)')).toBe(
      'Rated satisfaction 1 star and closed the ticket'
    );
    expect(en('ประเมินความพึงพอใจ 4 ดาวและปิดเรื่อง')).toBe(
      'Rated satisfaction 4 stars and closed the ticket'
    );
    expect(en('ประเมินความพึงพอใจ 5 ดาว และปิดเรื่อง')).toBe(
      'Rated satisfaction 5 stars and closed the ticket'
    );
    expect(en('พนักงานผู้แจ้ง')).toBe('Reporting employee');
    expect(en('ส่งผลประเมินความพึงพอใจเสร็จสิ้น')).toBe('Satisfaction evaluation submitted');
  });

  it('translates the chat timeline, notifications and sender labels', () => {
    expect(en('เจ้าหน้าที่ส่งข้อความสอบถาม/ชี้แจงผ่านช่องทางนิรนาม')).toBe(
      'Staff sent a question or clarification through the anonymous channel'
    );
    expect(en('ผู้ยื่นเรื่องตอบกลับผ่านช่องทางสื่อสารนิรนาม')).toBe(
      'The submitter replied through the anonymous channel'
    );
    expect(en('[ข้อความใหม่จากเจ้าหน้าที่] TK-2026-0007')).toBe(
      '[New message from staff] TK-2026-0007'
    );
    expect(en('[ข้อความใหม่จากผู้ร้องเรียน] TK-2026-0007')).toBe(
      '[New message from complainant] TK-2026-0007'
    );
    expect(en('ผู้ยื่นเรื่อง (ไม่เปิดเผยตัวตน / Anonymous)')).toBe('Submitter (Anonymous)');
    expect(en('ผู้ยื่นเรื่อง (Employee)')).toBe('Submitter (Employee)');
    expect(en('คณะกรรมการตรวจสอบ / ผู้บริหารระดับสูง (Audit Committee)')).toBe(
      'Audit Committee / Senior Executives'
    );
    expect(en('เจ้าหน้าที่ผู้ดูแลระบบ (System Admin)')).toBe('System Admin');
    expect(en('Gatekeeper (สมชาย ใจดี)')).toBe('Gatekeeper (สมชาย ใจดี)');
  });

  it('translates a chat notification message by its sender label and keeps the body', () => {
    expect(en('ผู้ยื่นเรื่อง (ไม่เปิดเผยตัวตน / Anonymous): ขอรายละเอียดเพิ่มเติมได้ไหมคะ')).toBe(
      'Submitter (Anonymous): ขอรายละเอียดเพิ่มเติมได้ไหมคะ'
    );
    expect(en('เจ้าหน้าที่ผู้ดูแลระบบ (System Admin): รับทราบ: จะตรวจสอบ')).toBe(
      'System Admin: รับทราบ: จะตรวจสอบ'
    );
  });

  it('translates "Gatekeeper ประจำฝ่าย …", mapping a category name too', () => {
    expect(en('Gatekeeper ประจำฝ่าย HR')).toBe('Gatekeeper, HR department');
    expect(en(`Gatekeeper ประจำฝ่าย ${CATEGORY_DEFINITIONS.Fraud.nameTh}`)).toBe(
      `Gatekeeper, ${CATEGORY_DEFINITIONS.Fraud.nameEn} department`
    );
    expect(en('Gatekeeper (สมชาย ใจดี): ได้รับเรื่องแล้ว')).toBe(
      'Gatekeeper (สมชาย ใจดี): ได้รับเรื่องแล้ว'
    );
  });

  it('translates the mail log labels', () => {
    expect(en('ผู้ยื่นเรื่องนิรนาม (Anonymous)')).toBe('Anonymous submitter');
    expect(en('ผู้ยื่นเรื่อง (Anonymous Submitter)')).toBe('Anonymous submitter');
    expect(en('ไม่เปิดเผยสังกัด')).toBe('Department withheld');
    expect(en('ทั่วไป')).toBe('General');
    expect(en('สมศักดิ์ มั่นคง (พนักงาน)')).toBe('สมศักดิ์ มั่นคง (Employee)');
  });

  it('translates the demo-data notification titles by prefix', () => {
    expect(en('แก้ไขเสร็จสิ้น: ปัญหาบันไดหนีไฟ')).toBe('Resolved: ปัญหาบันไดหนีไฟ');
    expect(en('อัปเดตสถานะ: ปัญหา Wi-Fi')).toBe('Status update: ปัญหา Wi-Fi');
    expect(en('นิติกรอาวุโส มนตรี ธนบดีกุล (Legal & Compliance)')).toBe(
      'Senior Legal Counsel มนตรี ธนบดีกุล (Legal & Compliance)'
    );
  });

  it('translates the demo-data CSAT action', () => {
    expect(en('ประเมินความพึงพอใจ 4 ดาวและปิดเรื่อง')).toContain('4 stars');
  });
});

describe('localizeServerText — passthrough', () => {
  it('returns Thai unchanged in TH, for exact phrases, patterns and unknown text alike', () => {
    for (const text of [
      'ยื่นเรื่องเข้าระบบ',
      'แก้ไขเสร็จสิ้น: รหัส TK-2026-0042',
      'ข้อความอิสระของผู้ใช้',
    ]) {
      expect(localizeServerText(text, 'th')).toBe(text);
    }
  });

  it('returns unknown text unchanged in EN (free-text notes, names, English)', () => {
    for (const text of [
      'บันทึกจากเจ้าหน้าที่: ตรวจสอบแล้ว',
      'สมชาย ใจดี',
      '[Anonymous Q&A] ขอข้อมูลเพิ่ม',
      'Gatekeeper Supervisor',
      'Employee',
      'Already English',
    ]) {
      expect(en(text)).toBe(text);
    }
  });

  it('keeps an unknown sender label before a colon unchanged', () => {
    expect(en('สมชาย ใจดี: สวัสดีครับ')).toBe('สมชาย ใจดี: สวัสดีครับ');
    expect(en(': leading colon')).toBe(': leading colon');
  });

  it('does not match a template when its literals are missing or overlap', () => {
    expect(en('เรื่อง: ไม่มีหมวดหมู่')).toBe('เรื่อง: ไม่มีหมวดหมู่');
    expect(en('รหัสติดตามของคุณคือ')).toBe('รหัสติดตามของคุณคือ');
    expect(en('ยื่นเรื่องสำเร็จ: ')).toBe('ยื่นเรื่องสำเร็จ: ');
  });

  it('handles empty, null and undefined', () => {
    expect(localizeServerText('', 'en')).toBe('');
    expect(localizeServerText(null, 'en')).toBe('');
    expect(localizeServerText(undefined, 'th')).toBe('');
  });
});
