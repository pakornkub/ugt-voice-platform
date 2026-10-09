import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvestigationReportModal } from './InvestigationReportModal';
import { LanguageProvider } from '../context/LanguageContext';
import { CATEGORY_DEFINITIONS, INITIAL_COMPLAINTS } from '../mockData';
import type { ComplaintTicket } from '../types';

// The phrase table is another module's job; here it only has to be called with the active language.
vi.mock('../services/serverText', () => ({
  localizeServerText: (text: string | null | undefined, lang: string) =>
    text && lang === 'en' ? `EN:${text}` : (text ?? ''),
}));

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const baseTicket = INITIAL_COMPLAINTS.find((t) => !!t.evaluation) as ComplaintTicket;

function renderReport(ticket: ComplaintTicket | null = baseTicket) {
  const onClose = vi.fn();
  const view = render(
    <LanguageProvider>
      <InvestigationReportModal ticket={ticket} onClose={onClose} />
    </LanguageProvider>
  );
  return { onClose, ...view };
}

describe('InvestigationReportModal', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('renders nothing without a ticket', () => {
    const { container } = renderReport(null);
    expect(container).toBeEmptyDOMElement();
    expect(byId('printable-investigation-report')).toBeNull();
  });

  it('portals the report into <body> so print CSS can isolate it', () => {
    const { container } = renderReport();

    expect(container).toBeEmptyDOMElement();
    const root = byId('printable-investigation-report').closest('.print-report-root');
    expect(root?.parentElement).toBe(document.body);
    expect(screen.getAllByText(baseTicket.trackingCode).length).toBeGreaterThan(0);
  });

  it('prints through window.print and closes through the close button', async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const { onClose } = renderReport();

    await user.click(byId('btn-print-report'));
    await user.click(byId('btn-close-report-modal'));

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('copies the text summary to the clipboard and flips the button label', async () => {
    const user = userEvent.setup();
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText');
    renderReport();

    await user.click(byId('btn-copy-report-summary'));

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const text = writeSpy.mock.calls[0][0];
    expect(text).toContain(baseTicket.trackingCode);
    expect(text).toContain('INVESTIGATION SUMMARY REPORT');
    expect(text).toContain('6. ผลการประเมินความพึงพอใจ');
    expect(byId('btn-copy-report-summary')).toHaveTextContent('คัดลอกแล้ว');
  });

  it.each([
    ['anonymous', 'ไม่ระบุตัวตน (100% Anonymous Protected)'],
    ['confidential_restricted', 'ปกปิดตัวตนพิเศษ (Confidential Restricted)'],
    ['standard_named', 'ระบุตัวตน (Standard Named)'],
  ] as const)('shows the %s protection badge', (confidentiality, label) => {
    renderReport({ ...baseTicket, confidentiality });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('omits the CSAT section when the ticket has no evaluation', () => {
    renderReport({ ...baseTicket, evaluation: undefined });
    expect(screen.queryByText(/CSAT Verification/)).not.toBeInTheDocument();
  });

  describe('English UI', () => {
    const THAI = /[\u0E00-\u0E7F]/;
    // Ticket data stays as entered; use English data so any Thai left over is untranslated UI.
    const englishTicket: ComplaintTicket = {
      ...baseTicket,
      title: 'Overdue reimbursement',
      description: 'Claims take too long.',
      locationOrUnit: 'Plant 2',
      submitterName: 'Somchai',
      submitterDepartment: 'Finance',
      assignedOfficerName: 'Officer One',
      gatekeeperDepartment: 'Finance Dept',
      rootCauseSummary: 'Manual approvals',
      preventiveActionPlan: 'Automate approvals',
      resolutionSummary: 'Resolved by automation',
      rootCauseCategory: 'Process',
      attachments: [],
      evaluation: { ...baseTicket.evaluation!, feedbackComment: 'Great service.' },
      timeline: [
        {
          id: 'log-1',
          timestamp: '2026-09-01T03:00:00.000Z',
          action: 'ยื่นเรื่อง',
          actor: 'ระบบ',
          actorRole: 'ระบบอัตโนมัติ',
          status: 'submitted',
          notes: 'หมายเหตุ',
        },
      ],
    };

    const renderEnglish = async (ticket: ComplaintTicket = englishTicket) => {
      localStorage.setItem('voiceplatform_lang_preference_v2', 'en');
      const view = renderReport(ticket);
      await screen.findByText('Case Identification & Classification');
      return view;
    };

    it('renders the whole printed report without Thai UI text', async () => {
      await renderEnglish();

      const report = byId('printable-investigation-report');
      // Only the fixed signatory names (people, not UI copy) and the mapper-wrapped rows stay Thai.
      const text = (report.textContent ?? '')
        .replaceAll('ภานุมาศ สัจจาภิรมย์', '')
        .replaceAll('ดร. ปิยะวัฒน์ วิเชียรเกื้อ', '')
        .replaceAll('มนตรี ธนบดีกุล', '')
        .replaceAll(/EN:\S+/g, '');
      expect(text).not.toMatch(THAI);
      expect(report).toHaveTextContent('Witness & Privacy Protection');
      expect(report).toHaveTextContent('Chronological Audit Trail');
      expect(report).toHaveTextContent('Print date:');
      expect(report).toHaveTextContent('Chair, Audit & Governance Committee (GRC)');
    });

    it('shows English status, urgency, risk and category in the case profile', async () => {
      await renderEnglish();

      const report = byId('printable-investigation-report');
      expect(report).toHaveTextContent(/Current Status:\s*Closed/);
      expect(report).toHaveTextContent(CATEGORY_DEFINITIONS[englishTicket.category].nameEn);
      expect(report).toHaveTextContent(/Risk Level:\s*(Low|Moderate|High|Severe) Risk/);
      expect(report).toHaveTextContent(/Urgency Level:\s*\S*\s*(Low|Medium|High|Critical)/);
    });

    it('localises the toolbar, tooltips and the CSAT block', async () => {
      await renderEnglish();

      expect(byId('btn-copy-report-summary')).toHaveAttribute('title', 'Copy summary text');
      expect(byId('btn-close-report-modal')).toHaveAttribute('aria-label', 'Close report');
      expect(screen.getByText('CSAT Verification')).toBeInTheDocument();
      expect(screen.getByText('Overall Service')).toBeInTheDocument();
      expect(screen.getByText('3. Service Manner')).toBeInTheDocument();
    });

    it('runs the timeline text through localizeServerText with the active language', async () => {
      await renderEnglish();

      const table = screen.getByRole('table');
      expect(within(table).getByText('EN:ยื่นเรื่อง')).toBeInTheDocument();
      expect(within(table).getByText('EN:หมายเหตุ')).toBeInTheDocument();
      expect(within(table).getByText('(EN:ระบบอัตโนมัติ)')).toBeInTheDocument();
      expect(within(table).getByText('Submitted')).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: 'Action & Notes' })
      ).toBeInTheDocument();
    });

    it.each([
      ['anonymous', '100% Anonymous Protected'],
      ['confidential_restricted', 'Confidential Restricted'],
      ['standard_named', 'Standard Named'],
    ] as const)('shows the %s protection badge in English', async (confidentiality, label) => {
      await renderEnglish({ ...englishTicket, confidentiality });
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('describes who submitted a named request in English', async () => {
      await renderEnglish({ ...englishTicket, confidentiality: 'standard_named' });
      expect(
        screen.getByText(/^Submitter: Somchai \(.+\) - Department: Finance$/)
      ).toBeInTheDocument();
    });

    it('copies an all-English summary to the clipboard', async () => {
      const user = userEvent.setup();
      const writeSpy = vi.spyOn(navigator.clipboard, 'writeText');
      await renderEnglish();

      await user.click(byId('btn-copy-report-summary'));

      const text = writeSpy.mock.calls[0][0];
      expect(text).not.toMatch(THAI);
      expect(text).toContain('INVESTIGATION SUMMARY REPORT');
      expect(text).toContain('Document No.:');
      expect(text).toContain('1. Request Information');
      expect(text).toContain('3. Investigation Findings and Root Cause');
      expect(text).toContain('4. Corrective and Preventive Actions (CAPA)');
      expect(text).toMatch(/6\. Satisfaction evaluation: \d(\.\d)?\/5 stars \(Speed: /);
      expect(text).toContain('Certified by the Governance & Witness Protection Task Force');
      expect(byId('btn-copy-report-summary')).toHaveTextContent('Copied!');
    });

    it('uses the English placeholders when the investigation fields are empty', async () => {
      const user = userEvent.setup();
      const writeSpy = vi.spyOn(navigator.clipboard, 'writeText');
      await renderEnglish({
        ...englishTicket,
        evaluation: undefined,
        locationOrUnit: undefined,
        assignedOfficerName: undefined,
        gatekeeperDepartment: '',
        rootCauseCategory: undefined,
        rootCauseSummary: undefined,
        resolutionSummary: undefined,
        preventiveActionPlan: undefined,
      });

      await user.click(byId('btn-copy-report-summary'));

      const text = writeSpy.mock.calls[0][0];
      expect(text).not.toMatch(THAI);
      expect(text).toContain('Not specified');
      expect(text).toContain('Gatekeeper task force');
      expect(text).toContain('Being classified');
      expect(text).toContain('Fact-finding investigation in progress');
      expect(text).toContain('Proceed with measures per SOP');
      expect(
        screen.getByText('The final investigation summary is being compiled')
      ).toBeInTheDocument();
      expect(
        screen.getByText('(Senior Legal Officer / Investigating Officer)')
      ).toBeInTheDocument();
    });
  });
});
