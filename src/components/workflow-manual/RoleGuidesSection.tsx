import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Crown,
  FileText,
  Layers,
  Settings,
  Shield,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type { UserRole } from '../../types';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { localize, pick } from './helpers';
import type { Bilingual } from './types';
import {
  GUIDE_HEADING_CLASS,
  GuideCard,
  GuideList,
  NumberBadge,
  PanelHeader,
  type GuideListItem,
} from './ui';

interface TitledText {
  title: Bilingual;
  body: Bilingual;
}

interface BilingualGuideItem {
  id: string;
  content: Bilingual<ReactNode>;
}

interface EmployeeGuideCard {
  title: Bilingual;
  items: readonly BilingualGuideItem[];
}

const localizeItems = (
  lang: Language,
  items: readonly BilingualGuideItem[]
): readonly GuideListItem[] =>
  items.map((item) => ({ id: item.id, content: localize(lang, item.content) }));

const EMPLOYEE_GUIDE_CARDS: readonly EmployeeGuideCard[] = [
  {
    title: {
      th: 'การกรอกฟอร์มยื่นเรื่อง (5 ส่วนหลัก)',
      en: 'Filling in the submission form (5 main parts)',
    },
    items: [
      {
        id: 'part-1',
        content: {
          th: (
            <>
              <strong>ส่วนที่ 1:</strong> เลือกประเภท &quot;ข้อร้องเรียน&quot; หรือ
              &quot;ข้อเสนอแนะพัฒนา&quot;
            </>
          ),
          en: (
            <>
              <strong>Part 1:</strong> Choose the type, &quot;Complaint&quot; or
              &quot;Suggestion&quot;
            </>
          ),
        },
      },
      {
        id: 'part-2',
        content: {
          th: (
            <>
              <strong>ส่วนที่ 2:</strong> เลือก 1 ใน 6 หมวดหมู่ที่ตรงกับปัญหา
            </>
          ),
          en: (
            <>
              <strong>Part 2:</strong> Select 1 of the 6 categories that matches the issue
            </>
          ),
        },
      },
      {
        id: 'part-3',
        content: {
          th: (
            <>
              <strong>ส่วนที่ 3:</strong> ระบุระดับความเร่งด่วนและผลกระทบ (ต่ำ / ปานกลาง / เร่งด่วน
              / วิกฤติ)
            </>
          ),
          en: (
            <>
              <strong>Part 3:</strong> Set the urgency and impact (Low / Medium / Urgent / Critical)
            </>
          ),
        },
      },
      {
        id: 'part-4',
        content: {
          th: (
            <>
              <strong>ส่วนที่ 4:</strong> ตรวจสอบข้อมูลพนักงาน (ชื่อ, รหัส, ฝ่าย, อีเมล)
              ซึ่งระบบเติมให้จากโปรไฟล์ HR ของบัญชีที่ล็อกอิน และสามารถเลือก &quot;ส่งตรงถึง
              CEO/EVP&quot; ได้หากเป็นเรื่องอ่อนไหวสูง
            </>
          ),
          en: (
            <>
              <strong>Part 4:</strong> Check the employee details (name, ID, department, email),
              which the system fills in from the HR profile of the signed-in account, and choose
              &quot;Send directly to CEO/EVP&quot; if the matter is highly sensitive
            </>
          ),
        },
      },
      {
        id: 'part-5',
        content: {
          th: (
            <>
              <strong>ส่วนที่ 5:</strong> ระบุหัวข้อเรื่องใจความสำคัญ, สถานที่/หน่วยงาน (เช่น อาคาร
              Admin หรือ สำนักงานกรุงเทพ) และรายละเอียดข้อเท็จจริง พร้อมแนบไฟล์หลักฐานได้
              (ระบบอัปโหลดทันทีหลังสร้างคำร้อง ไฟล์ที่ไม่สำเร็จกด &quot;ลองแนบไฟล์อีกครั้ง&quot;
              ได้)
            </>
          ),
          en: (
            <>
              <strong>Part 5:</strong> Enter a clear subject, the location / unit (e.g. Admin
              Building or Bangkok Office) and the full facts, and attach evidence files if you have
              them (they upload right after the request is created; for any file that fails, press
              &quot;Try attaching again&quot;)
            </>
          ),
        },
      },
    ],
  },
  {
    title: {
      th: 'การติดตามสถานะด้วย Tracking Code',
      en: 'Tracking status with the Tracking Code',
    },
    items: [
      {
        id: 'tracking-code',
        content: {
          th: (
            <>
              หลังจากส่งเรื่อง ระบบจะออกรหัสติดตาม เช่น <code>TK-2026-0881</code>
            </>
          ),
          en: (
            <>
              After you submit, the system issues a tracking code such as <code>TK-2026-0881</code>
            </>
          ),
        },
      },
      {
        id: 'search',
        content: {
          th: (
            <>
              ค้นหาผ่านช่อง &quot;ค้นหาด้วยรหัสติดตาม&quot; ที่เมนูด้านบน หรือดูในแท็บ
              &quot;คำร้องของฉัน&quot;
            </>
          ),
          en: (
            <>
              Look it up in the tracking-code search box in the top menu, or find it in the &quot;My
              Tickets&quot; tab
            </>
          ),
        },
      },
      {
        id: 'timeline',
        content: {
          th: (
            <>
              คลิกที่การ์ดเพื่อเปิดดู <strong>Interactive Timeline</strong>{' '}
              ตรวจสอบสถานะและขั้นตอนแบบเรียลไทม์
            </>
          ),
          en: (
            <>
              Click the card to open the <strong>Interactive Timeline</strong> and check the status
              and steps in real time
            </>
          ),
        },
      },
      {
        id: 'attachments',
        content: {
          th: (
            <>
              <strong>ไฟล์แนบ:</strong> ดาวน์โหลดไฟล์ที่แนบกับคำร้องได้จาก Timeline
              (เฉพาะผู้ที่มีสิทธิ์เห็นคำร้องนั้น)
            </>
          ),
          en: (
            <>
              <strong>Attachments:</strong> Download the files attached to the request from the
              Timeline (only people allowed to see that request can do so)
            </>
          ),
        },
      },
      {
        id: 'chat',
        content: {
          th: (
            <>
              <strong>สื่อสารสองทางนิรนาม (Anonymous 2-Way Chat):</strong>{' '}
              พิมพ์ข้อความสอบถามหรือชี้แจงพยานหลักฐานเพิ่มเติมกับเจ้าหน้าที่ได้ตลอดเวลา
              โดยระบบปิดบังชื่อตัวตน 100%
            </>
          ),
          en: (
            <>
              <strong>Anonymous 2-Way Chat:</strong> Send questions or clarify further evidence to
              the officers at any time, with your identity 100% hidden by the system
            </>
          ),
        },
      },
      {
        id: 'report',
        content: {
          th: (
            <>
              <strong>รายงานผลการสอบสวน (Official Report):</strong> กดปุ่ม &quot;รายงานผล&quot;
              เพื่อดูสรุปผลการตรวจสอบข้อเท็จจริง และแนวทางป้องกันเชิงรุก (CAPA)
            </>
          ),
          en: (
            <>
              <strong>Official Report:</strong> Press the &quot;Report&quot; button to see the
              summary of the fact-finding results and the proactive prevention plan (CAPA)
            </>
          ),
        },
      },
    ],
  },
  {
    title: {
      th: 'การประเมินความพึงพอใจ (CSAT Evaluation)',
      en: 'Satisfaction evaluation (CSAT)',
    },
    items: [
      {
        id: 'notice',
        content: {
          th: 'เมื่อเจ้าหน้าที่แก้ไขเสร็จ (Resolved) ระบบจะส่งอีเมลแจ้งผู้ยื่นเรื่อง และขึ้นแถบแจ้งเตือนให้ทำแบบประเมิน (สถานะอ่าน/ยังไม่อ่านของการแจ้งเตือนเป็นของแต่ละคน)',
          en: 'When the officer finishes the fix (Resolved), the system emails the submitter and shows a banner asking them to complete the survey (read/unread state of notifications is kept per person).',
        },
      },
      {
        id: 'question',
        content: {
          th: 'ตอบคำถามสำคัญ: 1. ปัญหาได้รับการแก้ไข (ใช่/ไม่ใช่)',
          en: 'Answer the key question: 1. Was the problem resolved (Yes/No)',
        },
      },
      {
        id: 'comment',
        content: {
          th: 'ระบุความคิดเห็นเพิ่มเติม และข้อเสนอแนะเพื่อพัฒนาองค์กรอย่างต่อเนื่อง',
          en: 'Add any further comments and suggestions for continuous improvement of the organization.',
        },
      },
      {
        id: 'rating',
        content: {
          th: 'ให้คะแนนความพึงพอใจภาพรวมทั้งหมด (1–5 ดาว) และกดยืนยันปิดเคสอย่างสมบูรณ์',
          en: 'Rate your overall satisfaction (1–5 stars) and confirm to close the case completely.',
        },
      },
    ],
  },
];

