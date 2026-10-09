import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowDiagram } from './WorkflowDiagram';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';

function LangToggle() {
  const { toggleLang } = useLanguage();
  return <button onClick={toggleLang}>toggle-lang</button>;
}

// userEvent-heavy tests are slow on busy CI agents
vi.setConfig({ testTimeout: 20000 });

beforeEach(() => {
  // the language preference persists in localStorage; start every test in Thai
  localStorage.clear();
});

const renderManual = (props: Partial<React.ComponentProps<typeof WorkflowDiagram>> = {}) => {
  const onNavigateTab = vi.fn();
  const onSwitchRole = vi.fn();
  render(
    <LanguageProvider>
      <WorkflowDiagram onNavigateTab={onNavigateTab} onSwitchRole={onSwitchRole} {...props} />
      <LangToggle />
    </LanguageProvider>
  );
  return { onNavigateTab, onSwitchRole, user: userEvent.setup({ delay: null }) };
};

const TAB_LABEL = {
  workflow: /^1\. ผังกระบวนการทำงาน 5 ขั้นตอน/,
  role_guides: /^2\. คู่มือการใช้งานแยกตามบทบาท/,
  sla_matrix: /^3\. มาตรฐานและขอบเขต 6 หมวดหมู่/,
  pdpa_security: /^4\. ความปลอดภัย & คุ้มครองข้อมูล/,
  faq: /^5\. คำถามที่พบบ่อย/,
};

const openTab = async (user: ReturnType<typeof userEvent.setup>, key: keyof typeof TAB_LABEL) =>
  user.click(screen.getByRole('button', { name: TAB_LABEL[key] }));

const stepHeading = (name: string) => screen.getByRole('heading', { level: 3, name });

const SEARCH_PLACEHOLDER = 'ค้นหาคำถาม / คีย์เวิร์ด...';

describe('WorkflowDiagram tabs', () => {
  it('renders the manual header and all five tab buttons', () => {
    renderManual();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'คู่มือและกระบวนการทำงานระบบรับเรื่องร้องเรียน'
    );
    for (const label of Object.values(TAB_LABEL)) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('shows the workflow tab first and switches through every other tab', async () => {
    const { user } = renderManual();

    const workflowHeading = 'ผังขั้นตอนการปฏิบัติงานแบบครบวงจร (End-to-End Workflow)';
    expect(screen.getByRole('heading', { level: 2, name: workflowHeading })).toBeInTheDocument();

    await openTab(user, 'role_guides');
    expect(screen.queryByRole('heading', { name: workflowHeading })).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'คู่มือการใช้งานสำหรับพนักงาน (Employee User Guide)' })
    ).toBeInTheDocument();

    await openTab(user, 'sla_matrix');
    expect(screen.queryByRole('heading', { name: /Employee User Guide/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'ตารางมาตรฐานและการจัดสรรผู้รับผิดชอบ 6 หมวดหมู่ (Category Matrix)',
      })
    ).toBeInTheDocument();

    await openTab(user, 'pdpa_security');
    expect(screen.queryByText('Enterprise Standards')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /นโยบายความปลอดภัยและการคุ้มครองข้อมูลส่วนบุคคล/ })
    ).toBeInTheDocument();
    expect(screen.getByText('PDPA Compliant')).toBeInTheDocument();

    await openTab(user, 'faq');
    expect(screen.queryByText('PDPA Compliant')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Frequently Asked Questions/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();

    await openTab(user, 'workflow');
    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: workflowHeading })).toBeInTheDocument();
  });

  it('keeps Thai copy free of SLA wording in every section', async () => {
    const { user } = renderManual();

    for (const key of Object.keys(TAB_LABEL) as (keyof typeof TAB_LABEL)[]) {
      await openTab(user, key);
      expect(document.body.textContent).not.toMatch(/SLA/);
    }
  });
});

