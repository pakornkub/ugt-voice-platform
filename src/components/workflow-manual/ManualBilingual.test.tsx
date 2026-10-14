import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowDiagram } from '../WorkflowDiagram';
import { LanguageProvider } from '../../context/LanguageContext';
import { FAQ_ITEMS, RACI_DATA, SLA_MATRIX_DATA } from './manualData';
import type { Bilingual } from './types';
import { WORKFLOW_STEPS } from './workflowSteps';

// userEvent-heavy tests are slow on busy CI agents
vi.setConfig({ testTimeout: 20000 });

const THAI = /[฀-๿]/;

beforeEach(() => {
  localStorage.clear();
});

const renderManual = (lang: 'th' | 'en') => {
  localStorage.setItem('voiceplatform_lang_preference_v2', lang);
  render(
    <LanguageProvider>
      <WorkflowDiagram onNavigateTab={vi.fn()} onSwitchRole={vi.fn()} />
    </LanguageProvider>
  );
  return userEvent.setup({ delay: null });
};

const openAdminGuide = async (user: ReturnType<typeof userEvent.setup>, tabName: RegExp) => {
  await user.click(screen.getByRole('button', { name: tabName }));
  await user.click(screen.getByRole('button', { name: /^(ผู้ดูแลระบบ \(Admin\)|Admin) / }));
};

