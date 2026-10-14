// Server-written text that is stored in Thai (timeline actions/actors/notes, notification titles and
// messages, chat sender labels, redaction labels) — shown in EN by mapping known phrases on the client.
// Stored rows are never rewritten (decisions.md 2026-10-09 "Every screen bilingual TH/EN").
// Unknown text (free-text notes, names) passes through unchanged.
//
// What the server writes now lives in lib/server-text.ts (fixed phrases + sentence templates) and
// lib/ticket-status.ts (status wording): the maps below are built from them, so a writer and its EN
// cannot drift (serverText.test.ts walks the whole catalog). What is typed out here is LEGACY
// wording no writer produces any more, plus the demo rows in src/mockData.ts (prisma/seed.ts).
import type { Language } from '../context/LanguageContext';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { RESOLVED_ANSWER, SERVER_TEMPLATES as T, serverTextToEnglish } from '@/lib/server-text';
import { serverStatusTextToEnglish } from '@/lib/ticket-status';

/** Exact phrase → English. */
export const EXACT: Record<string, string> = {
  // Everything the server writes today: the fixed phrases of lib/server-text.ts and the status
  // wording of lib/ticket-status.ts (timelineAction / serverNotice), so neither can drift from the writers.
  ...serverStatusTextToEnglish(),
  ...serverTextToEnglish(),

  // ── Legacy wording (no writer produces these any more; old rows keep them) ──
  ตามรูปแบบการจ่ายงานที่ตั้งค่าไว้ของหมวดหมู่นี้: "Per this category's configured assignment mode",
  พนักงานผู้ขอสงวนนาม: 'Employee (name withheld)',
  ผู้ร้องเรียน: 'Complainant',
  ผู้แจ้งเบาะแส: 'Whistleblower',
  ผู้แจ้งเบาะแสไม่ประสงค์ออกนาม: 'Anonymous whistleblower',
  'ผู้ยื่นข้อเสนอแนะ (Employee)': 'Suggestion submitter',
  'ผู้ร้องเรียน (ไม่เปิดเผยตัวตน / Anonymous)': 'Complainant (Anonymous)',

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

/**
 * Patterns with captured parts carried over, e.g. tracking codes and names. The sentences the server
 * writes come from lib/server-text.ts (segments to match, English to build); an argument that is
 * itself stored text (a status, an actor, a category) is translated here before it reaches `en`.
 */
const PATTERNS: ReadonlyArray<Template> = [
  // Notifications
  [T.submittedTitle.segments, T.submittedTitle.en],
  [T.submittedMessage.segments, T.submittedMessage.en],
  [T.directAlertMessage.segments, T.directAlertMessage.en],
  [T.resolvedTitle.segments, T.resolvedTitle.en],
  // Legacy / demo-data titles
  [['แก้ไขเสร็จสิ้น: ', ''], (subject) => `Resolved: ${subject}`],
  [['อัปเดตสถานะ: ', ''], (subject) => `Status update: ${subject}`],
  [T.progressTitle.segments, T.progressTitle.en],
  [
    T.statusChangedMessage.segments,
    (status, actor) => T.statusChangedMessage.en(toEnglish(status), toEnglish(actor)),
  ],
  [T.chatStaffTitle.segments, T.chatStaffTitle.en],
  [T.chatComplainantTitle.segments, T.chatComplainantTitle.en],
  // CSAT submitted — staff notification: "[ประเมินแล้ว] <code> · <n>/5"
  [T.ratedTitle.segments, T.ratedTitle.en],
  [
    T.ratedMessage.segments,
    (score, answer) =>
      T.ratedMessage.en(
        score,
        answer === RESOLVED_ANSWER.yes.th ? RESOLVED_ANSWER.yes.en : RESOLVED_ANSWER.no.en
      ),
  ],

  // Timeline actions and actors
  [T.autoAssignAction.segments, T.autoAssignAction.en],
  [T.csatClosedAction.segments, T.csatClosedAction.en],
  // Legacy spellings of the same rating action (older rows and the demo data)
  [['ประเมินความพึงพอใจ ', ' ดาว และปิดเรื่อง'], T.csatClosedAction.en],
  [['ประเมินความพึงพอใจ ', ' ดาวและปิดเรื่อง'], T.csatClosedAction.en],
  [T.gatekeeperOfDepartment.segments, (dept) => T.gatekeeperOfDepartment.en(toEnglish(dept))],
  [T.employeeSuffix.segments, T.employeeSuffix.en],
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