const GATEKEEPER_GUIDE_CARDS: readonly TitledText[] = [
  {
    title: {
      th: 'การรับเรื่องและคัดกรอง (Triage)',
      en: 'Accepting and triaging cases (Triage)',
    },
    body: {
      th: 'คุณเป็น Gatekeeper เมื่อถูกเพิ่มเป็นเจ้าหน้าที่ของหมวดใดก็ได้ในหน้า "จัดการผู้บริหาร & Gatekeeper" และเห็นเฉพาะหมวดที่เป็นเจ้าหน้าที่ซึ่งหน้า RBAC เปิดให้ Gatekeeper ตรวจสอบรายการคำร้องใหม่ กดรับเรื่องเพื่อรับผิดชอบ หรือโอนย้ายไปยังเจ้าหน้าที่ผู้เชี่ยวชาญเฉพาะทางในทีม',
      en: 'You are a Gatekeeper once you are added as an officer of any category on the "Personnel & Gatekeepers" page, and you see only the categories where you are an officer and that the RBAC page opens to Gatekeepers. Review new requests, accept a case to take ownership, or transfer it to a specialist officer in the team.',
    },
  },
  {
    title: {
      th: 'สื่อสารสองทางนิรนาม (Q&A)',
      en: 'Anonymous 2-way communication (Q&A)',
    },
    body: {
      th: 'ส่งข้อความซักถามข้อเท็จจริง หรือขอหลักฐานเพิ่มเติมจากผู้ร้องเรียนนิรนามผ่านแถบ "สื่อสารสองทางนิรนาม" โดยไม่ละเมิดความเป็นส่วนตัว — อีเมลแจ้งเตือนที่ส่งถึง Gatekeeper จะไม่แสดงตัวตนของผู้ยื่นแบบนิรนาม',
      en: 'Send messages to clarify facts or request more evidence from an anonymous complainant through the "Anonymous 2-Way Chat" tab without breaching their privacy. Notification emails sent to the Gatekeeper never reveal the identity of an anonymous submitter.',
    },
  },
  {
    title: {
      th: 'ออกรายงานผลสอบสวน (Report)',
      en: 'Issuing the investigation report (Report)',
    },
    body: {
      th: 'กดปุ่ม "รายงานผล" ในหน้า Timeline เพื่อเปิดดู พิมพ์ หรือส่งออกรายงานสรุปผลการสอบสวนข้อเท็จจริงและมาตรการป้องกันเชิงรุก (CAPA)',
      en: 'Press the "Report" button on the Timeline page to open, print or export the investigation summary report and the proactive prevention measures (CAPA).',
    },
  },
  {
    title: {
      th: 'บันทึกผลการแก้ไข (Resolution)',
      en: 'Recording the resolution (Resolution)',
    },
    body: {
      th: 'เมื่อแก้ไขหน้างานเรียบร้อย ให้ระบุสรุปผลการแก้ไข (Resolution Summary) ให้ชัดเจนก่อนกดยืนยันปิดเคส เพื่อให้พนักงานสามารถประเมิน CSAT ได้ (ระบบส่งอีเมลแจ้งผู้ยื่นเมื่อเปลี่ยนสถานะเป็น Resolved)',
      en: 'Once the issue is fixed on site, write a clear Resolution Summary before confirming the case so the employee can complete the CSAT survey (the system emails the submitter when the status changes to Resolved).',
    },
  },
];