describe('WorkflowDiagram workflow section', () => {
  it('selects a step card by click and by keyboard, updating the details panel', async () => {
    const { user } = renderManual();

    expect(stepHeading('1. พนักงานยื่นข้อร้องเรียน / ข้อเสนอแนะ')).toBeInTheDocument();
    expect(
      screen.getByText('ออกรหัสติดตามเฉพาะแบบถาวร (Tracking ID เช่น TK-2026-XXXX)')
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: /TRIAGE_ACTION/ }));
    expect(stepHeading('3. Gatekeeper ตรวจสอบและดำเนินการแก้ไข')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^1\. พนักงานยื่น/ })).not.toBeInTheDocument();
    expect(screen.getByText('เจ้าหน้าที่ Gatekeeper ประจำฝ่าย')).toBeInTheDocument();

    const executiveCard = screen.getByRole('button', { name: /EXECUTIVE_AI/ });
    expect(executiveCard).toHaveAttribute('tabindex', '0');
    executiveCard.focus();
    await user.keyboard('{Enter}');
    expect(stepHeading('5. ผู้บริหารวิเคราะห์ภาพรวม & AI จัดกลุ่มต้นตอ')).toBeInTheDocument();
    expect(screen.getByText('ผู้บริหารระดับสูง (CEO / EVP / GRC)')).toBeInTheDocument();

    const routingCard = screen.getByRole('button', { name: /ROUTING/ });
    routingCard.focus();
    await user.keyboard(' ');
    expect(stepHeading('2. ระบบคัดแยกและจ่ายงานอัตโนมัติ')).toBeInTheDocument();
  });

  it('ignores keys other than Enter and Space on a step card', async () => {
    const { user } = renderManual();

    screen.getByRole('button', { name: /FEEDBACK_LOOP/ }).focus();
    await user.keyboard('a');
    expect(stepHeading('1. พนักงานยื่นข้อร้องเรียน / ข้อเสนอแนะ')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /^4\. ติดตามผลและประเมินความพึงพอใจ/ })
    ).not.toBeInTheDocument();
  });

  it('launches the operational tab of the selected step and switches role', async () => {
    const { user, onNavigateTab, onSwitchRole } = renderManual();

    await user.click(screen.getByRole('button', { name: /เปิดใช้งานหน้านี้: ยื่นข้อร้องเรียน/ }));
    expect(onSwitchRole).toHaveBeenLastCalledWith('employee');
    expect(onNavigateTab).toHaveBeenLastCalledWith('submit');

    await user.click(screen.getByRole('button', { name: /TRIAGE_ACTION/ }));
    await user.click(screen.getByRole('button', { name: /เปิดใช้งานหน้านี้: Gatekeeper Triage/ }));
    expect(onSwitchRole).toHaveBeenLastCalledWith('gatekeeper');
    expect(onNavigateTab).toHaveBeenLastCalledWith('gatekeeper');
    expect(onNavigateTab).toHaveBeenCalledTimes(2);
  });

  it('launches without a role switcher when onSwitchRole is not provided', async () => {
    const { user, onNavigateTab } = renderManual({ onSwitchRole: undefined });

    await user.click(screen.getByRole('button', { name: /เปิดใช้งานหน้านี้/ }));
    expect(onNavigateTab).toHaveBeenCalledWith('submit');
  });

  it('highlights RACI cells according to each column rule', () => {
    renderManual();

    expect(screen.getByRole('columnheader', { name: 'ผู้ดูแลระบบ (Admin)' })).toBeInTheDocument();
    expect(screen.getByText('ยื่นคำร้อง / ข้อเสนอแนะ (Voice Submission)')).toBeInTheDocument();
    expect(screen.getAllByText('R (ผู้ทำ)')[0]).toHaveClass('bg-emerald-100');
    expect(screen.getByText('I (รับทราบ)')).toHaveClass('text-slate-500');
    expect(screen.getByText('A (รับมอบ)')).toHaveClass('bg-indigo-100');
    expect(screen.getByText('R/A (วิเคราะห์)')).toHaveClass('bg-purple-100');
    expect(screen.getByText('R/A (ตั้งค่า)')).toHaveClass('bg-slate-200');
    expect(screen.getByText('C (ดูแลระบบ)')).toHaveClass('text-slate-500');
    expect(screen.getByText('R/A (กำหนดสิทธิ์)')).toHaveClass('bg-slate-200');
    expect(screen.getByText(/Accountable \(ผู้รับผิดชอบผล\)/)).toBeInTheDocument();
  });
});

