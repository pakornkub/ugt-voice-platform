import type { FaqItem, RaciRow, SlaMatrixRow } from './types';

export const SLA_MATRIX_DATA: SlaMatrixRow[] = [
  {
    category: 'HR',
    name: {
      th: 'HR – ทรัพยากรบุคคลและสวัสดิการ',
      en: 'HR – Human Resources & Welfare',
    },
    severity: 'Normal / Urgent',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    description: {
      th: 'สวัสดิการพนักงาน ค่าตอบแทน วันลา การปรับเงินเดือน สภาพแวดล้อมการทำงาน สุขอนามัย และความสัมพันธ์แรงงาน',
      en: 'Employee benefits, compensation, leave, salary adjustments, the working environment, occupational health and labor relations.',
    },
    responsible: 'People & Culture / HR Gatekeeper',
  },
  {
    category: 'Compliance',
    name: {
      th: 'Compliance – การไม่ปฏิบัติตามกฎหมายและกฎเกณฑ์',
      en: 'Compliance – Non-compliance with Laws & Regulations',
    },
    severity: 'High / Urgent',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    description: {
      th: 'กฎหมายควบคุมการแข่งขันทางการค้า (Competition Laws), กฎหมายและข้อบังคับว่าด้วยการควบคุมการส่งออกเพื่อนโยบายความมั่นคง (National Security Export Controls), การคุ้มครองข้อมูลส่วนบุคคล (PDPA) และกฎเกณฑ์ทางกฎหมาย',
      en: 'Competition laws, national security export control laws and regulations, personal data protection (PDPA) and other legal requirements.',
    },
    responsible: 'Governance, Risk & Compliance Division',
  },
  {
    category: 'Ethics',
    name: {
      th: 'Ethics – จริยธรรม',
      en: 'Ethics',
    },
    severity: 'High / Critical',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    description: {
      th: 'การฟอกเงิน, การซื้อขายหลักทรัพย์โดยใช้ข้อมูลภายใน (Insider Trading), ข้องเกี่ยวกับกลุ่มผู้มีอิทธิพลซึ่งไม่ชอบด้วยกฎหมาย, การเปิดเผยข้อมูล, การรักษาความลับ, ทรัพย์สินทางปัญญา, การแสดงความคิดเห็นหรือโพสต์ข้อความบนสื่อสังคมออนไลน์หรืออินเทอร์เน็ตที่กระทบต่อกลุ่มบริษัท UBE, การจัดทำรายงานทางการเงินและการเปิดเผยข้อมูลทางการเงินที่ถูกต้อง',
      en: 'Money laundering, insider trading, involvement with unlawful influential groups, information disclosure, confidentiality, intellectual property, comments or posts on social media or the internet that affect the UBE Group, and accurate financial reporting and disclosure.',
    },
    responsible: 'Internal Audit & Ethics Committee',
  },
  {
    category: 'Fraud',
    name: {
      th: 'Fraud – การทุจริต และการฉ้อโกง',
      en: 'Fraud – Corruption & Fraud',
    },
    severity: 'Critical / Urgent',
    badgeColor: 'bg-red-50 text-red-800 border-red-200',
    description: {
      th: 'การจัดซื้อจัดจ้าง, การติดสินบน, การจ่ายหรือรับเงินใต้โต๊ะ, การคอร์รัปชัน, การรับของขวัญ, การเลี้ยงรับรอง, ผลประโยชน์ทับซ้อน, การยักยอกเงิน หรือการปลอมแปลงเอกสารทางบัญชี',
      en: 'Procurement, bribery, kickbacks, corruption, gifts, entertainment, conflicts of interest, embezzlement or falsification of accounting documents.',
    },
    responsible: 'Forensic Audit & Special Investigation',
  },
  {
    category: 'Harassment',
    name: {
      th: 'Human Right, Harassment – สิทธิมนุษยชน, การล่วงละเมิด',
      en: 'Human Right, Harassment – Human Rights & Harassment',
    },
    severity: 'Critical / Sensitive',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    description: {
      th: 'สิทธิมนุษยชน, การล่วงละเมิดทางเพศ, การคุกคามทางวาจาหรือร่างกาย, การกลั่นแกล้ง (Bullying), การเลือกปฏิบัติ หรือการละเมิดศักดิ์ศรีความเป็นมนุษย์',
      en: 'Human rights, sexual harassment, verbal or physical intimidation, bullying, discrimination or violations of human dignity.',
    },
    responsible: 'Human Rights & Whistleblower Panel',
  },
  {
    category: 'Quality',
    name: {
      th: 'Quality Impropriety – การตรวจสอบคุณภาพอย่างไม่เหมาะสม',
      en: 'Quality Impropriety – Improper Quality Inspection',
    },
    severity: 'Normal / Urgent',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description: {
      th: 'การตรวจสอบคุณภาพอย่างไม่เหมาะสม, การบิดเบือนหรือปลอมแปลงผลการทดสอบ QC/QA, การละเลยมาตรฐานความปลอดภัยของผลิตภัณฑ์ หรือการส่งมอบสินค้าที่ไม่เป็นไปตามข้อตกลง',
      en: 'Improper quality inspection, distorting or falsifying QC/QA test results, neglecting product safety standards, or delivering goods that do not meet the agreement.',
    },
    responsible: 'Quality Assurance & Quality Control Council',
  },
];

