// The one catalog of the text the server STORES in Thai (timeline actions / actors / notes,
// notification titles and messages, chat sender labels, redaction and mail-log labels) with the
// English each one is shown as. React-free and server-free, so Server Actions, lib/ and client
// screens import the same strings.
//
// Why one table: stored rows are never rewritten (decisions.md 2026-10-09), so the EN screens map the
// stored Thai back to English by string equality (src/services/serverText.ts). A writer that kept its
// own inline Thai could drift from that map and EN screens would silently show Thai. Writers import
// their Thai from here; serverText builds its map from here; src/services/serverText.test.ts walks
// this whole file and fails when a phrase does not localize — so a new phrase NEEDS its English.
//
// Status wording (timeline action / notification status name) lives in lib/ticket-status.ts.
// Changing a Thai string here orphans old rows' EN mapping: add the old wording as a plain legacy
// entry in serverText.ts instead of editing it away.
import type { Bilingual } from '@/lib/ticket-status';

// ── Fixed phrases ───────────────────────────────────────────────────────────

/** Keys stay typed, values widen to plain strings (a literal type would leak into callers' own types). */
const bilingualTable = <K extends string>(table: Record<K, Bilingual>) => table;

export const SERVER_TEXT = bilingualTable({
  // Timeline actions
  infoUpdated: { th: 'อัปเดตข้อมูล', en: 'Information updated' },
  submittedAction: { th: 'ยื่นเรื่องเข้าระบบสำเร็จ', en: 'Ticket submitted successfully' },
  submittedDirectAction: {
    th: 'ยื่นเรื่องส่งตรงถึงผู้บริหารระดับสูง (CEO/EVP Whistleblower Channel)',
    en: 'Submitted directly to senior executives (CEO/EVP Whistleblower Channel)',
  },
  chatStaffAction: {
    th: 'เจ้าหน้าที่ส่งข้อความสอบถาม/ชี้แจงผ่านช่องทางนิรนาม',
    en: 'Staff sent a question or clarification through the anonymous channel',
  },
  chatSubmitterAction: {
    th: 'ผู้ยื่นเรื่องตอบกลับผ่านช่องทางสื่อสารนิรนาม',
    en: 'The submitter replied through the anonymous channel',
  },

  // Timeline notes (also the default notes the triage form saves as typed)
  submittedNote: {
    th: 'ระบบได้รับเรื่องและเข้าสู่คิวคัดกรองของ Gatekeeper',
    en: 'The system received the ticket and placed it in the Gatekeeper triage queue',
  },
  submittedAnonymousNote: {
    th: 'ยื่นเรื่องแบบไม่ระบุตัวตน (ระบบเชื่อมโยงอีเมลล็อกอินหลังบ้านจากฐานข้อมูลพนักงานเรียบร้อยแล้ว)',
    en: 'Submitted anonymously (the system linked the login email in the back office from the employee database)',
  },
  // No-login portal (2026-10-21): anonymous for real — nothing is linked behind the scenes.
  submittedPortalAnonymousNote: {
    th: 'ยื่นเรื่องแบบไม่ระบุตัวตนผ่านช่องทางไม่ต้องเข้าสู่ระบบ (ไม่มีข้อมูลตัวตนของผู้ยื่นในระบบ)',
    en: 'Submitted anonymously without sign-in (no submitter identity is stored)',
  },
  submittedDirectNote: {
    th: 'ติดแท็กสำคัญพิเศษ: ส่งตรงถึงโต๊ะทำงานผู้บริหารระดับสูง',
    en: 'Tagged as special priority: sent straight to the senior executives desk',
  },
  leadGatekeeperNote: {
    th: 'หัวหน้า Gatekeeper ของหมวดหมู่ — แจ้งอีเมลถึง GK ทุกคนในหมวดแล้ว',
    en: "The category's Lead Gatekeeper — every GK of the category was emailed",
  },
  triageReceivedNote: {
    th: 'Gatekeeper รับเรื่องและมอบหมายผู้รับผิดชอบ',
    en: 'Gatekeeper received the ticket and assigned an owner',
  },
  triageResolvedNote: {
    th: 'แก้ไขปัญหาเสร็จสิ้น พร้อมส่งมอบให้พนักงานประเมิน',
    en: 'Issue resolved and handed over for the employee to evaluate',
  },
  evaluationDoneNote: {
    th: 'ส่งผลประเมินความพึงพอใจเสร็จสิ้น',
    en: 'Satisfaction evaluation submitted',
  },
  defaultResolutionNote: {
    th: 'ดำเนินการตรวจสอบและแก้ไขปัญหาเรียบร้อยตามมาตรฐานการปฏิบัติงาน',
    en: 'Reviewed and resolved the issue according to the operating standard',
  },

  // Actors / chat sender labels
  employee: { th: 'พนักงาน', en: 'Employee' },
  employeeAnonymous: { th: 'พนักงาน (ไม่เปิดเผยตัวตน)', en: 'Employee (Anonymous)' },
  anonymousSubmittingEmployee: {
    th: 'พนักงานผู้ยื่นเรื่อง (ไม่ระบุตัวตน)',
    en: 'Submitting employee (anonymous)',
  },
  submittingEmployee: { th: 'พนักงานผู้ยื่นเรื่อง', en: 'Submitting employee' },
  reportingEmployee: { th: 'พนักงานผู้แจ้ง', en: 'Reporting employee' },
  responsibleOfficer: { th: 'เจ้าหน้าที่ผู้รับผิดชอบ', en: 'Responsible officer' },
  autoAssignActor: { th: 'ระบบจ่ายงานอัตโนมัติ (Auto-Assign)', en: 'Auto-Assign' },
  chatSubmitterAnonymous: {
    th: 'ผู้ยื่นเรื่อง (ไม่เปิดเผยตัวตน / Anonymous)',
    en: 'Submitter (Anonymous)',
  },
  chatSubmitterEmployee: { th: 'ผู้ยื่นเรื่อง (Employee)', en: 'Submitter (Employee)' },
  chatAuditCommittee: {
    th: 'คณะกรรมการตรวจสอบ / ผู้บริหารระดับสูง (Audit Committee)',
    en: 'Audit Committee / Senior Executives',
  },
  chatSystemAdmin: { th: 'เจ้าหน้าที่ผู้ดูแลระบบ (System Admin)', en: 'System Admin' },

  // Redaction labels (lib/ticket-scope.ts) and mail-log labels (lib/email-notifications.ts)
  anonymousSubmitterName: { th: 'ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)', en: 'Submitter (anonymous)' },
  protectedActorName: {
    th: 'พนักงานผู้ร้องเรียน (ปกปิดตัวตน)',
    en: 'Complainant (identity protected)',
  },
  mailAnonymousSender: { th: 'ผู้ยื่นเรื่องนิรนาม (Anonymous)', en: 'Anonymous submitter' },
  mailAnonymousRecipient: {
    th: 'ผู้ยื่นเรื่อง (Anonymous Submitter)',
    en: 'Anonymous submitter',
  },
  mailHiddenDepartment: { th: 'ไม่เปิดเผยสังกัด', en: 'Department withheld' },
  mailGeneralDepartment: { th: 'ทั่วไป', en: 'General' },
  mailNotSentBody: {
    th: '(ไม่ได้ส่งอีเมลฉบับนี้ — ระบบไม่เก็บเนื้อหา)',
    en: '(This email was not sent — the system keeps no content)',
  },
  mailTestRecipientLead: {
    th: 'คุณวิภาวรรณ สดใส (Lead Gatekeeper)',
    en: 'Wipawan Sodsai (Lead Gatekeeper)',
  },

  // Notifications
  directAlertTitle: {
    th: '[CEO/EVP Alert] ข้อร้องเรียนสำคัญส่งตรงถึงผู้บริหาร',
    en: '[CEO/EVP Alert] Critical grievance sent directly to executives',
  },
  resolvedMessage: {
    th: 'หน่วยงานได้ดำเนินการแก้ไขปัญหาเรียบร้อยแล้ว กรุณาให้คะแนนประเมินความพึงพอใจเพื่อพัฒนาองค์กร',
    en: 'The responsible unit has resolved the issue. Please rate your satisfaction to help us improve.',
  },
});