describe('WorkflowDiagram simulation', () => {
  const STAGE_TEXT = [
    'พนักงานกรอกข้อมูลผู้ยื่นเรื่อง',
    'ระบบคัดแยกเข้าสู่ทีม Gatekeeper ประจำฝ่าย',
    'Gatekeeper ประจำฝ่ายกดรับเรื่อง',
    'พนักงานได้รับแจ้งเตือน ตรวจสอบผลการแก้ไข',
    'ข้อมูลถูกส่งเข้า Executive Dashboard',
  ];

  it('walks the quality scenario through all five stages and completes the cycle', async () => {
    const { user } = renderManual();

    expect(screen.queryByText(/สถานะการจำลอง:/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'จำลองเคส Quality (QC)' }));

    expect(screen.getByText(/สถานะการจำลอง:/)).toBeInTheDocument();
    expect(screen.getByText(/🔍 ข้อร้องเรียนชิ้นงาน QC ผิดมาตรฐาน/)).toBeInTheDocument();

    for (let stage = 1; stage <= 5; stage++) {
      expect(screen.getByText(`ขั้นตอนที่ ${stage} จาก 5`)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`^${STAGE_TEXT[stage - 1]}`))).toBeInTheDocument();
      if (stage === 2) expect(screen.getByText(/Quality \(QA\/QC\)/)).toBeInTheDocument();
      if (stage < 5) {
        expect(screen.queryByText(/จบวงจรสมบูรณ์/)).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'ขั้นถัดไป' }));
        // the details panel follows the simulation stage
        expect(screen.getByText(`ขั้นตอนที่ ${stage + 1} / 5`)).toBeInTheDocument();
      }
    }

    expect(screen.getByText('จบวงจรสมบูรณ์ 🎉')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ขั้นถัดไป' })).not.toBeInTheDocument();
  });

  it('uses the Compliance department in the urgent PDPA scenario', async () => {
    const { user } = renderManual();

    await user.click(screen.getByRole('button', { name: 'จำลองเคสด่วน PDPA (Compliance)' }));
    expect(screen.getByText(/📋 ข้อร้องเรียนด่วน PDPA/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ขั้นถัดไป' }));
    expect(screen.getByText(/Compliance & Legal/)).toBeInTheDocument();
    expect(screen.queryByText(/Quality \(QA\/QC\)/)).not.toBeInTheDocument();
  });

  it('restarts from stage 1 when the other scenario is chosen mid-way', async () => {
    const { user } = renderManual();

    await user.click(screen.getByRole('button', { name: 'จำลองเคส Quality (QC)' }));
    await user.click(screen.getByRole('button', { name: 'ขั้นถัดไป' }));
    await user.click(screen.getByRole('button', { name: 'ขั้นถัดไป' }));
    expect(screen.getByText('ขั้นตอนที่ 3 จาก 5')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'จำลองเคสด่วน PDPA (Compliance)' }));
    expect(screen.getByText('ขั้นตอนที่ 1 จาก 5')).toBeInTheDocument();
    expect(screen.getByText(/📋 ข้อร้องเรียนด่วน PDPA/)).toBeInTheDocument();
  });

  it('resets the simulation and hides the status bar', async () => {
    const { user } = renderManual();

    await user.click(screen.getByRole('button', { name: 'จำลองเคส Quality (QC)' }));
    await user.click(screen.getByRole('button', { name: 'ขั้นถัดไป' }));
    expect(stepHeading('2. ระบบคัดแยกและจ่ายงานอัตโนมัติ')).toBeInTheDocument();

    await user.click(screen.getByTitle('รีเซ็ตการจำลอง'));
    expect(screen.queryByText(/สถานะการจำลอง:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ตัวอย่างสถานการณ์จำลอง:/)).not.toBeInTheDocument();
    expect(stepHeading('1. พนักงานยื่นข้อร้องเรียน / ข้อเสนอแนะ')).toBeInTheDocument();
  });

  it('returns to the workflow tab when a simulation starts from another tab', async () => {
    const { user } = renderManual();

    await openTab(user, 'faq');
    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'จำลองเคส Quality (QC)' }));
    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
    expect(screen.getByText(/สถานะการจำลอง:/)).toBeInTheDocument();
    expect(stepHeading('1. พนักงานยื่นข้อร้องเรียน / ข้อเสนอแนะ')).toBeInTheDocument();
  });
});

