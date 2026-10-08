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
import {
  GUIDE_HEADING_CLASS,
  GuideCard,
  GuideList,
  NumberBadge,
  PanelHeader,
  type GuideListItem,
} from './ui';

interface TitledText {
  title: string;
  body: string;
}

interface EmployeeGuideCard {
  title: string;
  items: readonly GuideListItem[];
}

const EMPLOYEE_GUIDE_CARDS: readonly EmployeeGuideCard[] = [
  {
    title: 'การกรอกฟอร์มยื่นเรื่อง (5 ส่วนหลัก)',
    items: [
      {
        id: 'part-1',
        content: (
          <>
            <strong>ส่วนที่ 1:</strong> เลือกประเภท &quot;ข้อร้องเรียน&quot; หรือ
            &quot;ข้อเสนอแนะพัฒนา&quot;
          </>
        ),
      },
      {
        id: 'part-2',
        content: (
          <>
            <strong>ส่วนที่ 2:</strong> เลือก 1 ใน 6 หมวดหมู่ที่ตรงกับปัญหา
          </>
        ),
      },
      {
        id: 'part-3',
        content: (
          <>
            <strong>ส่วนที่ 3:</strong> ระบุระดับความเร่งด่วนและผลกระทบ (Standard / Urgent /
            Critical)
          </>
        ),
      },
      {
        id: 'part-4',
        content: (
          <>
            <strong>ส่วนที่ 4:</strong> ตรวจสอบข้อมูลพนักงาน (ชื่อ, รหัส, ฝ่าย, อีเมล)
            และสามารถเลือก &quot;ส่งตรงถึง CEO/EVP&quot; ได้หากเป็นเรื่องอ่อนไหวสูง
          </>
        ),
      },
      {
        id: 'part-5',
        content: (
          <>
            <strong>ส่วนที่ 5:</strong> ระบุหัวข้อเรื่องใจความสำคัญ, สถานที่/หน่วยงาน (เช่น อาคาร
            Admin หรือ สำนักงานกรุงเทพ) และรายละเอียดข้อเท็จจริง
          </>
        ),
      },
    ],
  },
  {
    title: 'การติดตามสถานะด้วย Tracking Code',
    items: [
      {
        id: 'tracking-code',
        content: (
          <>
            หลังจากส่งเรื่อง ระบบจะออกรหัสติดตาม เช่น <code>TK-2026-0881</code>
          </>
        ),
      },
      {
        id: 'search',
        content: (
          <>
            ค้นหาผ่านช่อง &quot;ค้นหาด้วยรหัสติดตาม&quot; ที่เมนูด้านบน หรือดูในแท็บ
            &quot;คำร้องของฉัน&quot;
          </>
        ),
      },
      {
        id: 'timeline',
        content: (
          <>
            คลิกที่การ์ดเพื่อเปิดดู <strong>Interactive Timeline</strong>{' '}
            ตรวจสอบสถานะและขั้นตอนแบบเรียลไทม์
          </>
        ),
      },
      {
        id: 'chat',
        content: (
          <>
            <strong>สื่อสารสองทางนิรนาม (Anonymous 2-Way Chat):</strong>{' '}
            พิมพ์ข้อความสอบถามหรือชี้แจงพยานหลักฐานเพิ่มเติมกับเจ้าหน้าที่ได้ตลอดเวลา
            โดยระบบปิดบังชื่อตัวตน 100%
          </>
        ),
      },
      {
        id: 'report',
        content: (
          <>
            <strong>รายงานผลการสอบสวน (Official Report):</strong> กดปุ่ม &quot;รายงานผล&quot;
            เพื่อดูสรุปผลการตรวจสอบข้อเท็จจริง และแนวทางป้องกันเชิงรุก (CAPA)
          </>
        ),
      },
    ],
  },
  {
    title: 'การประเมินความพึงพอใจ (CSAT Evaluation)',
    items: [
      {
        id: 'notice',
        content: 'เมื่อเจ้าหน้าที่แก้ไขเสร็จ (Resolved) ระบบจะขึ้นแถบแจ้งเตือนให้ทำแบบประเมิน',
      },
      { id: 'question', content: 'ตอบคำถามสำคัญ: 1. ปัญหาได้รับการแก้ไข (ใช่/ไม่ใช่)' },
      {
        id: 'comment',
        content: 'ระบุความคิดเห็นเพิ่มเติม และข้อเสนอแนะเพื่อพัฒนาองค์กรอย่างต่อเนื่อง',
      },
      {
        id: 'rating',
        content: 'ให้คะแนนความพึงพอใจภาพรวมทั้งหมด (1–5 ดาว) และกดยืนยันปิดเคสอย่างสมบูรณ์',
      },
    ],
  },
];