interface ExecutiveGuideCard extends TitledText {
  icon: ReactNode;
}

const EXECUTIVE_GUIDE_CARDS: readonly ExecutiveGuideCard[] = [
  {
    icon: <TrendingUp className="h-4 w-4 text-purple-600" />,
    title: {
      th: 'ดัชนีชี้วัดหลัก (Key Metrics)',
      en: 'Key Metrics',
    },
    body: {
      th: 'ติดตามยอดคำร้องทั้งหมด, Resolution Rate %, คะแนนเฉลี่ยความพึงพอใจ (CSAT Score) และสัดส่วนแยกตาม 6 หน่วยงาน',
      en: 'Track total requests, Resolution Rate %, the average satisfaction score (CSAT Score) and the breakdown across the 6 units.',
    },
  },
  {
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    title: {
      th: 'เคสด่วน Bypass & ความเสี่ยงสูง',
      en: 'Bypass urgent cases & high risk',
    },
    body: {
      th: 'ตรวจสอบคำร้องที่ส่งตรงถึงผู้บริหาร (CEO/EVP Bypass) และเคสระดับ Critical เพื่อสั่งการหรือมอบหมายนโยบายโดยตรง — คุณเป็นผู้บริหารเมื่ออยู่ในรายชื่อผู้บริหารของหน้า "จัดการผู้บริหาร & Gatekeeper" ส่วนสิทธิ์พิเศษ (เช่น เห็นเรื่องส่งตรง CEO, ดูอีเมลผู้ยื่นแบบนิรนาม) กำหนดที่หน้า RBAC',
      en: 'Review requests sent directly to executives (CEO/EVP Bypass) and Critical-level cases to give direction or assign policy directly. You are an executive when you are on the executive list on the "Personnel & Gatekeepers" page; special rights (such as seeing direct-to-CEO cases or the email of anonymous submitters) are set on the RBAC page.',
    },
  },
  {
    icon: <Layers className="h-4 w-4 text-indigo-600" />,
    title: {
      th: 'AI Root Cause & CAPA Plan',
      en: 'AI Root Cause & CAPA Plan',
    },
    body: {
      th: 'ระบบ AI จัดกลุ่มปัญหาที่เกิดซ้ำตามหมวดหมู่ 4M และเสนอมาตรการป้องกันเชิงรุก (Corrective & Preventive Actions)',
      en: 'The AI groups recurring problems by the 4M categories and proposes Corrective & Preventive Actions.',
    },
  },
];