describe('WorkflowDiagram role guides', () => {
  const GUIDES = [
    {
      role: /พนักงานทั่วไป \(Employee\)/,
      heading: 'คู่มือการใช้งานสำหรับพนักงาน (Employee User Guide)',
      unique: 'การประเมินความพึงพอใจ (CSAT Evaluation)',
      launch: 'ไปที่หน้ายื่นเรื่อง',
      roleKey: 'employee',
      tab: 'submit',
    },
    {
      role: /Gatekeeper ประจำฝ่าย รับเรื่อง/,
      heading: 'คู่มือสำหรับ Gatekeeper ประจำฝ่าย (Gatekeeper Portal Guide)',
      unique: 'บันทึกผลการแก้ไข (Resolution)',
      launch: 'ไปที่ Gatekeeper Portal',
      roleKey: 'gatekeeper',
      tab: 'gatekeeper',
    },
    {
      role: /ผู้บริหารระดับสูง \(Executive\)/,
      heading: 'คู่มือสำหรับผู้บริหาร (Executive Overview & AI CAPA Guide)',
      unique: 'ดัชนีชี้วัดหลัก (Key Metrics)',
      launch: 'เปิดดู Dashboard ผู้บริหาร',
      roleKey: 'executive',
      tab: 'executive',
    },
    {
      role: /ผู้ดูแลระบบ \(Admin\) จัดสรร/,
      heading: 'คู่มือสำหรับผู้ดูแลระบบ (Admin & RBAC Management Guide)',
      unique: '2. ตั้งค่าโหมดการจ่ายงานอัตโนมัติ (Dispatch Policy)',
      launch: 'ไปที่หน้าตั้งค่า Admin',
      roleKey: 'admin',
      tab: 'admin_gatekeeper',
    },
  ];

  it('shows the employee guide by default, including the PDPA note', async () => {
    const { user } = renderManual();
    await openTab(user, 'role_guides');

    expect(
      screen.getByRole('heading', { name: 'คู่มือการใช้งานสำหรับพนักงาน (Employee User Guide)' })
    ).toBeInTheDocument();
    expect(screen.getByText('การคุ้มครองข้อมูลส่วนบุคคล (PDPA Protection)')).toBeInTheDocument();
    expect(screen.getByText('TK-2026-0881')).toBeInTheDocument();
    expect(screen.getByText(/ส่วนที่ 3:/)).toBeInTheDocument();
  });

  it.each(GUIDES)(
    'selects the guide for $roleKey and launches its page',
    async ({ role, heading, unique, launch, roleKey, tab }) => {
      const { user, onNavigateTab, onSwitchRole } = renderManual();
      await openTab(user, 'role_guides');

      await user.click(screen.getByRole('button', { name: role }));
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
      expect(screen.getByText(unique)).toBeInTheDocument();
      // only one guide is shown at a time
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);

      await user.click(screen.getByRole('button', { name: launch }));
      expect(onSwitchRole).toHaveBeenCalledWith(roleKey);
      expect(onNavigateTab).toHaveBeenCalledWith(tab);
    }
  );

  it('describes roster-based roles, SSO and read-only user management in the admin guide', async () => {
    const { user } = renderManual();
    await openTab(user, 'role_guides');
    await user.click(screen.getByRole('button', { name: /ผู้ดูแลระบบ \(Admin\) จัดสรร/ }));

    expect(screen.getByText('4. ใครได้บทบาทอะไร (รายชื่อผู้มีบทบาท)')).toBeInTheDocument();
    expect(screen.getByText(/ไม่มีตัวสลับบทบาท/)).toBeInTheDocument();
    expect(screen.getByText('6. จัดการผู้ใช้ (อ่านอย่างเดียว)')).toBeInTheDocument();
    expect(screen.getByText('7. ส่งออกข้อมูลและ SQL Query Studio')).toBeInTheDocument();
  });

  it('launches the guide target without a role switcher', async () => {
    const { user, onNavigateTab } = renderManual({ onSwitchRole: undefined });
    await openTab(user, 'role_guides');

    await user.click(screen.getByRole('button', { name: 'ไปที่หน้ายื่นเรื่อง' }));
    expect(onNavigateTab).toHaveBeenCalledWith('submit');
  });
});