const GATEKEEPER_GUIDE_CARDS: readonly TitledText[] = [
  {
    title: 'การรับเรื่องและคัดกรอง (Triage)',
    body: 'ตรวจสอบรายการคำร้องใหม่ในหน่วยงาน กดรับเรื่องเพื่อรับผิดชอบ หรือโอนย้ายไปยังเจ้าหน้าที่ผู้เชี่ยวชาญเฉพาะทางในทีม',
  },
  {
    title: 'สื่อสารสองทางนิรนาม (Q&A)',
    body: 'ส่งข้อความซักถามข้อเท็จจริง หรือขอหลักฐานเพิ่มเติมจากผู้ร้องเรียนนิรนามผ่านแถบ "สื่อสารสองทางนิรนาม" โดยไม่ละเมิดความเป็นส่วนตัว',
  },
  {
    title: 'ออกรายงานผลสอบสวน (Report)',
    body: 'กดปุ่ม "รายงานผล" ในหน้า Timeline เพื่อเปิดดู พิมพ์ หรือส่งออกรายงานสรุปผลการสอบสวนข้อเท็จจริงและมาตรการป้องกันเชิงรุก (CAPA)',
  },
  {
    title: 'บันทึกผลการแก้ไข (Resolution)',
    body: 'เมื่อแก้ไขหน้างานเรียบร้อย ให้ระบุสรุปผลการแก้ไข (Resolution Summary) ให้ชัดเจนก่อนกดยืนยันปิดเคส เพื่อให้พนักงานสามารถประเมิน CSAT ได้',
  },
];

interface ExecutiveGuideCard extends TitledText {
  icon: ReactNode;
}

const EXECUTIVE_GUIDE_CARDS: readonly ExecutiveGuideCard[] = [
  {
    icon: <TrendingUp className="h-4 w-4 text-purple-600" />,
    title: 'ดัชนีชี้วัดหลัก (Key Metrics)',
    body: 'ติดตามยอดคำร้องทั้งหมด, Resolution Rate %, คะแนนเฉลี่ยความพึงพอใจ (CSAT Score) และสัดส่วนแยกตาม 6 หน่วยงาน',
  },
  {
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    title: 'เคสด่วน Bypass & ความเสี่ยงสูง',
    body: 'ตรวจสอบคำร้องที่ส่งตรงถึงผู้บริหาร (CEO/EVP Bypass) และเคสระดับ Critical เพื่อสั่งการหรือมอบหมายนโยบายโดยตรง',
  },
  {
    icon: <Layers className="h-4 w-4 text-indigo-600" />,
    title: 'AI Root Cause & CAPA Plan',
    body: 'ระบบ AI จัดกลุ่มปัญหาที่เกิดซ้ำตามหมวดหมู่ 4M และเสนอมาตรการป้องกันเชิงรุก (Corrective & Preventive Actions)',
  },
];

