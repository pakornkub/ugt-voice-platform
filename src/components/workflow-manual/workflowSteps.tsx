import { Crown, FileText, Shield, Star, Users } from 'lucide-react';
import type { WorkflowStep } from './types';

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 1,
    stageCode: 'SUBMISSION',
    titleTh: '1. พนักงานยื่นข้อร้องเรียน / ข้อเสนอแนะ',
    titleEn: 'Employee Voice Submission',
    shortDesc: {
      th: 'พนักงานระบุตัวตน เลือกประเภท หมวดหมู่ กรอกรายละเอียด และแนบหลักฐาน',
      en: 'The employee identifies themselves, picks a type and category, fills in the details and attaches evidence.',
    },
    actorRole: 'employee',
    actorTitle: {
      th: 'พนักงานผู้ยื่นเรื่อง (Employee)',
      en: 'Submitting employee',
    },
    actorColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    targetTab: 'submit',
    targetTabLabel: {
      th: 'ยื่นข้อร้องเรียน / ข้อเสนอแนะ',
      en: 'Submit Grievance / Suggestion',
    },
    durationEst: { th: '1–3 นาที', en: '1–3 minutes' },
    keyActions: [
      {
        th: 'เลือกประเภทคำร้อง: "ข้อร้องเรียน (Complaint)" หรือ "ข้อเสนอแนะพัฒนา (Suggestion)"',
        en: 'Choose the request type: "Complaint" or "Suggestion".',
      },
      {
        th: 'ระบุ 1 ใน 6 หมวดหมู่ที่เกี่ยวข้อง (HR, Compliance, Ethics, Fraud, Human Right/Harassment, Quality Impropriety)',
        en: 'Pick 1 of the 6 relevant categories (HR, Compliance, Ethics, Fraud, Human Right/Harassment, Quality Impropriety).',
      },
      {
        th: 'ประเมินระดับความเร่งด่วนและผลกระทบ (ต่ำ, ปานกลาง, เร่งด่วน, วิกฤติ)',
        en: 'Assess the urgency and impact (Low, Medium, Urgent, Critical).',
      },
      {
        th: 'ตรวจสอบข้อมูลผู้ยื่นเรื่อง (ชื่อ-นามสกุล, รหัสพนักงาน, ฝ่าย, อีเมล) ซึ่งระบบเติมให้จากโปรไฟล์ HR ของบัญชีที่ล็อกอินด้วย SSO โดยส่งต่อเฉพาะ Gatekeeper ที่รับผิดชอบตามเกณฑ์ PDPA',
        en: 'Review the submitter details (full name, employee ID, department, email), which the system fills in from the HR profile of the SSO account. They are shared only with the responsible Gatekeeper, in line with PDPA.',
      },
      {
        th: 'เลือกช่องทางส่งตรงถึงผู้บริหาร (CEO / EVP Direct Bypass) หากเป็นประเด็นอ่อนไหวหรือเร่งด่วนเป็นพิเศษ',
        en: 'Choose the direct-to-executive channel (CEO / EVP Direct Bypass) for especially sensitive or urgent matters.',
      },
      {
        th: 'กรอกหัวข้อเรื่องใจความสำคัญ ระบุสถานที่/หน่วยงาน และรายละเอียดข้อเท็จจริงอย่างครบถ้วน',
        en: 'Enter a clear subject, the location / unit, and the full facts of the matter.',
      },
      {
        th: 'แนบไฟล์หลักฐานได้ — ระบบอัปโหลดไฟล์จริงทันทีหลังสร้างคำร้อง หากไฟล์ใดอัปโหลดไม่สำเร็จ คำร้องยังคงอยู่ครบและกด "ลองแนบไฟล์อีกครั้ง" ได้',
        en: 'Attach evidence files. They are uploaded right after the request is created; if a file fails to upload, the request stays intact and you can press "Try attaching again".',
      },
    ],
    systemAutomations: [
      {
        th: 'ออกรหัสติดตามเฉพาะแบบถาวร (Tracking ID เช่น TK-2026-XXXX)',
        en: 'Issues a permanent, unique Tracking ID (e.g. TK-2026-XXXX).',
      },
      {
        th: 'วิเคราะห์ความรู้สึกและคัดกรองระดับความเร่งด่วนอัตโนมัติ (AI Sentiment & Priority Tagging)',
        en: 'Automatically analyzes sentiment and tags priority (AI Sentiment & Priority Tagging).',
      },
      {
        th: 'ส่งการแจ้งเตือน Real-time ยืนยันการรับเรื่องเข้ากล่องข้อความของผู้ยื่น (สถานะอ่าน/ยังไม่อ่านเป็นของแต่ละคน)',
        en: "Sends a real-time notification confirming receipt to the submitter's inbox (read/unread state is kept per person).",
      },
      {
        th: 'ส่งอีเมลจริงผ่าน SMTP ของบริษัทถึงเจ้าหน้าที่ที่ได้รับมอบหมายทันที โดยมี Lead Gatekeeper ของหมวดใน CC เมื่อผู้รับมอบหมายเป็นคนอื่น (หากยังไม่มีผู้รับมอบหมายจะส่งถึง Lead และหากหมวดไม่มี Lead จะส่งไปอีเมลส่งต่อเรื่องของหน่วยงาน) — เปิด/ปิด แก้เทมเพลต ทดสอบส่ง และดูประวัติการส่งได้ในส่วน "Email Settings" ของหน้าจัดการผู้บริหาร & Gatekeeper',
        en: 'Immediately sends a real email through the company SMTP to the assigned officer, with the category Lead Gatekeeper in CC when the assignee is someone else (with no assignee it goes to the Lead, and if the category has no Lead, to the unit forwarding mailbox). Sending can be switched on/off, templates edited, test emails sent and the dispatch history viewed in "Email Settings" on the Executive & Gatekeeper management page.',
      },
      {
        th: 'ตัวตนของผู้ยื่นแบบนิรนามจะไม่ปรากฏในอีเมลถึง Gatekeeper และในประวัติการส่งอีเมล',
        en: "An anonymous submitter's identity never appears in the email to the Gatekeeper or in the email dispatch history.",
      },
    ],
    rulesAndSla: {
      th: 'ข้อมูลส่วนบุคคลของผู้ยื่นได้รับการคุ้มครองตามมาตรฐาน PDPA ส่งต่อเฉพาะ Gatekeeper ที่รับผิดชอบโดยตรงเท่านั้น',
      en: "The submitter's personal data is protected under PDPA standards and shared only with the directly responsible Gatekeeper.",
    },
    icon: <FileText className="h-5 w-5 text-emerald-600" />,
  },
  {
    id: 2,
    stageCode: 'ROUTING',
    titleTh: '2. ระบบคัดแยกและจ่ายงานอัตโนมัติ',
    titleEn: 'Smart Dispatch & Auto-Routing',
    shortDesc: {
      th: 'ส่งคำร้องไปยังหน่วยงานที่ถูกต้อง และจัดสรรผู้รับผิดชอบตามเกณฑ์ที่กำหนด',
      en: 'Routes the request to the right unit and assigns an owner according to the configured rules.',
    },
    actorRole: 'admin',
    actorTitle: {
      th: 'ระบบอัตโนมัติ / ผู้ดูแลระบบ (Admin)',
      en: 'Automated system / Administrator',
    },
    actorColor: 'bg-slate-100 text-slate-700 border-slate-200',
    targetTab: 'admin_gatekeeper',
    targetTabLabel: {
      th: 'กำหนด Gatekeeper แต่ละหน่วยงาน (Admin)',
      en: 'Assign Gatekeepers per unit (Admin)',
    },
    durationEst: { th: 'ทันที (Real-time)', en: 'Immediate (real-time)' },
    keyActions: [
      {
        th: 'คัดกรองหมวดหมู่และจับคู่กับทีม Gatekeeper ประจำฝ่ายที่รับผิดชอบ — Gatekeeper จะเห็นเรื่องนี้เมื่อเป็นเจ้าหน้าที่ของหมวดนั้น และหน้ากำหนดสิทธิ์เข้าถึง (RBAC) เปิดหมวดนั้นให้ Gatekeeper',
        en: 'Screens the category and matches it to the responsible department Gatekeeper team. A Gatekeeper sees the case when they are an officer of that category and the access-rights (RBAC) page opens that category to Gatekeepers.',
      },
      {
        th: 'กระจายงานตามโหมดการจ่ายงานอัตโนมัติ (Auto-Assign Mode) ของแต่ละหมวด ค่าเริ่มต้นคือ Lead Manual — Admin เปลี่ยนเป็นรายหมวดที่หน้า Gatekeeper ได้ (รวมถึงปิดการจ่ายอัตโนมัติ): Lead Manual (จ่ายให้ Lead ของหมวดคัดกรองก่อน), Round Robin (หมุนเวียนให้เจ้าหน้าที่คนถัดจากผู้รับล่าสุด), Workload Balanced (จ่ายให้เจ้าหน้าที่ที่มีเรื่องค้างน้อยที่สุด) หรือ ปิด (ไม่จ่ายอัตโนมัติ เรื่องจะรอการคัดกรองและมอบหมายเอง)',
        en: 'Distributes work according to the Auto-Assign Mode of each category. The default is Lead Manual, and an Admin can change it per category on the Gatekeeper page (including switching it off): Lead Manual (assigned to the category Lead for triage first), Round Robin (the next officer after the last assignee), Workload Balanced (the officer with the fewest open tickets) or Off (no auto-assignment; the case waits for manual triage and assignment).',
      },
      {
        th: 'เรื่องที่ส่งตรง CEO/EVP จะไม่ถูกจ่ายงานอัตโนมัติเสมอ ไม่ว่าจะตั้งโหมดใดไว้',
        en: 'Cases sent directly to the CEO/EVP are never auto-assigned, whichever mode is set.',
      },
      {
        th: 'ส่งการแจ้งเตือนงานใหม่ไปยังเจ้าหน้าที่ที่ได้รับมอบหมายทันที',
        en: 'Immediately emails the assigned officer about the new case.',
      },
    ],
    systemAutomations: [
      {
        th: 'ส่งอีเมลแจ้งเจ้าหน้าที่ที่ได้รับมอบหมาย โดยมี Lead Officer ประจำฝ่ายใน CC เมื่อผู้รับมอบหมายเป็นคนอื่น (เรื่องใหม่แสดงใน Gatekeeper Inbox ของฝ่ายทันที)',
        en: 'Emails the assigned officer, with the department Lead Officer in CC when the assignee is someone else (the new case shows in the Gatekeeper Inbox of the department right away).',
      },
      {
        th: 'แจ้งเตือนระดับความสำคัญและความเร่งด่วนตามหมวดหมู่',
        en: 'Raises importance and urgency alerts according to the category.',
      },
      {
        th: 'หากเลือก "CEO/EVP Direct Bypass" ระบบจะแจ้งเตือน Dashboard ผู้บริหารทันที',
        en: 'If "CEO/EVP Direct Bypass" is selected, the executive Dashboard is alerted immediately.',
      },
      {
        th: 'เมื่อจ่ายงานอัตโนมัติ การมอบหมายจะแสดงใน Timeline เป็นรายการของ "System"',
        en: 'When a case is auto-assigned, the assignment appears in the Timeline as a "System" entry.',
      },
    ],
    rulesAndSla: {
      th: 'ระบบจัดสรรเคสทันทีตั้งแต่เคสถูกบันทึกสำเร็จเข้าระบบตามโหมดของหมวด โดยค่าเริ่มต้นคือ Lead Manual (จ่ายให้ Lead คัดกรองก่อน) หาก Admin ตั้งเป็น "ปิด" เคสจะรอการคัดกรองและมอบหมายเอง',
      en: 'The system assigns the case the moment it is saved, following the category mode. The default is Lead Manual (assigned to the Lead for triage first); if an Admin sets the mode to "Off", the case waits for manual triage and assignment.',
    },
    icon: <Users className="h-5 w-5 text-indigo-600" />,
  },
  {
    id: 3,
    stageCode: 'TRIAGE_ACTION',
    titleTh: '3. Gatekeeper ตรวจสอบและดำเนินการแก้ไข',
    titleEn: 'Triage, Investigation & Action Plan',
    shortDesc: {
      th: 'เจ้าหน้าที่รับเรื่อง ตรวจสอบข้อเท็จจริง ดำเนินการแก้ไข และอัปเดตความคืบหน้า',
      en: 'The officer accepts the case, verifies the facts, takes corrective action and updates progress.',
    },
    actorRole: 'gatekeeper',
    actorTitle: {
      th: 'เจ้าหน้าที่ Gatekeeper ประจำฝ่าย',
      en: 'Department Gatekeeper officer',
    },
    actorColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    targetTab: 'gatekeeper',
    targetTabLabel: {
      th: 'Gatekeeper Triage Portal',
      en: 'Gatekeeper Triage Portal',
    },
    durationEst: {
      th: 'ตามลำดับความเร่งด่วนของเรื่อง',
      en: 'According to the urgency of the case',
    },
    keyActions: [
      {
        th: 'กดรับเรื่อง (Accept / Triage) และระบุเจ้าหน้าที่ผู้รับผิดชอบหลัก',
        en: 'Accept the case (Accept / Triage) and name the primary officer in charge.',
      },
      {
        th: 'เปลี่ยนสถานะเป็น "กำลังดำเนินการ (In Progress)" หรือ "กำลังตรวจสอบ (Investigating)"',
        en: 'Change the status to "In Progress" or "Investigating".',
      },
      {
        th: 'สื่อสารสองทางแบบนิรนาม (Anonymous 2-Way Chat): ซักถามและขอหลักฐานเพิ่มเติมจากผู้ร้องเรียนโดยที่ระบบรักษาการไม่เปิดเผยตัวตน 100%',
        en: 'Use Anonymous 2-Way Chat to ask questions and request more evidence from the complainant while the system keeps their identity 100% hidden.',
      },
      {
        th: 'ดำเนินการแก้ไขปัญหาหน้างานจริง และจัดทำรายงานสรุปผลการสอบสวนข้อเท็จจริง (Official Investigation & CAPA Report)',
        en: 'Fix the problem on the ground and prepare the Official Investigation & CAPA Report summarizing the findings.',
      },
      {
        th: 'บันทึกสรุปผลการแก้ไข (Resolution Notes) และแนวทางป้องกันเชิงรุก (CAPA)',
        en: 'Record the Resolution Notes and the proactive prevention plan (CAPA).',
      },
      {
        th: 'เปิดดาวน์โหลดไฟล์แนบของผู้ยื่นได้จาก Timeline (เฉพาะคำร้องที่ตนมีสิทธิ์เห็น)',
        en: "Download the submitter's attachments from the Timeline (only for requests you are allowed to see).",
      },
    ],
    systemAutomations: [
      {
        th: 'บันทึก Audit Timeline Log ทุกครั้งที่มีการเปลี่ยนสถานะหรือส่งข้อความ',
        en: 'Writes an Audit Timeline Log entry on every status change or message.',
      },
      {
        th: 'ระบบแจ้งเตือนเคสค้างหรือมีความเร่งด่วนสูงไปยังเจ้าหน้าที่ผู้รับผิดชอบ',
        en: 'Alerts the responsible officer about overdue or highly urgent cases.',
      },
      {
        th: 'ระบบออกรายงานสรุปผลการสอบสวนข้อเท็จจริง (Investigation Summary Report) พิมพ์/ส่งออกได้ทันที',
        en: 'Generates the Investigation Summary Report, ready to print or export.',
      },
      {
        th: 'ส่งอีเมลจริงแจ้งผลการแก้ไขกลับไปยังพนักงานผู้ยื่นเรื่องทันทีเมื่อสถานะเปลี่ยนเป็น Resolved (ตามการเปิด/ปิดในการตั้งค่าอีเมล)',
        en: 'Sends a real email with the outcome to the submitting employee as soon as the status becomes Resolved (subject to the on/off switch in the email settings).',
      },
    ],
    rulesAndSla: {
      th: 'เจ้าหน้าที่ต้องระบุแนวทางและผลการแก้ไขที่ชัดเจน พร้อมทั้งสามารถจัดทำรายงานสรุปผลการสอบสวนก่อนกดยืนยันปิดเคส (Resolved)',
      en: 'The officer must state a clear course of action and resolution, and may prepare the investigation summary report before confirming the case as Resolved.',
    },
    icon: <Shield className="h-5 w-5 text-indigo-600" />,
  },
  {
    id: 4,
    stageCode: 'FEEDBACK_LOOP',
    titleTh: '4. ติดตามผลและประเมินความพึงพอใจ (CSAT)',
    titleEn: 'Employee Tracking & CSAT Evaluation',
    shortDesc: {
      th: 'พนักงานตรวจสอบผลการแก้ไข ให้คะแนนความพึงพอใจ ยืนยันการแก้ไขปัญหา และปิดเคส',
      en: 'The employee reviews the outcome, rates their satisfaction, confirms the fix and closes the case.',
    },
    actorRole: 'employee',
    actorTitle: {
      th: 'พนักงานผู้ยื่นเรื่อง (Employee)',
      en: 'Submitting employee',
    },
    actorColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    targetTab: 'my_tickets',
    targetTabLabel: {
      th: 'ติดตามสถานะเรียลไทม์ (Timeline)',
      en: 'Track Status (Timeline)',
    },
    durationEst: { th: '1–2 วันหลังปิดเคส', en: '1–2 days after the case is resolved' },
    keyActions: [
      {
        th: 'ตรวจสอบผลการแก้ไขและการดำเนินงานผ่าน Interactive Timeline ดาวน์โหลดไฟล์แนบของคำร้อง และเปิดดูรายงานผลการสอบสวน (Official Report)',
        en: 'Review the outcome and progress in the Interactive Timeline, download the request attachments and open the Official Report.',
      },
      {
        th: 'โต้ตอบหรือส่งข้อคิดเห็นเพิ่มเติมผ่านระบบสื่อสารสองทางแบบนิรนาม (Anonymous 2-Way Chat)',
        en: 'Reply or add further comments through the Anonymous 2-Way Chat.',
      },
      {
        th: 'ทำแบบประเมิน CSAT ใหม่ 4 ข้อ: 1. ปัญหาได้รับการแก้ไข (ใช่ / ไม่ใช่) 2. ความคิดเห็นเพิ่มเติม 3. ข้อเสนอแนะเพื่อพัฒนาองค์กร และ 4. ความพึงพอใจภาพรวมทั้งหมด (1–5 ดาว)',
        en: 'Complete the 4-question CSAT survey: 1. Was the problem resolved (Yes / No) 2. Additional comments 3. Suggestions to improve the organization 4. Overall satisfaction (1–5 stars).',
      },
      {
        th: 'กดยืนยันปิดเคสสมบูรณ์ (Status: Closed) อย่างเป็นทางการ',
        en: 'Confirm to formally close the case (Status: Closed).',
      },
    ],
    systemAutomations: [
      {
        th: 'คำนวณคะแนน CSAT รวมและอัปเดตสถิติเข้า Dashboard หน่วยงานทันที',
        en: 'Calculates the overall CSAT score and updates the department Dashboard statistics immediately.',
      },
      {
        th: 'ปิดเคสสมบูรณ์ (Status: Closed) หลังได้รับการประเมินความพึงพอใจ',
        en: 'Closes the case completely (Status: Closed) once the satisfaction survey is received.',
      },
    ],
    rulesAndSla: {
      th: 'ผลคะแนน CSAT ถูกนำไปคำนวณ KPI ประจำหน่วยงานเพื่อความโปร่งใสและสร้างมาตรฐานบริการ',
      en: "CSAT scores feed each unit's KPIs, ensuring transparency and consistent service standards.",
    },
    icon: <Star className="h-5 w-5 text-amber-500" />,
  },
  {
    id: 5,
    stageCode: 'EXECUTIVE_AI',
    titleTh: '5. ผู้บริหารวิเคราะห์ภาพรวม & AI จัดกลุ่มต้นตอ',
    titleEn: 'Executive Oversight & AI Root Cause Analytics',
    shortDesc: {
      th: 'วิเคราะห์อัตราแก้ไขสำเร็จ, CSAT และใช้ AI จัดกลุ่มป้องกันเชิงรุก (CAPA)',
      en: 'Analyzes resolution rate and CSAT, and uses AI to group causes for proactive prevention (CAPA).',
    },
    actorRole: 'executive',
    actorTitle: {
      th: 'ผู้บริหารระดับสูง (CEO / EVP / GRC)',
      en: 'Senior executives (CEO / EVP / GRC)',
    },
    actorColor: 'bg-purple-50 text-purple-700 border-purple-200',
    targetTab: 'executive',
    targetTabLabel: {
      th: 'Dashboard & AI CAPA',
      en: 'Dashboard & AI CAPA',
    },
    durationEst: {
      th: 'เรียลไทม์ / ประจำสัปดาห์ / ประจำเดือน',
      en: 'Real-time / weekly / monthly',
    },
    keyActions: [
      {
        th: 'ติดตามมาตรวัดหลัก: Total Tickets, Resolution Rate %, Average CSAT Score',
        en: 'Track the headline metrics: Total Tickets, Resolution Rate %, Average CSAT Score.',
      },
      {
        th: 'ดูสถิติแยกตาม 6 หน่วยงาน และตรวจสอบเคสด่วนพิเศษ (CEO/EVP Bypass)',
        en: 'View statistics by the 6 units and review special urgent cases (CEO/EVP Bypass).',
      },
      {
        th: 'ใช้ระบบ AI Clustering เพื่อจัดกลุ่มปัญหาที่เกิดซ้ำๆ (Root Cause Analysis 4M)',
        en: 'Use AI Clustering to group recurring problems (Root Cause Analysis 4M).',
      },
      {
        th: 'กำหนดนโยบายและมาตรการป้องกันเชิงรุกระดับองค์กร (CAPA Action Plan)',
        en: 'Set organization-level policies and proactive prevention measures (CAPA Action Plan).',
      },
    ],
    systemAutomations: [
      {
        th: 'AI สกัด Insights และวิเคราะห์สาเหตุเชิงโครงสร้าง (People, Process, Equipment, Governance)',
        en: 'AI extracts insights and analyzes structural causes (People, Process, Equipment, Governance).',
      },
      {
        th: 'ระบบแจ้งเตือน Executive Alert เมื่อมีเคสความเสี่ยงสูงหรือข้อร้องเรียนคั่งค้าง',
        en: 'Raises an Executive Alert when there are high-risk cases or a backlog of complaints.',
      },
    ],
    rulesAndSla: {
      th: 'ข้อมูลสรุปภาพรวมส่งออกเป็นไฟล์ Excel CSV / JSON ได้ และ HR Admin ใช้ SQL Query Studio ในเมนูส่งออกรันรายงานสำเร็จรูป 5 รายการบนฐานข้อมูลจริงได้ โดยครอบคลุมเฉพาะคำร้องที่ผู้ดูมีสิทธิ์เห็น (ไม่สามารถเขียน SQL เองได้)',
      en: 'Summary data can be exported as Excel CSV / JSON, and HR Admins can run 5 ready-made reports on the live database through SQL Query Studio in the export menu. Reports cover only the requests the viewer is allowed to see (writing custom SQL is not possible).',
    },
    icon: <Crown className="h-5 w-5 text-purple-600" />,
  },
];