describe('WorkflowDiagram category matrix and PDPA', () => {
  it('lists all six categories with their responsible unit', async () => {
    const { user } = renderManual();
    await openTab(user, 'sla_matrix');

    expect(screen.getAllByRole('row')).toHaveLength(7);
    expect(screen.getByRole('columnheader', { name: 'หน่วยงานรับผิดชอบหลัก' })).toBeInTheDocument();
    for (const name of [
      'HR – ทรัพยากรบุคคลและสวัสดิการ',
      'Compliance – การไม่ปฏิบัติตามกฎหมายและกฎเกณฑ์',
      'Ethics – จริยธรรม',
      'Fraud – การทุจริต และการฉ้อโกง',
      'Human Right, Harassment – สิทธิมนุษยชน, การล่วงละเมิด',
      'Quality Impropriety – การตรวจสอบคุณภาพอย่างไม่เหมาะสม',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByText('Forensic Audit & Special Investigation')).toBeInTheDocument();
    expect(screen.getByText('เคสสำคัญยิ่งยวด (Critical / Bypass)')).toBeInTheDocument();
  });

  it('lists the four PDPA safeguards', async () => {
    const { user } = renderManual();
    await openTab(user, 'pdpa_security');

    expect(
      screen.getByText('1. การจำกัดสิทธิ์เข้าถึงตามหน้าที่ (Role-Based Access Control)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('2. การบันทึกประวัติการดำเนินงาน (Audit Trail Logging)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('3. มาตรการส่งตรงถึงผู้บริหาร (CEO / EVP Direct Bypass)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('4. การเข้ารหัสและความปลอดภัยระดับระบบ (Enterprise Encryption)')
    ).toBeInTheDocument();
  });
});

describe('WorkflowDiagram FAQ', () => {
  const FIRST_ANSWER = /^ระบบจัดเก็บข้อมูลผู้ยื่นเรื่อง/;
  const SECOND_ANSWER = /^เป็นช่องทางพิเศษสำหรับกรณีที่ประเด็นมีความอ่อนไหวสูงมาก/;
  const questionButtons = () => screen.getAllByRole('button', { name: /\?$/ });

  it('expands the first question by default and toggles items', async () => {
    const { user } = renderManual();
    await openTab(user, 'faq');

    expect(questionButtons()).toHaveLength(9);
    expect(screen.getByText(FIRST_ANSWER)).toBeInTheDocument();
    expect(screen.queryByText(SECOND_ANSWER)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ช่องทางส่งตรงถึงผู้บริหาร/ }));
    expect(screen.getByText(SECOND_ANSWER)).toBeInTheDocument();
    expect(screen.queryByText(FIRST_ANSWER)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ช่องทางส่งตรงถึงผู้บริหาร/ }));
    expect(screen.queryByText(SECOND_ANSWER)).not.toBeInTheDocument();
  });

  it('filters by question or answer text, case-insensitively, and restores on clear', async () => {
    const { user } = renderManual();
    await openTab(user, 'faq');
    const search = screen.getByPlaceholderText(SEARCH_PLACEHOLDER);

    await user.type(search, 'tk-2026-0881');
    expect(questionButtons()).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: /รหัสติดตามคำร้อง \(Tracking Code\)/ })
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /ช่องทางส่งตรงถึงผู้บริหาร/ })
    ).not.toBeInTheDocument();

    await user.clear(search);
    expect(questionButtons()).toHaveLength(9);
  });

  it('explains how roles are assigned from the people rosters', async () => {
    const { user } = renderManual();
    await openTab(user, 'faq');

    await user.click(screen.getByRole('button', { name: /ฉันจะได้สิทธิ์ Gatekeeper/ }));
    expect(screen.getByText(/ไม่มีตัวสลับบทบาท/)).toBeInTheDocument();
    expect(screen.getByText(/บทบาทสูงสุดชนะ/)).toBeInTheDocument();
  });

  it('shows an empty state echoing the search term when nothing matches', async () => {
    const { user } = renderManual();
    await openTab(user, 'faq');

    expect(screen.queryByText(/ไม่พบคำถามที่ตรงกับคำค้นหา/)).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), 'zzzz-no-match');

    expect(screen.getByText(/ไม่พบคำถามที่ตรงกับคำค้นหา "zzzz-no-match"/)).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /\?$/ })).toHaveLength(0);
  });
});