export const RACI_DATA: RaciRow[] = [
  {
    process: {
      th: 'ยื่นคำร้อง / ข้อเสนอแนะ (Voice Submission)',
      en: 'Voice Submission',
    },
    employee: { th: 'R (ผู้ทำ)', en: 'R (Performs)' },
    gatekeeper: { th: 'I (รับทราบ)', en: 'I (Informed)' },
    executive: { th: 'I (เคสด่วน)', en: 'I (Urgent cases)' },
    admin: { th: '-', en: '-' },
  },
  {
    process: {
      th: 'กำหนดเกณฑ์และจ่ายงานอัตโนมัติ (Smart Dispatch)',
      en: 'Smart Dispatch',
    },
    employee: { th: '-', en: '-' },
    gatekeeper: { th: 'A (รับมอบ)', en: 'A (Takes over)' },
    executive: { th: 'I (ภาพรวม)', en: 'I (Overview)' },
    admin: { th: 'R/A (ตั้งค่า)', en: 'R/A (Configures)' },
  },
  {
    process: {
      th: 'กำหนดรายชื่อผู้มีบทบาทและสิทธิ์ (Roster & RBAC)',
      en: 'Roster & RBAC',
    },
    employee: { th: '-', en: '-' },
    gatekeeper: { th: '-', en: '-' },
    executive: { th: '-', en: '-' },
    admin: { th: 'R/A (กำหนดสิทธิ์)', en: 'R/A (Sets permissions)' },
  },
  {
    process: {
      th: 'ตรวจสอบ ลงพื้นที่ และแก้ไขปัญหา (Triage & Action)',
      en: 'Triage & Action',
    },
    employee: { th: 'I (ติดตาม)', en: 'I (Follows up)' },
    gatekeeper: { th: 'R/A (แก้ไข)', en: 'R/A (Resolves)' },
    executive: { th: 'I (เคสสำคัญ)', en: 'I (Key cases)' },
    admin: { th: '-', en: '-' },
  },
  {
    process: {
      th: 'ปิดเคส & ประเมินความพึงพอใจ (CSAT Feedback)',
      en: 'CSAT Feedback',
    },
    employee: { th: 'R (ประเมิน)', en: 'R (Rates)' },
    gatekeeper: { th: 'I (ดูคะแนน)', en: 'I (Views scores)' },
    executive: { th: 'I (ติดตาม)', en: 'I (Follows up)' },
    admin: { th: '-', en: '-' },
  },
  {
    process: {
      th: 'วิเคราะห์สถิติ, CSAT & AI ป้องกันเชิงรุก (Analytics)',
      en: 'Analytics',
    },
    employee: { th: '-', en: '-' },
    gatekeeper: { th: 'I (ปรับปรุง)', en: 'I (Improves)' },
    executive: { th: 'R/A (วิเคราะห์)', en: 'R/A (Analyzes)' },
    admin: { th: 'C (ดูแลระบบ)', en: 'C (Maintains system)' },
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: {
      th: '1. ข้อมูลชื่อและตัวตนของผู้ยื่นเรื่องถูกจัดเก็บและเปิดเผยอย่างไร?',
      en: "1. How is the submitter's name and identity stored and disclosed?",
    },
    a: {
      th: 'ระบบจัดเก็บข้อมูลผู้ยื่นเรื่อง (ชื่อ, รหัสพนักงาน, ฝ่าย, อีเมล) อย่างปลอดภัยตามมาตรฐาน PDPA โดยจะส่งต่อและเปิดให้เฉพาะเจ้าหน้าที่ Gatekeeper ประจำฝ่ายที่รับผิดชอบโดยตรงตรวจสอบเท่านั้น และไม่อนุญาตให้บุคคลภายนอกหรือผู้ไม่มีส่วนเกี่ยวข้องเข้าถึงข้อมูลตัวตน การเข้าสู่ระบบใช้บัญชีบริษัท (SSO) และสำหรับผู้ยื่นแบบไม่ระบุตัวตน ตัวตนจะไม่ปรากฏในอีเมลแจ้ง Gatekeeper และในประวัติการส่งอีเมล',
      en: 'The system stores submitter details (name, employee ID, department, email) securely in line with PDPA standards, and shares them only with the directly responsible department Gatekeeper. Outsiders and anyone not involved cannot access identity data. Sign-in uses the company account (SSO), and for anonymous submitters the identity never appears in the email notifying the Gatekeeper or in the email dispatch history.',
    },
  },
  {
    q: {
      th: '2. ช่องทางส่งตรงถึงผู้บริหาร (CEO / EVP Direct Bypass) คืออะไร และควรใช้เมื่อใด?',
      en: '2. What is the direct-to-executive channel (CEO / EVP Direct Bypass) and when should it be used?',
    },
    a: {
      th: 'เป็นช่องทางพิเศษสำหรับกรณีที่ประเด็นมีความอ่อนไหวสูงมาก มีความเสี่ยงต่อองค์กร หรือเกี่ยวข้องกับสายการบังคับบัญชาโดยตรง เมื่อเลือกตัวเลือกนี้ ระบบจะส่งการแจ้งเตือนและเชื่อมต่อเคสเข้าสู่แดชบอร์ดของผู้บริหารระดับสูงทันที ควบคู่กับการจ่ายงานให้ Gatekeeper ฝ่ายที่เกี่ยวข้อง ทั้งนี้ผู้ที่เห็นเรื่องส่งตรงผู้บริหารได้กำหนดที่หน้า "กำหนดสิทธิ์เข้าถึง (RBAC)" — Gatekeeper ที่ไม่ได้รับสิทธิ์จะไม่เห็นเรื่องประเภทนี้',
      en: 'It is a special channel for matters that are highly sensitive, pose a risk to the organization, or involve the direct chain of command. When selected, the system immediately sends a notification and links the case to the senior executive dashboard, alongside routing it to the relevant department Gatekeeper. Who can see direct-to-executive cases is set on the "Access Control (RBAC)" page — Gatekeepers without that right do not see this type of case.',
    },
  },
  {
    q: {
      th: '3. รหัสติดตามคำร้อง (Tracking Code) ใช้อย่างไร?',
      en: '3. How do I use the Tracking Code?',
    },
    a: {
      th: 'เมื่อบันทึกคำร้องสำเร็จ ระบบจะออกรหัสเฉพาะ เช่น TK-2026-0881 ซึ่งพนักงานสามารถนำรหัสนี้ไปค้นหาได้ทันทีที่ช่อง "ค้นหาด้วยรหัสติดตาม" บนแถบเมนูด้านบน หรือเปิดดูได้ที่แท็บ "คำร้องของฉัน" เพื่อดูขั้นตอนการดำเนินงานแบบเรียลไทม์',
      en: 'Once a request is saved, the system issues a unique code such as TK-2026-0881. Employees can enter it straight into the tracking-code search box in the top menu bar, or open it from the "My Tickets" tab, to follow the progress in real time.',
    },
  },
  {
    q: {
      th: '4. หากคำร้องยังไม่ได้รับการคัดกรองหรือมีความเร่งด่วนสูง ระบบจะดำเนินการอย่างไร?',
      en: '4. What does the system do if a request has not been triaged or is highly urgent?',
    },
    a: {
      th: 'เมื่อมีคำร้องใหม่ ระบบจะส่งอีเมลถึงเจ้าหน้าที่ที่ได้รับมอบหมายโดยอัตโนมัติ (และเรื่องขึ้นใน Gatekeeper Inbox ของฝ่ายทันที) โดยมีหัวหน้าฝ่าย (Lead Gatekeeper) ของหมวดนั้นใน CC เมื่อผู้รับมอบหมายเป็นคนอื่น (ตามค่าเริ่มต้นเคสใหม่จะถูกจ่ายให้ Lead คัดกรองก่อน และหากหมวดไม่มี Lead จะส่งไปอีเมลส่งต่อเรื่องของหน่วยงาน) และกรณีที่เป็นเคสเร่งด่วนหรือเลือกส่งตรงผู้บริหาร (Bypass) จะแสดงสัญลักษณ์เตือนบนหน้าแดชบอร์ดของผู้บริหารทันที',
      en: 'When a new request arrives, the system automatically emails the assigned officer (and the case appears in the Gatekeeper Inbox of the department right away), with the category Lead Gatekeeper in CC when the assignee is someone else (by default a new case is assigned to the Lead for triage first, and if the category has no Lead it goes to the unit forwarding mailbox). For urgent cases, or when the direct-to-executive option (Bypass) is chosen, a warning indicator appears on the executive dashboard immediately.',
    },
  },
  {
    q: {
      th: '5. แบบประเมินความพึงพอใจ (CSAT) มีผลอย่างไรต่องานบริการ?',
      en: '5. How does the satisfaction survey (CSAT) affect the service?',
    },
    a: {
      th: 'เมื่อ Gatekeeper ดำเนินการแก้ไขเรียบร้อยแล้ว พนักงานจะได้รับอีเมลและการแจ้งเตือนให้ประเมินคะแนนดาว 1–5 ใน 4 มิติ (ความรวดเร็ว, คุณภาพ, มารยาทการสื่อสาร, ความชัดเจน) คะแนนนี้จะนำไปประมวลผลเป็นดัชนีคุณภาพการบริการของแต่ละหน่วยงานอย่างโปร่งใส',
      en: 'Once the Gatekeeper has resolved the case, the employee receives an email and a notification to rate 1–5 stars across 4 dimensions (speed, quality, communication courtesy, clarity). These scores are processed transparently into a service-quality index for each unit.',
    },
  },
  {
    q: {
      th: '6. AI ผู้ช่วยวิเคราะห์ต้นตอ (Root Cause Analytics & CAPA) ทำงานอย่างไร?',
      en: '6. How does the AI root cause assistant (Root Cause Analytics & CAPA) work?',
    },
    a: {
      th: 'AI จะประมวลผลข้อร้องเรียนและข้อเสนอแนะทั้งหมด โดยจัดกลุ่มตามหลักการ 4M (Man, Machine, Method, Material) และสกัดสาเหตุเชิงโครงสร้าง พร้อมเสนอแนะแนวทางป้องกันเชิงรุก (Preventive Actions) เพื่อช่วยให้ผู้บริหารและฝ่ายต่างๆ แก้ไขปัญหาได้ตรงจุดและยั่งยืน',
      en: 'The AI processes all complaints and suggestions, grouping them by the 4M principle (Man, Machine, Method, Material) and extracting structural causes, then recommends Preventive Actions so that executives and departments can fix problems precisely and sustainably.',
    },
  },
  {
    q: {
      th: '7. ระบบสื่อสารสองทางแบบนิรนาม (Anonymous 2-Way Chat) ทำงานอย่างไร และมั่นใจในความปลอดภัยได้อย่างไร?',
      en: '7. How does the Anonymous 2-Way Chat work, and how can I be sure it is secure?',
    },
    a: {
      th: 'ระบบใช้สถาปัตยกรรม End-to-End Anonymous Protection โดยผู้ร้องเรียนที่เลือกไม่เปิดเผยตัวตน สามารถส่งข้อความโต้ตอบ ชี้แจงข้อมูล และส่งพยานหลักฐานเพิ่มเติมกับเจ้าหน้าที่ Gatekeeper หรือคณะกรรมการสอบสวนได้ผ่านแท็บ "สื่อสารสองทางนิรนาม" ในหน้า Tracking Timeline เจ้าหน้าที่จะเห็นเพียง "พนักงาน (ไม่เปิดเผยตัวตน)" เท่านั้น ไม่มีการเปิดเผยชื่อ นามสกุล รหัสพนักงาน หรืออีเมลในทุกขั้นตอน (ยกเว้นบทบาทที่หน้า RBAC กำหนดสิทธิ์ดูอีเมลผู้ยื่นแบบนิรนามไว้โดยเฉพาะ) สอดคล้องกับมาตรฐาน Whistleblower Protection และ PDPA',
      en: 'The system uses an End-to-End Anonymous Protection architecture. A complainant who chooses to stay anonymous can reply, clarify and send further evidence to the Gatekeeper or the investigation committee through the "Anonymous 2-Way Chat" tab on the Tracking Timeline page. Officers see only "Employee (anonymous)" — no first name, surname, employee ID or email is revealed at any step (except for roles that the RBAC page explicitly allows to see the email of anonymous submitters). This is consistent with Whistleblower Protection and PDPA standards.',
    },
  },
  {
    q: {
      th: '8. การจัดทำและพิมพ์รายงานสรุปผลการสอบสวนข้อเท็จจริง (Official Investigation & CAPA Report) ใช้งานอย่างไร?',
      en: '8. How do I prepare and print the Official Investigation & CAPA Report?',
    },
    a: {
      th: 'รายงานสรุปผลการสอบสวนข้อเท็จจริงเป็นเอกสารทางการมาตรฐานสากล (Formal Investigation Document) ที่รวบรวมข้อมูลเคส, ข้อเท็จจริง, ผลการสืบสวน, การวิเคราะห์หาสาเหตุที่แท้จริง (Root Cause 4M), มาตรการแก้ไขและป้องกันการเกิดซ้ำ (CAPA), ตลอดจนประวัติการดำเนินงาน (Audit Trail) และลายมือชื่อ สามารถเปิดดูได้จากปุ่ม "รายงานผล" (Report) บนแถบหัวข้อของหน้า Timeline เพื่อดูตัวอย่าง ดาวน์โหลด หรือสั่งพิมพ์ (Print-Ready) นำเสนอคณะกรรมการบริหารได้ทันที',
      en: 'The investigation summary report is a formal, internationally standard document that brings together the case data, facts, investigation findings, root cause analysis (Root Cause 4M), corrective and preventive actions (CAPA), the audit trail and signatures. Open it with the "Report" button in the header of the Timeline page to preview, download or print it (print-ready) for presentation to the executive committee.',
    },
  },
  {
    q: {
      th: '9. ฉันจะได้สิทธิ์ Gatekeeper / ผู้บริหาร / HR Admin ได้อย่างไร?',
      en: '9. How do I get Gatekeeper / Executive / HR Admin rights?',
    },
    a: {
      th: 'ทุกคนเข้าสู่ระบบด้วยบัญชีบริษัท (SSO) และไม่มีตัวสลับบทบาท บทบาทมาจากรายชื่อในหน้า "จัดการผู้บริหาร & Gatekeeper" — อยู่ในรายชื่อ HR Admin จะเป็น HR Admin, อยู่ในรายชื่อผู้บริหารจะเป็นผู้บริหาร, เป็นเจ้าหน้าที่ Gatekeeper ของหมวดใดก็ได้จะเป็น Gatekeeper และคนอื่นเป็นพนักงานทั่วไป (ถ้าอยู่หลายรายชื่อ บทบาทสูงสุดชนะ) ให้แจ้ง HR Admin เพิ่มชื่อคุณ การแก้รายชื่อจะมีผลเมื่อคุณเปลี่ยนหน้าครั้งถัดไป ส่วนแท็บที่เปิดได้และสิทธิ์พิเศษของแต่ละบทบาทกำหนดที่หน้า "กำหนดสิทธิ์เข้าถึง (RBAC)"',
      en: 'Everyone signs in with the company account (SSO) and there is no role switcher. Roles come from the lists on the "Personnel & Gatekeepers" page — being on the HR Admin list makes you an HR Admin, being on the executive list makes you an executive, being a Gatekeeper officer of any category makes you a Gatekeeper, and everyone else is a regular employee (if you are on several lists, the highest role wins). Ask an HR Admin to add your name. Changes to the lists take effect the next time you change page. The tabs each role can open and their special rights are set on the "Access Control (RBAC)" page.',
    },
  },
];
