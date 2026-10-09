// Server-written text that is stored in Thai (timeline actions/actors/notes, notification titles and
// messages, chat sender labels, redaction labels) — shown in EN by mapping known phrases on the client.
// Stored rows are never rewritten (decisions.md 2026-10-09 "Every screen bilingual TH/EN").
// Unknown text (free-text notes, names) passes through unchanged.
//
// Sources (keep in step when the server text changes): lib/actions/tickets.ts, lib/ticket-scope.ts,
// lib/email-notifications.ts and the demo rows in src/mockData.ts (seeded by prisma/seed.ts).
import type { Language } from '../context/LanguageContext';
import { CATEGORY_DEFINITIONS } from '../mockData';

/** Exact phrase → English. */
export const EXACT: Record<string, string> = {
  // ── Timeline actions (actionLabelForStatus, submissionTimeline, chat, CSAT) ──
  ยื่นเรื่องเข้าระบบ: 'Ticket submitted',
  'Gatekeeper รับเรื่องและคัดกรองผู้รับผิดชอบ':
    'Gatekeeper received the ticket and screened for the responsible owner',
  อยู่ระหว่างลงพื้นที่และดำเนินการแก้ไข: 'On site and working on a fix',
  'ดำเนินการแก้ไขแล้วเสร็จ พร้อมส่งมอบงาน': 'Fix completed and handed over',
  ปิดเรื่องและประเมินผลความพึงพอใจ: 'Ticket closed and satisfaction evaluated',
  อัปเดตข้อมูล: 'Information updated',
  'ยื่นเรื่องส่งตรงถึงผู้บริหารระดับสูง (CEO/EVP Whistleblower Channel)':
    'Submitted directly to senior executives (CEO/EVP Whistleblower Channel)',
  ยื่นเรื่องเข้าระบบสำเร็จ: 'Ticket submitted successfully',
  // Triage-modal defaults saved as typed (GatekeeperInbox), whatever the UI language
  'Gatekeeper รับเรื่องและมอบหมายผู้รับผิดชอบ':
    'Gatekeeper received the ticket and assigned an owner',
  'แก้ไขปัญหาเสร็จสิ้น พร้อมส่งมอบให้พนักงานประเมิน':
    'Issue resolved and handed over for the employee to evaluate',
  เจ้าหน้าที่ผู้รับผิดชอบ: 'Responsible officer',
  'ระบบจ่ายงานอัตโนมัติ (Auto-Assign)': 'Auto-Assign',
  'เจ้าหน้าที่ส่งข้อความสอบถาม/ชี้แจงผ่านช่องทางนิรนาม':
    'Staff sent a question or clarification through the anonymous channel',
  ผู้ยื่นเรื่องตอบกลับผ่านช่องทางสื่อสารนิรนาม:
    'The submitter replied through the anonymous channel',

  // ── Timeline notes ──
  'ระบบได้รับเรื่องและเข้าสู่คิวคัดกรองของ Gatekeeper':
    'The system received the ticket and placed it in the Gatekeeper triage queue',
  'ยื่นเรื่องแบบไม่ระบุตัวตน (ระบบเชื่อมโยงอีเมลล็อกอินหลังบ้านจากฐานข้อมูลพนักงานเรียบร้อยแล้ว)':
    'Submitted anonymously (the system linked the login email in the back office from the employee database)',
  'ติดแท็กสำคัญพิเศษ: ส่งตรงถึงโต๊ะทำงานผู้บริหารระดับสูง':
    'Tagged as special priority: sent straight to the senior executives desk',
  ตามรูปแบบการจ่ายงานที่ตั้งค่าไว้ของหมวดหมู่นี้: "Per this category's configured assignment mode",
  ส่งผลประเมินความพึงพอใจเสร็จสิ้น: 'Satisfaction evaluation submitted',
  ดำเนินการตรวจสอบและแก้ไขปัญหาเรียบร้อยตามมาตรฐานการปฏิบัติงาน:
    'Reviewed and resolved the issue according to the operating standard',

  // ── Actors / sender and recipient labels ──
  พนักงาน: 'Employee',
  'พนักงาน (ไม่เปิดเผยตัวตน)': 'Employee (Anonymous)',
  'พนักงานผู้ยื่นเรื่อง (ไม่ระบุตัวตน)': 'Submitting employee (anonymous)',
  พนักงานผู้ยื่นเรื่อง: 'Submitting employee',
  พนักงานผู้แจ้ง: 'Reporting employee',
  พนักงานผู้ขอสงวนนาม: 'Employee (name withheld)',
  'ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)': 'Submitter (anonymous)',
  'พนักงานผู้ร้องเรียน (ปกปิดตัวตน)': 'Complainant (identity protected)',
  'ผู้ยื่นเรื่อง (ไม่เปิดเผยตัวตน / Anonymous)': 'Submitter (Anonymous)',
  'ผู้ยื่นเรื่อง (Employee)': 'Submitter (Employee)',
  'ผู้ยื่นเรื่องนิรนาม (Anonymous)': 'Anonymous submitter',
  'ผู้ยื่นเรื่อง (Anonymous Submitter)': 'Anonymous submitter',
  'คณะกรรมการตรวจสอบ / ผู้บริหารระดับสูง (Audit Committee)': 'Audit Committee / Senior Executives',
  'เจ้าหน้าที่ผู้ดูแลระบบ (System Admin)': 'System Admin',
  ไม่เปิดเผยสังกัด: 'Department withheld',
  ทั่วไป: 'General',
  ผู้ร้องเรียน: 'Complainant',
  ผู้แจ้งเบาะแส: 'Whistleblower',
  ผู้แจ้งเบาะแสไม่ประสงค์ออกนาม: 'Anonymous whistleblower',
  'ผู้ยื่นข้อเสนอแนะ (Employee)': 'Suggestion submitter',
  'ผู้ร้องเรียน (ไม่เปิดเผยตัวตน / Anonymous)': 'Complainant (Anonymous)',

  // ── Status labels used inside messages (STATUS_BADGE_TEXT) ──
  'ยื่นเรื่องแล้ว (Submitted)': 'Submitted',
  'หน่วยงานรับเรื่อง (Triaged)': 'Triaged',
  'กำลังแก้ไข (In Progress)': 'In Progress',
  'แก้ไขเสร็จสิ้น (Resolved)': 'Resolved',
  'ปิดเรื่องสมบูรณ์ (Closed)': 'Closed',

  // ── Email dispatch log (lib/email-notifications.ts) ──
  '(ไม่ได้ส่งอีเมลฉบับนี้ — ระบบไม่เก็บเนื้อหา)':
    '(This email was not sent — the system keeps no content)',
  'คุณวิภาวรรณ สดใส (Lead Gatekeeper)': 'Wipawan Sodsai (Lead Gatekeeper)',

  // ── Notifications ──
  '[CEO/EVP Alert] ข้อร้องเรียนสำคัญส่งตรงถึงผู้บริหาร':
    '[CEO/EVP Alert] Critical grievance sent directly to executives',
  'หน่วยงานได้ดำเนินการแก้ไขปัญหาเรียบร้อยแล้ว กรุณาให้คะแนนประเมินความพึงพอใจเพื่อพัฒนาองค์กร':
    'The responsible unit has resolved the issue. Please rate your satisfaction to help us improve.',

  // ── Demo data (src/mockData.ts → prisma/seed.ts) ──
  'จัดทำ SOP Rev.4 และทดสอบขั้นตอนจริงหน้างาน':
    'Prepared SOP Rev.4 and tested the procedure on site',
  'ดำเนินการทำลายเอกสารและรายงาน DPO ปิดเคสความเสี่ยง':
    'Destroyed the documents and reported to the DPO to close the risk case',
  'ติดตั้ง SOP ใหม่และสรุปผลการแก้ไข': 'Rolled out the new SOP and summarized the fix results',
  'นำเสนอในที่ประชุม HR Strategy Committee': 'Presented at the HR Strategy Committee meeting',
  ยื่นข้อเสนอแนะพัฒนาห้องพยาบาล: 'Submitted a suggestion to improve the infirmary',
  ยื่นข้อเสนอแนะเพื่อการพัฒนาองค์กร: 'Submitted a suggestion for organizational improvement',
  ยื่นคำขอรับคำปรึกษาด้านกฎเกณฑ์: 'Requested regulatory advice',
  ยื่นคำร้องขอคำชี้แจงระเบียบสวัสดิการ: 'Requested clarification of the welfare regulations',
  ยื่นคำร้องเรียนฉุกเฉินส่งตรงคณะกรรมการคุ้มครองสิทธิ์:
    'Filed an urgent complaint directly to the Rights Protection Committee',
  ยื่นเรื่องร้องเรียนด้านความเป็นธรรม: 'Filed a fairness complaint',
  รับเรื่องและกำหนดมาตรการคุ้มครองพยาน: 'Received the ticket and set witness protection measures',
  'รับเรื่องและตรวจสอบประวัติการลงเวลา OT ย้อนหลัง 3 เดือน':
    'Received the ticket and reviewed 3 months of overtime time-clock records',
  รับเรื่องและประสานงานทีมช่างอาคาร:
    'Received the ticket and coordinated with the building maintenance team',
  รับเรื่องและส่งต่อฝ่ายสิทธิประโยชน์: 'Received the ticket and forwarded it to the Benefits team',
  รับเรื่องและอนุมัติใบแจ้งแก้ไขด่วน:
    'Received the ticket and approved the urgent corrective notice',
  'รับเรื่องและเปิดมาตรการ Data Breach Prevention':
    'Received the ticket and activated Data Breach Prevention measures',
  รับเรื่องและเปิดรหัสสืบสวนลับ: 'Received the ticket and opened a confidential investigation code',
  ส่งเรื่องร้องเรียนกลิ่นรบกวนโรงอาหาร: 'Submitted a complaint about odor nuisance in the canteen',
  ส่งเรื่องร้องเรียนแบบปกปิดตัวตนพิเศษ: 'Submitted a complaint with special identity protection',
  ส่งเรื่องแจ้งข้อบกพร่องสิ่งแวดล้อม: 'Reported an environmental defect',
  'ส่งเรื่องแจ้งข้อบกพร่องเอกสาร QA': 'Reported a QA document defect',
  ส่งเรื่องแจ้งข้อสงสัยทุจริตตรงถึงบอร์ดบริหาร:
    'Reported suspected fraud directly to the executive board',
  ส่งแจ้งเตือนเครื่องมือวัดไม่ได้มาตรฐาน:
    'Reported measuring equipment that does not meet standards',
  อายัดเอกสารการจัดซื้อและเริ่มการตรวจสอบเชิงลึก:
    'Froze the procurement documents and began an in-depth investigation',
  เข้าตรวจค้นและยึดเอกสารเข้าสู่ศูนย์ควบคุมความปลอดภัย:
    'Searched and seized documents into the security control center',
  'เข้าตรวจสอบท่อแอร์และปรับแก้โปรแกรม BAS': 'Inspected the air ducts and adjusted the BAS program',
  เริ่มกระบวนการสอบข้อเท็จจริงเบื้องต้น: 'Started the preliminary fact-finding process',
  เรียกผู้จัดการศูนย์เข้าชี้แจงและตรวจสอบข้อมูลสถิติ:
    'Summoned the center manager to explain and reviewed the statistics',
  แจ้งผลการอนุมัติและแนวทางดำเนินการ: 'Notified the approval result and the way forward',
  'แจ้งเตือนความเสี่ยงด้าน PDPA ส่งตรงถึงผู้บริหาร':
    'Raised a PDPA risk alert directly to executives',
  'แจ้งเบาะแสการทุจริตผ่าน Whistleblowing Portal':
    'Reported fraud through the Whistleblowing Portal',
  'แจ้งเบาะแสจริยธรรมส่งตรงถึง CEO/EVP': 'Reported an ethics concern directly to the CEO/EVP',
  'แจ้งเตือนผู้บริหาร: ได้รับข้อร้องเรียนส่งตรงถึง CEO/EVP':
    'Executive alert: a grievance was sent directly to the CEO/EVP',
  'หน่วยงาน EHS ได้ทำการเคลียร์สิ่งกีดขวางเรียบร้อยแล้ว กรุณาเข้าประเมินความพึงพอใจการให้บริการ':
    'The EHS unit has cleared the obstruction. Please evaluate your satisfaction with the service.',
  'วิศวกรโครงข่ายไอที (กิตติศักดิ์ ชัยชนะ) เริ่มเข้าดำเนินการตรวจสอบและปรับแต่ง Access Point แล้ว':
    'IT network engineer (กิตติศักดิ์ ชัยชนะ) has started checking and tuning the access points',
  'มีข้อร้องเรียนหมวดหมู่ Harassment ระดับความเร่งด่วนสูง ยื่นเรื่องส่งตรงถึงผู้บริหารระดับสูง':
    'A high-urgency Harassment grievance was sent directly to senior executives',
  'ฝ่าย Compliance & DPO ได้แก้ไขและทำลายเอกสารเสร็จสมบูรณ์แล้ว':
    'The Compliance & DPO team has completed the fix and destroyed the documents',
};