describe('WorkflowDiagram language', () => {
  it('switches the tab labels, header and step details to English', async () => {
    const { user, onNavigateTab, onSwitchRole } = renderManual();

    expect(screen.queryByRole('button', { name: /^5\. FAQs/ })).not.toBeInTheDocument();
    await user.click(screen.getByText('toggle-lang'));

    for (const label of [
      /^1\. 5-Stage Workflow/,
      /^2\. Role Guides/,
      /^3\. 6 Categories & SLA Matrix/,
      /^4\. PDPA & Security/,
      /^5\. FAQs/,
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'System Manual & End-to-End Workflow'
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'End-to-End Workflow Flowchart' })
    ).toBeInTheDocument();
    expect(screen.getByText('5 Core Stages')).toBeInTheDocument();
    expect(stepHeading('1. Employee Voice Submission')).toBeInTheDocument();
    expect(screen.getByText('Stage 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Key Operational Actions:')).toBeInTheDocument();
    expect(screen.getByText('System Automations:')).toBeInTheDocument();
    expect(screen.getByText('Governance & Policies:')).toBeInTheDocument();
    expect(screen.getByText('Primary Role:')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /EXECUTIVE_AI/ }));
    expect(stepHeading('5. Executive Oversight & AI Root Cause Analytics')).toBeInTheDocument();
    expect(screen.getByText('executive', { selector: 'span.font-bold' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Launch: Dashboard & AI CAPA' }));
    expect(onSwitchRole).toHaveBeenCalledWith('executive');
    expect(onNavigateTab).toHaveBeenCalledWith('executive');
  });

  it('shows the simulation controls in English and finishes the cycle', async () => {
    const { user } = renderManual();
    await user.click(screen.getByText('toggle-lang'));

    expect(screen.queryByText(/Simulation Status:/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Simulate Urgent PDPA' }));
    expect(screen.getByText(/Simulation Status:/)).toBeInTheDocument();
    expect(screen.getByText('Stage 1 of 5', { selector: 'strong' })).toBeInTheDocument();

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: 'Next Stage' }));
    }
    expect(screen.getByText('Stage 5 of 5', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Cycle Completed 🎉')).toBeInTheDocument();

    await user.click(screen.getByTitle('Reset simulation'));
    expect(screen.queryByText(/Simulation Status:/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simulate Quality (QC)' })).toBeInTheDocument();
  });
});