/** Every fixed phrase as stored Thai → English (serverText.ts builds its exact-match map from it). */
export function serverTextToEnglish(): Record<string, string> {
  return Object.fromEntries(Object.values(SERVER_TEXT).map(({ th, en }) => [th, en]));
}

// ── Phrases with parts that vary ────────────────────────────────────────────

/**
 * A stored sentence made of literal Thai segments with the varying parts between them:
 * `['a ', ' b', '.']` stores "a X b Y." for the arguments X and Y. `en` receives the arguments
 * already in English where the argument is itself translatable (see `statusChangedMessage`).
 * serverText.ts reverse-parses stored rows with `segments`, so the stored text and the matcher
 * cannot disagree.
 */
export interface ServerTemplate<A extends string[] = string[]> {
  readonly segments: readonly string[];
  th(...args: A): string;
  en(...args: A): string;
}

function template<A extends string[]>(
  segments: readonly string[],
  en: (...args: A) => string
): ServerTemplate<A> {
  return {
    segments,
    th: (...args) => segments.map((s, i) => (i === 0 ? s : `${args[i - 1]}${s}`)).join(''),
    en,
  };
}

/** "1 star" / "N stars" — the Thai says "ดาว" once whatever the count. */
export const starsEn = (count: string): string => `${count} ${count === '1' ? 'star' : 'stars'}`;