const ADMIN_GUIDE_CARDS: readonly TitledText[] = [
  {
    title: {
      th: '1. กำหนดรายชื่อ Gatekeeper ทั้ง 6 หน่วยงาน',
      en: '1. Assign Gatekeepers for all 6 units',
    },
    body: {
      th: 'ระบุ Lead Officer และรายชื่อเจ้าหน้าที่ผู้รับผิดชอบประจำแต่ละหมวด พร้อมอีเมลและเบอร์ติดต่อสำหรับการแจ้งเตือน โดยเลือกชื่อจากฐานข้อมูล HR (vwHR_SC_Employee) — อีเมลจะถูกล็อกตามข้อมูล HR',
      en: 'Name the Lead Officer and the responsible officers for each category, with the email and phone number used for notifications, by picking names from the HR database (vwHR_SC_Employee). The email is locked to the HR record.',
    },
  },
  {
    title: {
      th: '2. ตั้งค่าโหมดการจ่ายงานอัตโนมัติ (Dispatch Policy)',
      en: '2. Set the auto-assign mode (Dispatch Policy)',
    },
    body: {
      th: 'ตั้งค่าแยกรายหมวดที่หน้ากำหนด Gatekeeper (Auto-Assign Mode) ค่าเริ่มต้นคือ Lead Manual — Admin เปลี่ยนเองรายหมวดได้ มี 4 แบบ: Lead Manual (จ่ายให้ Lead ของหมวดคัดกรองก่อน), Round Robin (จ่ายหมุนเวียนให้เจ้าหน้าที่คนถัดจากผู้รับล่าสุด), Workload Balanced (จ่ายให้เจ้าหน้าที่ที่มีเรื่องค้างน้อยที่สุด) หรือ ปิด (ไม่จ่ายอัตโนมัติ เรื่องจะรอการคัดกรองและมอบหมายเอง) ทั้งนี้เรื่องที่ส่งตรง CEO/EVP จะไม่ถูกจ่ายอัตโนมัติเสมอ และการจ่ายอัตโนมัติจะแสดงในไทม์ไลน์ของเรื่องเป็นรายการจาก "System"',
      en: 'Set per category on the Gatekeeper assignment page (Auto-Assign Mode). The default is Lead Manual, and an Admin can change it per category. There are 4 options: Lead Manual (assigned to the category Lead for triage first), Round Robin (assigned in turn to the next officer after the last assignee), Workload Balanced (assigned to the officer with the fewest open tickets) or Off (no auto-assignment; the case waits for manual triage and assignment). Cases sent directly to the CEO/EVP are never auto-assigned, and an automatic assignment appears in the case timeline as a "System" entry.',
    },
  },
  {
    title: {
      th: '3. ระบบแจ้งเตือน Email & ปรับแต่งเทมเพลต',
      en: '3. Email notifications & template customization',
    },
    body: {
      th: 'ส่งอีเมลจริงผ่าน SMTP ของบริษัท: เมื่อมีเคสใหม่ส่งถึงเจ้าหน้าที่ที่ได้รับมอบหมาย โดยมี Lead Gatekeeper ของหมวดใน CC เมื่อผู้รับมอบหมายเป็นคนอื่น (ถ้ายังไม่มีผู้รับมอบหมายส่งถึง Lead และถ้าไม่มี Lead ส่งไปอีเมลส่งต่อเรื่องของหน่วยงาน) และเมื่อแก้ไขเสร็จส่งถึงผู้ยื่น เปิด/ปิดการส่ง ปรับหัวข้อ (Subject) และเนื้อหา (Body) พร้อม Dynamic Tags ทดสอบส่ง และดูประวัติการส่งในส่วน "Email Settings" — ตัวตนของผู้ยื่นแบบนิรนามจะไม่ปรากฏในอีเมลถึง Gatekeeper และในประวัติการส่ง',
      en: 'Real emails go out through the company SMTP: a new case is sent to the assigned officer, with the category Lead Gatekeeper in CC when the assignee is someone else (with no assignee it goes to the Lead, and if there is no Lead, to the unit forwarding mailbox), and a completed fix is sent to the submitter. In "Email Settings" you can switch sending on/off, edit the Subject and Body with Dynamic Tags, send a test and view the dispatch history. An anonymous submitter\'s identity never appears in the email to the Gatekeeper or in the dispatch history.',
    },
  },
  {
    title: {
      th: '4. ใครได้บทบาทอะไร (รายชื่อผู้มีบทบาท)',
      en: '4. Who gets which role (role rosters)',
    },
    body: {
      th: 'เข้าสู่ระบบด้วยบัญชีบริษัท (SSO) และไม่มีตัวสลับบทบาท บทบาทมาจากรายชื่อในหน้า "จัดการผู้บริหาร & Gatekeeper": รายชื่อ HR Admin → HR Admin, รายชื่อผู้บริหาร → ผู้บริหาร, เจ้าหน้าที่ Gatekeeper ของหมวดใดก็ได้ → Gatekeeper, คนอื่นทั้งหมด → พนักงานทั่วไป (ถ้าอยู่หลายรายชื่อ บทบาทสูงสุดชนะ) การแก้รายชื่อมีผลเมื่อบุคคลนั้นเปลี่ยนหน้าครั้งถัดไป ผู้ที่ไม่อยู่ใน HR (ป้าย "ไม่อยู่ใน HR") รับอีเมลได้แต่เข้าสู่ระบบไม่ได้ ป้าย "พ้นสภาพใน HR" แสดงกับพนักงานที่พ้นสภาพแล้ว การเข้าสู่ระบบครั้งแรกบนระบบใหม่จะพาไปหน้า /admin/setup เพื่อตั้งผู้ล็อกอินคนนั้นเป็น HR Admin คนแรก',
      en: 'Everyone signs in with the company account (SSO) and there is no role switcher. Roles come from the lists on the "Personnel & Gatekeepers" page: HR Admin list → HR Admin, executive list → executive, Gatekeeper officer of any category → Gatekeeper, everyone else → regular employee (if someone is on several lists, the highest role wins). Changes to the lists take effect the next time that person changes page. People not in HR (the "Not in HR" badge) can receive email but cannot sign in. The "Left HR" badge is shown for employees who have left the company. The first sign-in on a new system leads to the /admin/setup page to make that user the first HR Admin.',
    },
  },
  {
    title: {
      th: '5. กำหนดสิทธิ์ (RBAC) และกฎกันล็อกตัวเอง',
      en: '5. Set access rights (RBAC) and the self-lockout rules',
    },
    body: {
      th: 'หน้า "กำหนดสิทธิ์เข้าถึง (RBAC)" กำหนดว่าแต่ละบทบาทเปิดแท็บใดได้ และสิทธิ์พิเศษ (ส่งตรง CEO, ตัวตนที่เป็นความลับ, อีเมลผู้ยื่นแบบนิรนาม, CAPA, จัดการเจ้าหน้าที่/RBAC) Gatekeeper เห็นเฉพาะหมวดที่ตนเป็นเจ้าหน้าที่และที่หน้า RBAC เปิดให้ Gatekeeper ระบบไม่ให้ลบหรือปิดการใช้งานตัวเอง ไม่ให้ลบ HR Admin คนสุดท้ายที่ยังใช้งานอยู่ และ HR Admin จะมีหน้า RBAC เสมอ',
      en: 'The "Access Control (RBAC)" page sets which tabs each role can open and the special rights (direct-to-CEO cases, confidential identities, anonymous submitter emails, CAPA, officer/RBAC management). A Gatekeeper sees only the categories where they are an officer and that the RBAC page opens to Gatekeepers. The system does not let you delete or deactivate yourself or remove the last active HR Admin, and an HR Admin always keeps the RBAC page.',
    },
  },
  {
    title: {
      th: '6. จัดการผู้ใช้ (อ่านอย่างเดียว)',
      en: '6. User management (read-only)',
    },
    body: {
      th: 'หน้า "จัดการผู้ใช้" แสดงบทบาทของผู้ใช้แต่ละคนและรายชื่อที่ทำให้ได้บทบาทนั้น ใช้ตรวจสอบเท่านั้น หากต้องการเปลี่ยนบทบาทให้แก้ที่รายชื่อในหน้า "จัดการผู้บริหาร & Gatekeeper"',
      en: 'The "User Management" page shows each user\'s role and the list that gives them that role. It is for checking only; to change a role, edit the lists on the "Personnel & Gatekeepers" page.',
    },
  },
  {
    title: {
      th: '7. ส่งออกข้อมูลและ SQL Query Studio',
      en: '7. Data export and SQL Query Studio',
    },
    body: {
      th: 'HR Admin ส่งออกข้อมูลได้จากเมนูส่งออก และใช้ SQL Query Studio รันรายงานสำเร็จรูป 5 รายการบนฐานข้อมูลจริง โดยครอบคลุมเฉพาะคำร้องที่ผู้ดูมีสิทธิ์เห็น (ไม่สามารถเขียน SQL เองได้)',
      en: 'HR Admins can export data from the export menu and use SQL Query Studio to run 5 ready-made reports on the live database. Reports cover only the requests the viewer is allowed to see (writing custom SQL is not possible).',
    },
  },
];

