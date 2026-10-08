import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvestigationReportModal } from './InvestigationReportModal';
import { LanguageProvider } from '../context/LanguageContext';
import { INITIAL_COMPLAINTS } from '../mockData';
import type { ComplaintTicket } from '../types';

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
});