describe('dispatch wording (one rule, mail to every GK)', () => {
  it('describes the Lead + every-GK rule in Thai on stage 2', async () => {
    const user = renderManual('th');
    await user.click(screen.getByRole('button', { name: /ROUTING/ }));

    expect(
      screen.getByText(/ใช้กติกาเดียวทุกหมวด — GK คนใดก็เปลี่ยนผู้รับผิดชอบได้/)
    ).toBeVisible();
    expect(
      screen.getByText(/เรื่องที่ส่งตรง CEO\/EVP จะใส่ชื่อหัวหน้าเฉพาะเมื่อเปิดสิทธิ์/)
    ).toBeVisible();
    expect(screen.getByText('ส่งอีเมลแจ้งงานใหม่ถึง GK ทุกคนในหมวดทันที')).toBeVisible();
    expect(screen.getByText(/รายการของ "System"/)).toBeVisible();
    expect(screen.queryByText(/Round Robin/)).toBeNull();
  });

  it('describes the Lead + every-GK rule in English on stage 2', async () => {
    const user = renderManual('en');
    await user.click(screen.getByRole('button', { name: /ROUTING/ }));

    expect(
      screen.getByText(/one rule for every category; any Gatekeeper can re-assign/)
    ).toBeVisible();
    expect(
      screen.getByText('Immediately emails every Gatekeeper of the category about the new case.')
    ).toBeVisible();
    expect(screen.getByText(/appears in the Timeline as a "System" entry/)).toBeVisible();
    expect(screen.queryByText(/Workload Balanced/)).toBeNull();
  });

  it('documents the rule on the Thai Admin guide card', async () => {
    const user = renderManual('th');
    await openAdminGuide(user, /^2. คู่มือการใช้งานแยกตามบทบาท/);

    expect(
      screen.getByRole('heading', {
        level: 4,
        name: '2. การจ่ายงานเรื่องใหม่ (ใช้กติกาเดียวทุกหมวด)',
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/ส่งอีเมลแจ้ง GK ทุกคนในหมวดนั้น/)).toBeInTheDocument();
    expect(screen.getByText(/รายการจาก "System"/)).toBeInTheDocument();
  });

  it('documents the rule on the English Admin guide card', async () => {
    const user = renderManual('en');
    await openAdminGuide(user, /^2. Role Guides/);

    expect(
      screen.getByRole('heading', {
        level: 4,
        name: '2. How new cases are dispatched (one rule for every category)',
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/emails every Gatekeeper of that category/)).toBeInTheDocument();
    expect(
      screen.getByText(/appears in the case timeline as a "System" entry/)
    ).toBeInTheDocument();
  });
});

describe('manual in English', () => {
  it('shows the workflow tab and the RACI matrix without any Thai', async () => {
    const user = renderManual('en');

    expect(document.body.textContent).not.toMatch(THAI);
    expect(
      screen.getByText(/The employee identifies themselves, picks a type and category/)
    ).toBeInTheDocument();
    expect(screen.getAllByText('1–3 minutes').length).toBeGreaterThan(0);
    expect(screen.getByText('Choose the request type: "Complaint" or "Suggestion".')).toBeVisible();
    expect(screen.getByText('Submitting employee', { selector: 'span.font-bold' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Launch: Submit Grievance / Suggestion' })
    ).toBeInTheDocument();

    expect(screen.getByRole('columnheader', { name: 'Workflow Process' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Department Gatekeeper' })).toBeInTheDocument();
    expect(screen.getByText('Voice Submission')).toBeInTheDocument();
    expect(screen.getAllByText('R (Performs)')[0]).toHaveClass('bg-emerald-100');
    expect(screen.getByText('A (Takes over)')).toHaveClass('bg-indigo-100');
    expect(screen.getByText('R/A (Analyzes)')).toHaveClass('bg-purple-100');
    expect(screen.getByText('I (Informed)')).toHaveClass('text-slate-500');

    await user.click(screen.getByRole('button', { name: /FEEDBACK_LOOP/ }));
    expect(screen.getByText('1–2 days after the case is resolved')).toBeInTheDocument();
    expect(screen.getByText('Confirm to formally close the case (Status: Closed).')).toBeVisible();
    expect(document.body.textContent).not.toMatch(THAI);
  });

  it('shows the simulation scenario text in English', async () => {
    const user = renderManual('en');

    await user.click(screen.getByRole('button', { name: 'Simulate Quality (QC)' }));
    expect(screen.getByText(/Simulated scenario:/)).toHaveTextContent(
      'Complaint: QC work product below standard'
    );
    expect(screen.getByText(/^The employee fills in their details/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next Stage' }));
    expect(
      screen.getByText(/routes the case to the Quality \(QA\/QC\) department Gatekeeper team/)
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(THAI);
  });

  it('shows every role guide without any Thai', async () => {
    const user = renderManual('en');
    await user.click(screen.getByRole('button', { name: /^2\. Role Guides/ }));

    expect(screen.getByRole('heading', { level: 2, name: 'Employee User Guide' })).toBeVisible();
    expect(screen.getByText('Filling in the submission form (5 main parts)')).toBeInTheDocument();
    expect(screen.getByText(/Part 3:/)).toBeInTheDocument();
    expect(screen.getByText('Personal Data Protection (PDPA Protection)')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(THAI);

    const guides = [
      { button: /^Department Gatekeeper/, heading: 'Gatekeeper Portal Guide' },
      { button: /^Executive /, heading: 'Executive Overview & AI CAPA Guide' },
      { button: /^Admin /, heading: 'Admin & RBAC Management Guide' },
    ];
    for (const guide of guides) {
      await user.click(screen.getByRole('button', { name: guide.button }));
      expect(screen.getByRole('heading', { level: 2, name: guide.heading })).toBeVisible();
      expect(document.body.textContent).not.toMatch(THAI);
    }
    expect(screen.getByText('7. Data export and SQL Query Studio')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Go to the Admin settings page' })
    ).toBeInTheDocument();
  });

  it('shows the category matrix without any Thai', async () => {
    const user = renderManual('en');
    await user.click(screen.getByRole('button', { name: /^3\. 6 Categories/ }));

    expect(screen.getAllByRole('row')).toHaveLength(7);
    expect(
      screen.getByRole('columnheader', { name: 'Primary responsible unit' })
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Recommended urgency' })).toBeInTheDocument();
    expect(screen.getByText('HR – Human Resources & Welfare')).toBeInTheDocument();
    expect(screen.getByText('Fraud – Corruption & Fraud')).toBeInTheDocument();
    expect(screen.getByText('Critical / Bypass cases')).toBeInTheDocument();
    expect(screen.getByText(/^Money laundering, insider trading/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(THAI);
  });

  it('shows the PDPA safeguards without any Thai', async () => {
    const user = renderManual('en');
    await user.click(screen.getByRole('button', { name: /^4\. PDPA & Security/ }));

    expect(
      screen.getByRole('heading', {
        name: 'Security & Personal Data Protection Policy (PDPA & Data Governance)',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('1. Role-Based Access Control')).toBeInTheDocument();
    expect(screen.getByText('2. Audit Trail Logging')).toBeInTheDocument();
    expect(screen.getByText('PDPA Compliant')).toBeInTheDocument();
    expect(screen.getByText(/Attachments are never public links/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(THAI);
  });

  it('shows, searches and toggles the FAQ in English', async () => {
    const user = renderManual('en');
    await user.click(screen.getByRole('button', { name: /^5\. FAQs/ }));

    const questionButtons = () => screen.getAllByRole('button', { name: /\?$/ });
    expect(questionButtons()).toHaveLength(9);
    expect(
      screen.getByRole('heading', { name: 'Frequently Asked Questions (FAQ)' })
    ).toBeInTheDocument();
    expect(screen.getByText(/^The system stores submitter details/)).toBeInTheDocument();

    const search = screen.getByPlaceholderText('Search questions / keywords...');
    await user.type(search, 'tk-2026-0881');
    expect(questionButtons()).toHaveLength(1);
    expect(screen.getByRole('button', { name: /How do I use the Tracking Code\?/ })).toBeVisible();

    await user.clear(search);
    await user.type(search, 'zzzz-no-match');
    expect(screen.getByText(/No questions match the search "zzzz-no-match"/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(THAI);

    await user.clear(search);
    await user.click(screen.getByRole('button', { name: /How do I get Gatekeeper/ }));
    expect(screen.getByText(/there is no role switcher/)).toBeInTheDocument();
    expect(screen.getByText(/the highest role wins/)).toBeInTheDocument();
  });
});

describe('manual content tables', () => {
  const allPairs = (): Bilingual[] => [
    ...WORKFLOW_STEPS.flatMap((s) => [
      s.shortDesc,
      s.actorTitle,
      s.targetTabLabel,
      s.durationEst,
      s.rulesAndSla,
      ...s.keyActions,
      ...s.systemAutomations,
    ]),
    ...SLA_MATRIX_DATA.flatMap((r) => [r.name, r.description]),
    ...RACI_DATA.flatMap((r) => [r.process, r.employee, r.gatekeeper, r.executive, r.admin]),
    ...FAQ_ITEMS.flatMap((f) => [f.q, f.a]),
  ];

  it('has a non-empty English variant without Thai characters for every entry', () => {
    const pairs = allPairs();
    expect(pairs.length).toBeGreaterThan(100);
    for (const pair of pairs) {
      expect(pair.en.trim()).not.toBe('');
      expect(pair.en).not.toMatch(THAI);
    }
  });

  it('keeps Thai text in the Thai variant unless the two languages share the same wording', () => {
    for (const pair of allPairs()) {
      if (pair.en !== pair.th) expect(pair.th).toMatch(THAI);
    }
  });
});