/** Category display names (Thai → English) so "Gatekeeper ประจำฝ่าย <category>" reads fully in EN. */
const CATEGORY_EN: Record<string, string> = Object.fromEntries(
  Object.values(CATEGORY_DEFINITIONS).map((c) => [c.nameTh, c.nameEn])
);

/**
 * A template is its literal segments with the captured parts between them: `['a ', ' b', '.']`
 * matches "a X b Y." and captures X and Y. Plain startsWith / indexOf / endsWith — free text between
 * the literals never goes through a backtracking regex.
 */
type Template = readonly [segments: readonly string[], build: (...captured: string[]) => string];

const matchTemplate = (text: string, segments: readonly string[]): string[] | null => {
  const head = segments[0];
  const tail = segments.at(-1) ?? '';
  const end = text.length - tail.length;
  if (end < head.length || !text.startsWith(head) || !text.endsWith(tail)) return null;
  const captured: string[] = [];
  let position = head.length;
  for (const separator of segments.slice(1, -1)) {
    const at = text.indexOf(separator, position);
    if (at < 0 || at > end) return null;
    captured.push(text.slice(position, at));
    position = at + separator.length;
  }
  captured.push(text.slice(position, end));
  return captured;
};

/** "1 star" / "N stars" — the Thai says "ดาว" once whatever the count. */
const stars = (count: string): string => `${count} ${count === '1' ? 'star' : 'stars'}`;