const EmployeeGuideBody = () => {
  const { lang } = useLanguage();
  return (
    <>
      {EMPLOYEE_GUIDE_CARDS.map((card, i) => (
        <GuideCard
          key={card.title.th}
          title={localize(lang, card.title)}
          lead={<NumberBadge number={i + 1} badgeClass="bg-emerald-600" />}
        >
          <GuideList items={localizeItems(lang, card.items)} />
        </GuideCard>
      ))}
      <GuideCard
        tone="success"
        title={pick(
          lang,
          'Personal Data Protection (PDPA Protection)',
          'การคุ้มครองข้อมูลส่วนบุคคล (PDPA Protection)'
        )}
        lead={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
        body={pick(
          lang,
          "Submitter information is passed only to the responsible department Gatekeeper officers, for the purpose of coordinating the fix, and is encrypted according to the organization's data security standards.",
          'ข้อมูลผู้ยื่นเรื่องจะถูกส่งต่อเฉพาะเจ้าหน้าที่ Gatekeeper ประจำฝ่ายที่รับผิดชอบเพื่อการประสานงานแก้ไขปัญหาเท่านั้น และได้รับการเข้ารหัสตามมาตรฐานความปลอดภัยข้อมูลองค์กร'
        )}
      />
    </>
  );
};

const GatekeeperGuideBody = () => {
  const { lang } = useLanguage();
  return (
    <>
      {GATEKEEPER_GUIDE_CARDS.map((card, i) => (
        <GuideCard
          key={card.title.th}
          title={localize(lang, card.title)}
          body={localize(lang, card.body)}
          lead={<NumberBadge number={i + 1} badgeClass="bg-indigo-600" />}
        />
      ))}
    </>
  );
};

const ExecutiveGuideBody = () => {
  const { lang } = useLanguage();
  return (
    <>
      {EXECUTIVE_GUIDE_CARDS.map((card) => (
        <GuideCard
          key={card.title.th}
          asHeading
          headingClass={GUIDE_HEADING_CLASS.rowTight}
          title={localize(lang, card.title)}
          body={localize(lang, card.body)}
          lead={card.icon}
        />
      ))}
    </>
  );
};

const AdminGuideBody = () => {
  const { lang } = useLanguage();
  return (
    <>
      {ADMIN_GUIDE_CARDS.map((card) => (
        <GuideCard
          key={card.title.th}
          asHeading
          headingClass={GUIDE_HEADING_CLASS.plain}
          title={localize(lang, card.title)}
          body={localize(lang, card.body)}
        />
      ))}
    </>
  );
};

interface RoleGuideConfig {
  selectorIcon: ReactNode;
  selectorTitle: Bilingual;
  selectorSubtitle: Bilingual;
  selectorActiveClass: string;
  headerIconBoxClass: string;
  headerIcon: ReactNode;
  headerTitle: Bilingual;
  headerSubtitle: Bilingual;
  launchLabel: Bilingual;
  launchClass: string;
  launchTab: string;
  gridClass: string;
  Body: () => ReactNode;
}

const ROLE_ORDER: readonly UserRole[] = ['employee', 'gatekeeper', 'executive', 'admin'];

const ROLE_GUIDES: Record<UserRole, RoleGuideConfig> = {
  employee: {
    selectorIcon: <FileText className="h-5 w-5 text-emerald-600" />,
    selectorTitle: { th: 'พนักงานทั่วไป (Employee)', en: 'Employee' },
    selectorSubtitle: {
      th: 'ยื่นเรื่อง & ติดตาม Timeline & CSAT',
      en: 'Submit, track the Timeline & CSAT',
    },
    selectorActiveClass:
      'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-950',
    headerIconBoxClass: 'rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-600',
    headerIcon: <FileText className="h-6 w-6" />,
    headerTitle: {
      th: 'คู่มือการใช้งานสำหรับพนักงาน (Employee User Guide)',
      en: 'Employee User Guide',
    },
    headerSubtitle: {
      th: 'ขั้นตอนการยื่นข้อร้องเรียน/ข้อเสนอแนะ การติดตามสถานะ และการประเมินความพึงพอใจ',
      en: 'How to submit a complaint or suggestion, track its status and evaluate satisfaction',
    },
    launchLabel: { th: 'ไปที่หน้ายื่นเรื่อง', en: 'Go to the submission page' },
    launchClass:
      'flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700',
    launchTab: 'submit',
    gridClass: 'grid grid-cols-1 gap-4 md:grid-cols-2',
    Body: EmployeeGuideBody,
  },
  gatekeeper: {
    selectorIcon: <Shield className="h-5 w-5 text-indigo-600" />,
    selectorTitle: { th: 'Gatekeeper ประจำฝ่าย', en: 'Department Gatekeeper' },
    selectorSubtitle: {
      th: 'รับเรื่อง ตรวจสอบ ลงพื้นที่ & แก้ไข',
      en: 'Accept, investigate, visit sites & resolve',
    },
    selectorActiveClass: 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20 text-indigo-950',
    headerIconBoxClass: 'rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-600',
    headerIcon: <Shield className="h-6 w-6" />,
    headerTitle: {
      th: 'คู่มือสำหรับ Gatekeeper ประจำฝ่าย (Gatekeeper Portal Guide)',
      en: 'Gatekeeper Portal Guide',
    },
    headerSubtitle: {
      th: 'แนวทางการคัดกรองเคส (Triage) การสื่อสารนิรนาม การออกรายงานผลสอบสวน และการบันทึกผลการแก้ไข',
      en: 'Guidelines for case triage, anonymous communication, issuing investigation reports and recording resolutions',
    },
    launchLabel: { th: 'ไปที่ Gatekeeper Portal', en: 'Go to the Gatekeeper Portal' },
    launchClass:
      'flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700',
    launchTab: 'gatekeeper',
    gridClass: 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4',
    Body: GatekeeperGuideBody,
  },
  executive: {
    selectorIcon: <Crown className="h-5 w-5 text-purple-600" />,
    selectorTitle: { th: 'ผู้บริหารระดับสูง (Executive)', en: 'Executive' },
    selectorSubtitle: {
      th: 'Dashboard, Insights & AI CAPA',
      en: 'Dashboard, Insights & AI CAPA',
    },
    selectorActiveClass: 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/20 text-purple-950',
    headerIconBoxClass: 'rounded-xl border border-purple-200 bg-purple-50 p-3 text-purple-600',
    headerIcon: <Crown className="h-6 w-6" />,
    headerTitle: {
      th: 'คู่มือสำหรับผู้บริหาร (Executive Overview & AI CAPA Guide)',
      en: 'Executive Overview & AI CAPA Guide',
    },
    headerSubtitle: {
      th: 'การติดตามดัชนีชี้วัดภาพรวม การจัดการเคส Bypass และการใช้ AI วิเคราะห์สาเหตุต้นตอ',
      en: 'Monitoring overall metrics, handling Bypass cases and using AI for root cause analysis',
    },
    launchLabel: { th: 'เปิดดู Dashboard ผู้บริหาร', en: 'Open the Executive Dashboard' },
    launchClass:
      'flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-purple-700',
    launchTab: 'executive',
    gridClass: 'grid grid-cols-1 gap-4 md:grid-cols-3',
    Body: ExecutiveGuideBody,
  },
  admin: {
    selectorIcon: <Settings className="h-5 w-5 text-slate-700" />,
    selectorTitle: { th: 'ผู้ดูแลระบบ (Admin)', en: 'Admin' },
    selectorSubtitle: {
      th: 'จัดสรร Gatekeeper & สิทธิ์ RBAC',
      en: 'Assign Gatekeepers & RBAC rights',
    },
    selectorActiveClass: 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20 text-slate-950',
    headerIconBoxClass: 'rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-700',
    headerIcon: <Settings className="h-6 w-6" />,
    headerTitle: {
      th: 'คู่มือสำหรับผู้ดูแลระบบ (Admin & RBAC Management Guide)',
      en: 'Admin & RBAC Management Guide',
    },
    headerSubtitle: {
      th: 'การกำหนด Gatekeeper ประจำแต่ละหน่วยงาน การตั้งค่านโยบายจ่ายงาน และการควบคุมสิทธิ์',
      en: 'Assigning the Gatekeepers of each unit, configuring the dispatch policy and controlling access rights',
    },
    launchLabel: { th: 'ไปที่หน้าตั้งค่า Admin', en: 'Go to the Admin settings page' },
    launchClass:
      'flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-900',
    launchTab: 'admin_gatekeeper',
    gridClass: 'grid grid-cols-1 gap-4 md:grid-cols-3',
    Body: AdminGuideBody,
  },
};

interface RoleGuidesSectionProps {
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onNavigateTab: (tab: string) => void;
  onSwitchRole?: (role: UserRole) => void;
}

export const RoleGuidesSection = ({
  selectedRole,
  onSelectRole,
  onNavigateTab,
  onSwitchRole,
}: Readonly<RoleGuidesSectionProps>) => {
  const { lang } = useLanguage();
  const guide = ROLE_GUIDES[selectedRole];
  const { Body } = guide;

  const handleLaunch = () => {
    onSwitchRole?.(selectedRole);
    onNavigateTab(guide.launchTab);
  };

  return (
    <div className="space-y-6">
      {/* Role Selector Tabs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ROLE_ORDER.map((role) => {
          const config = ROLE_GUIDES[role];
          return (
            <button
              key={role}
              type="button"
              id={`guide-role-btn-${role}`}
              onClick={() => onSelectRole(role)}
              className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                selectedRole === role
                  ? config.selectorActiveClass
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <div className="rounded-lg border border-slate-100 bg-white p-1.5 shadow-2xs">
                  {config.selectorIcon}
                </div>
                <span className="text-xs font-bold">{localize(lang, config.selectorTitle)}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {localize(lang, config.selectorSubtitle)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Guide Content for the selected role */}
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <PanelHeader
          className="flex items-center justify-between border-b border-slate-200 pb-4"
          iconBoxClass={guide.headerIconBoxClass}
          icon={guide.headerIcon}
          title={localize(lang, guide.headerTitle)}
          subtitle={localize(lang, guide.headerSubtitle)}
        >
          <button type="button" onClick={handleLaunch} className={guide.launchClass}>
            <span>{localize(lang, guide.launchLabel)}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </PanelHeader>

        <div className={guide.gridClass}>
          <Body />
        </div>
      </div>
    </div>
  );
};