/** The "permanently resolved?" answer a rating stores in its notification. */
export const RESOLVED_ANSWER = bilingualTable({
  yes: { th: 'ใช่', en: 'Yes' },
  no: { th: 'ไม่ใช่', en: 'No' },
});

export const resolvedAnswer = (isResolvedPermanently: boolean): Bilingual =>
  isResolvedPermanently ? RESOLVED_ANSWER.yes : RESOLVED_ANSWER.no;

export const SERVER_TEMPLATES = {
  // Notifications
  submittedTitle: template(
    ['ยื่นเรื่องสำเร็จ: ', '...'],
    (title: string) => `Ticket submitted: ${title}...`
  ),
  submittedMessage: template(
    ['รหัสติดตามของคุณคือ ', ' หน่วยงาน ', ' ได้รับเรื่องเข้าสู่ระบบเรียบร้อยแล้ว'],
    (code: string, dept: string) =>
      `Your tracking code is ${code}. ${dept} has received your ticket.`
  ),
  directAlertMessage: template(
    ['เรื่อง: ', ' (หมวดหมู่: ', ', ความเร่งด่วน: ', ')'],
    (title: string, category: string, urgency: string) =>
      `Subject: ${title} (Category: ${category}, Urgency: ${urgency})`
  ),
  resolvedTitle: template(
    ['แก้ไขเสร็จสิ้น: รหัส ', ''],
    (code: string) => `Resolved: ticket ${code}`
  ),
  progressTitle: template(
    ['อัปเดตความคืบหน้า (', ')'],
    (code: string) => `Progress update (${code})`
  ),
  /** Both arguments are translatable stored text: a status wording and an actor label. */
  statusChangedMessage: template(
    ['เรื่องของคุณมีการเปลี่ยนสถานะเป็น "', '" โดย ', ''],
    (status: string, actor: string) => `Your ticket's status changed to "${status}" by ${actor}`
  ),
  chatStaffTitle: template(
    ['[ข้อความใหม่จากเจ้าหน้าที่] ', ''],
    (code: string) => `[New message from staff] ${code}`
  ),
  chatComplainantTitle: template(
    ['[ข้อความใหม่จากผู้ร้องเรียน] ', ''],
    (code: string) => `[New message from complainant] ${code}`
  ),
  ratedTitle: template(
    ['[ประเมินแล้ว] ', ' · ', '/5'],
    (code: string, score: string) => `[Rated] ${code} · ${score}/5`
  ),
  /** The answer argument is a `RESOLVED_ANSWER` wording. */
  ratedMessage: template(
    ['ผู้ยื่นให้คะแนน ', '/5 · ปัญหาได้รับการแก้ไขถาวร: ', ''],
    (score: string, answer: string) =>
      `The submitter rated ${score}/5 · Resolved for good: ${answer}`
  ),

  // Timeline actions and actors
  autoAssignAction: template(
    ['มอบหมายเจ้าหน้าที่ผู้รับผิดชอบอัตโนมัติ: ', ''],
    (name: string) => `Automatically assigned the responsible officer: ${name}`
  ),
  csatClosedAction: template(
    ['ประเมินความพึงพอใจ ', ' ดาว และปิดเรื่อง (Closed)'],
    (count: string) => `Rated satisfaction ${starsEn(count)} and closed the ticket`
  ),
  /** The department argument is translatable (a category name). */
  gatekeeperOfDepartment: template(
    ['Gatekeeper ประจำฝ่าย ', ''],
    (dept: string) => `Gatekeeper, ${dept} department`
  ),
  employeeSuffix: template(['', ' (พนักงาน)'], (name: string) => `${name} (Employee)`),
} as const;