/** Patterns with captured parts carried over, e.g. tracking codes and names. */
const PATTERNS: ReadonlyArray<Template> = [
  // Notifications
  [['ยื่นเรื่องสำเร็จ: ', '...'], (title) => `Ticket submitted: ${title}...`],
  [
    ['รหัสติดตามของคุณคือ ', ' หน่วยงาน ', ' ได้รับเรื่องเข้าสู่ระบบเรียบร้อยแล้ว'],
    (code, dept) => `Your tracking code is ${code}. ${dept} has received your ticket.`,
  ],
  [
    ['เรื่อง: ', ' (หมวดหมู่: ', ', ความเร่งด่วน: ', ')'],
    (title, category, urgency) => `Subject: ${title} (Category: ${category}, Urgency: ${urgency})`,
  ],
  [['แก้ไขเสร็จสิ้น: รหัส ', ''], (code) => `Resolved: ticket ${code}`],
  [['แก้ไขเสร็จสิ้น: ', ''], (subject) => `Resolved: ${subject}`],
  [['อัปเดตสถานะ: ', ''], (subject) => `Status update: ${subject}`],
  [['อัปเดตความคืบหน้า (', ')'], (code) => `Progress update (${code})`],
  [
    ['เรื่องของคุณมีการเปลี่ยนสถานะเป็น "', '" โดย ', ''],
    (status, actor) =>
      `Your ticket's status changed to "${toEnglish(status)}" by ${toEnglish(actor)}`,
  ],
  [['[ข้อความใหม่จากเจ้าหน้าที่] ', ''], (code) => `[New message from staff] ${code}`],
  [['[ข้อความใหม่จากผู้ร้องเรียน] ', ''], (code) => `[New message from complainant] ${code}`],

  // Timeline actions and actors
  [
    ['มอบหมายเจ้าหน้าที่ผู้รับผิดชอบอัตโนมัติ: ', ''],
    (name) => `Automatically assigned the responsible officer: ${name}`,
  ],
  [
    ['ประเมินความพึงพอใจ ', ' ดาว และปิดเรื่อง (Closed)'],
    (count) => `Rated satisfaction ${stars(count)} and closed the ticket`,
  ],
  [
    ['ประเมินความพึงพอใจ ', ' ดาว และปิดเรื่อง'],
    (count) => `Rated satisfaction ${stars(count)} and closed the ticket`,
  ],
  [
    ['ประเมินความพึงพอใจ ', ' ดาวและปิดเรื่อง'],
    (count) => `Rated satisfaction ${stars(count)} and closed the ticket`,
  ],
  [['Gatekeeper ประจำฝ่าย ', ''], (dept) => `Gatekeeper, ${toEnglish(dept)} department`],
  [['', ' (พนักงาน)'], (name) => `${name} (Employee)`],
  [['นิติกรอาวุโส ', ''], (rest) => `Senior Legal Counsel ${rest}`],
];

/** Text of the form "<sender label>: <message>" — chat notifications; only a known label is mapped. */
const SENDER_SEPARATOR = ': ';

function translateSenderPrefix(text: string): string | null {
  const at = text.indexOf(SENDER_SEPARATOR);
  if (at <= 0) return null;
  const sender = text.slice(0, at);
  const english = lookup(sender);
  if (english === null) return null;
  return `${english}${text.slice(at)}`;
}

function lookup(text: string): string | null {
  const exact = EXACT[text] ?? CATEGORY_EN[text];
  if (exact) return exact;
  for (const [segments, build] of PATTERNS) {
    const captured = matchTemplate(text, segments);
    if (captured) return build(...captured);
  }
  return null;
}

function toEnglish(text: string): string {
  return lookup(text) ?? translateSenderPrefix(text) ?? text;
}

export function localizeServerText(text: string | null | undefined, lang: Language): string {
  if (!text) return text ?? '';
  if (lang === 'th') return text;
  return toEnglish(text);
}