const ADMIN_GUIDE_CARDS: readonly TitledText[] = [
  {
    title: '1. กำหนดรายชื่อ Gatekeeper ทั้ง 6 หน่วยงาน',
    body: 'ระบุ Lead Officer และรายชื่อเจ้าหน้าที่ผู้รับผิดชอบประจำแต่ละหมวด พร้อมอีเมลและเบอร์ติดต่อสำหรับการแจ้งเตือน',
  },
  {
    title: '2. ตั้งค่าโหมดการจ่ายงานอัตโนมัติ (Dispatch Policy)',
    body: 'เลือกระหว่าง Round Robin (จ่ายงานหมุนเวียนเท่าๆ กัน), Workload Balanced (พิจารณาภาระงานคงค้าง), หรือ Lead Manual (หัวหน้าเป็นผู้จ่าย)',
  },
  {
    title: '3. ระบบแจ้งเตือน Email & ปรับแต่งเทมเพลต',
    body: 'เปิด/ปิดการส่งอีเมล, ปรับหัวข้อ (Subject) และเนื้อหา (Body) พร้อม Dynamic Tags ส่งหา Gatekeeper เมื่อมีเคสใหม่ และส่งหาพนักงานเมื่อแก้ไขเสร็จ',
  },
];

const EmployeeGuideBody = () => (
  <>
    {EMPLOYEE_GUIDE_CARDS.map((card, i) => (
      <GuideCard
        key={card.title}
        title={card.title}
        lead={<NumberBadge number={i + 1} badgeClass="bg-emerald-600" />}
      >
        <GuideList items={card.items} />
      </GuideCard>
    ))}
    <GuideCard
      tone="success"
      title="การคุ้มครองข้อมูลส่วนบุคคล (PDPA Protection)"
      lead={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
      body="ข้อมูลผู้ยื่นเรื่องจะถูกส่งต่อเฉพาะเจ้าหน้าที่ Gatekeeper ประจำฝ่ายที่รับผิดชอบเพื่อการประสานงานแก้ไขปัญหาเท่านั้น และได้รับการเข้ารหัสตามมาตรฐานความปลอดภัยข้อมูลองค์กร"
    />
  </>
);

const GatekeeperGuideBody = () => (
  <>
    {GATEKEEPER_GUIDE_CARDS.map((card, i) => (
      <GuideCard
        key={card.title}
        title={card.title}
        body={card.body}
        lead={<NumberBadge number={i + 1} badgeClass="bg-indigo-600" />}
      />
    ))}
  </>
);

const ExecutiveGuideBody = () => (
  <>
    {EXECUTIVE_GUIDE_CARDS.map((card) => (
      <GuideCard
        key={card.title}
        asHeading
        headingClass={GUIDE_HEADING_CLASS.rowTight}
        title={card.title}
        body={card.body}
        lead={card.icon}
      />
    ))}
  </>
);

const AdminGuideBody = () => (
  <>
    {ADMIN_GUIDE_CARDS.map((card) => (
      <GuideCard
        key={card.title}
        asHeading
        headingClass={GUIDE_HEADING_CLASS.plain}
        title={card.title}
        body={card.body}
      />
    ))}
  </>
);

interface RoleGuideConfig {
  selectorIcon: ReactNode;
  selectorTitle: string;
  selectorSubtitle: string;
  selectorActiveClass: string;
  headerIconBoxClass: string;
  headerIcon: ReactNode;
  headerTitle: string;
  headerSubtitle: string;
  launchLabel: string;
  launchClass: string;
  launchTab: string;
  gridClass: string;
  Body: () => ReactNode;
}

const ROLE_ORDER: readonly UserRole[] = ['employee', 'gatekeeper', 'executive', 'admin'];

const ROLE_GUIDES: Record<UserRole, RoleGuideConfig> = {
  employee: {
    selectorIcon: <FileText className="h-5 w-5 text-emerald-600" />,
    selectorTitle: 'พนักงานทั่วไป (Employee)',
    selectorSubtitle: 'ยื่นเรื่อง & ติดตาม Timeline & CSAT',
    selectorActiveClass:
      'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-950',
    headerIconBoxClass: 'rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-600',
    headerIcon: <FileText className="h-6 w-6" />,
    headerTitle: 'คู่มือการใช้งานสำหรับพนักงาน (Employee User Guide)',
    headerSubtitle: 'ขั้นตอนการยื่นข้อร้องเรียน/ข้อเสนอแนะ การติดตามสถานะ และการประเมินความพึงพอใจ',
    launchLabel: 'ไปที่หน้ายื่นเรื่อง',
    launchClass:
      'flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700',
    launchTab: 'submit',
    gridClass: 'grid grid-cols-1 gap-4 md:grid-cols-2',
    Body: EmployeeGuideBody,
  },
  gatekeeper: {
    selectorIcon: <Shield className="h-5 w-5 text-indigo-600" />,
    selectorTitle: 'Gatekeeper ประจำฝ่าย',
    selectorSubtitle: 'รับเรื่อง ตรวจสอบ ลงพื้นที่ & แก้ไข',
    selectorActiveClass: 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20 text-indigo-950',
    headerIconBoxClass: 'rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-600',
    headerIcon: <Shield className="h-6 w-6" />,
    headerTitle: 'คู่มือสำหรับ Gatekeeper ประจำฝ่าย (Gatekeeper Portal Guide)',
    headerSubtitle:
      'แนวทางการคัดกรองเคส (Triage) การสื่อสารนิรนาม การออกรายงานผลสอบสวน และการบันทึกผลการแก้ไข',
    launchLabel: 'ไปที่ Gatekeeper Portal',
    launchClass:
      'flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700',
    launchTab: 'gatekeeper',
    gridClass: 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4',
    Body: GatekeeperGuideBody,
  },
  executive: {
    selectorIcon: <Crown className="h-5 w-5 text-purple-600" />,
    selectorTitle: 'ผู้บริหารระดับสูง (Executive)',
    selectorSubtitle: 'Dashboard, Insights & AI CAPA',
    selectorActiveClass: 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/20 text-purple-950',
    headerIconBoxClass: 'rounded-xl border border-purple-200 bg-purple-50 p-3 text-purple-600',
    headerIcon: <Crown className="h-6 w-6" />,
    headerTitle: 'คู่มือสำหรับผู้บริหาร (Executive Overview & AI CAPA Guide)',
    headerSubtitle:
      'การติดตามดัชนีชี้วัดภาพรวม การจัดการเคส Bypass และการใช้ AI วิเคราะห์สาเหตุต้นตอ',
    launchLabel: 'เปิดดู Dashboard ผู้บริหาร',
    launchClass:
      'flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-purple-700',
    launchTab: 'executive',
    gridClass: 'grid grid-cols-1 gap-4 md:grid-cols-3',
    Body: ExecutiveGuideBody,
  },
  admin: {
    selectorIcon: <Settings className="h-5 w-5 text-slate-700" />,
    selectorTitle: 'ผู้ดูแลระบบ (Admin)',
    selectorSubtitle: 'จัดสรร Gatekeeper & สิทธิ์ RBAC',
    selectorActiveClass: 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20 text-slate-950',
    headerIconBoxClass: 'rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-700',
    headerIcon: <Settings className="h-6 w-6" />,
    headerTitle: 'คู่มือสำหรับผู้ดูแลระบบ (Admin & RBAC Management Guide)',
    headerSubtitle:
      'การกำหนด Gatekeeper ประจำแต่ละหน่วยงาน การตั้งค่านโยบายจ่ายงาน และการควบคุมสิทธิ์',
    launchLabel: 'ไปที่หน้าตั้งค่า Admin',
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
                <span className="text-xs font-bold">{config.selectorTitle}</span>
              </div>
              <p className="text-[11px] text-slate-500">{config.selectorSubtitle}</p>
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
          title={guide.headerTitle}
          subtitle={guide.headerSubtitle}
        >
          <button type="button" onClick={handleLaunch} className={guide.launchClass}>
            <span>{guide.launchLabel}</span>
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
