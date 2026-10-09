import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeSubmitForm } from './EmployeeSubmitForm';
import { LanguageProvider } from '../context/LanguageContext';
import { submitTicket } from '@/lib/actions/tickets';
import type { ComplaintTicket, EmployeeRecord } from '../types';

// Server Action stand-in: echoes the payload back as the saved ticket.
vi.mock('@/lib/actions/tickets', () => ({ submitTicket: vi.fn() }));
vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  suggestCategoryWithAI: vi.fn().mockResolvedValue({
    suggestedCategory: 'Fraud',
    secondaryCategory: 'Compliance',
    confidence: 91,
    reasoning: 'พบคำที่เกี่ยวข้องกับการทุจริต',
    keywords: ['ทุจริต'],
    suggestedUrgency: 'Critical',
  }),
}));

const byId = (id: string) => document.getElementById(id) as HTMLElement;

// paste instead of typing key-by-key: keeps these form tests fast under CPU load
async function fill(user: ReturnType<typeof userEvent.setup>, id: string, text: string) {
  await user.click(byId(id));
  await user.paste(text);
}

// the form is large; full-suite runs with coverage on a loaded CI box need headroom
vi.setConfig({ testTimeout: 20000 });

const ME: EmployeeRecord = {
  employeeId: '01234',
  nameTh: 'ปกรณ์ ทดสอบ',
  nameEn: 'Pakorn Test',
  loginEmail: 'pakorn.t@ube.co.th',
  department: 'ไอที',
  position: 'Developer',
  phone: '',
  status: 'active',
};

function renderForm() {
  const onTicketCreated = vi.fn();
  const onOpenTracking = vi.fn();
  render(
    <LanguageProvider>
      <EmployeeSubmitForm
        onTicketCreated={onTicketCreated}
        onOpenTracking={onOpenTracking}
        currentEmployee={ME}
      />
    </LanguageProvider>
  );
  return { onTicketCreated, onOpenTracking };
}

describe('EmployeeSubmitForm', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(submitTicket).mockImplementation(
      async (payload) =>
        ({
          ...payload,
          id: 'tk-new',
          trackingCode: 'TK-2026-1234',
          status: 'submitted',
          timeline: [],
          anonymousMessages: [],
          createdAt: '2026-10-09T00:00:00.000Z',
          updatedAt: '2026-10-09T00:00:00.000Z',
        }) as ComplaintTicket
    );
  });

  it('prefills the submitter from the signed-in person, not a demo employee', () => {
    renderForm();
    expect(byId('input-submitter-name')).toHaveValue('ปกรณ์ ทดสอบ');
    expect(byId('input-submitter-id')).toHaveValue('01234');
    expect(byId('input-submitter-email')).toHaveValue('pakorn.t@ube.co.th');
    expect(screen.queryByText(/สมชาย/)).toBeNull();
  });

  it('renders in Thai by default', () => {
    renderForm();
    expect(screen.getByText('ยื่นข้อร้องเรียน / ข้อเสนอแนะพนักงาน')).toBeInTheDocument();
  });

  it('shows English copy when the stored language preference is en', async () => {
    localStorage.setItem('voiceplatform_lang_preference_v2', 'en');
    renderForm();
    expect(await screen.findByText('Submit Grievance / Suggestion')).toBeInTheDocument();
  });

  it('offers the six upstream categories and four urgency levels', () => {
    renderForm();
    const select = byId('select-grievance-category') as HTMLSelectElement;
    expect(select.options).toHaveLength(6);
    for (const level of ['low', 'medium', 'high', 'critical']) {
      expect(byId(`urgency-btn-${level}`)).not.toBeNull();
    }
  });

  it('blocks submission when title/description are blank', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const { onTicketCreated } = renderForm();

    // `required` stops the native submit on empty values; whitespace passes it but not the handler
    await fill(user, 'input-ticket-title', ' ');
    await fill(user, 'input-ticket-description', ' ');
    await user.click(byId('btn-submit-ticket-final'));

    expect(alertSpy).toHaveBeenCalled();
    expect(onTicketCreated).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('submits an identified ticket and shows the success screen with the tracking code', async () => {
    const user = userEvent.setup();
    const { onTicketCreated, onOpenTracking } = renderForm();

    await fill(user, 'input-ticket-title', 'ปัญหาทดสอบ');
    await fill(user, 'input-ticket-description', 'รายละเอียดข้อเท็จจริงสำหรับการทดสอบระบบ');
    await user.click(byId('btn-submit-ticket-final'));

    await waitFor(() => expect(onTicketCreated).toHaveBeenCalledTimes(1));
    const created = onTicketCreated.mock.calls[0][0];
    expect(created.confidentiality).toBe('standard_named');
    expect(created.urgency).toBe('Medium');
    expect(await screen.findByText(created.trackingCode)).toBeInTheDocument();

    await user.click(byId('btn-view-timeline-now'));
    expect(onOpenTracking).toHaveBeenCalledWith(created.trackingCode);
  });

  it('submits as anonymous with the chosen urgency', async () => {
    const user = userEvent.setup();
    const { onTicketCreated } = renderForm();

    await user.click(byId('btn-choice-anonymous'));
    await user.click(byId('urgency-btn-critical'));
    await fill(user, 'input-ticket-title', 'เรื่องลับ');
    await fill(user, 'input-ticket-description', 'รายละเอียดลับ');
    await user.click(byId('btn-submit-ticket-final'));

    await waitFor(() => expect(onTicketCreated).toHaveBeenCalledTimes(1));
    const created = onTicketCreated.mock.calls[0][0];
    expect(created.confidentiality).toBe('anonymous');
    expect(created.urgency).toBe('Critical');
  });

  it('tells the user and stays on the form when saving fails', async () => {
    const user = userEvent.setup();
    vi.mocked(submitTicket).mockRejectedValueOnce(new Error('UNAUTHORIZED'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const { onTicketCreated } = renderForm();

    await fill(user, 'input-ticket-title', 'ปัญหาทดสอบ');
    await fill(user, 'input-ticket-description', 'รายละเอียด');
    await user.click(byId('btn-submit-ticket-final'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('ไม่สามารถบันทึกคำร้องได้ กรุณาลองใหม่อีกครั้ง')
    );
    expect(onTicketCreated).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('asks for content first when the AI category helper runs on an empty form', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(byId('btn-ai-category-suggest'));

    expect(
      await screen.findByText(/กรุณากรอกหัวข้อเรื่องหรือรายละเอียดข้อเท็จจริงก่อน/)
    ).toBeInTheDocument();
  });

  it('shows the AI category suggestion and applies it to the category select', async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, 'input-ticket-title', 'สงสัยทุจริตจัดซื้อ');
    await user.click(byId('btn-ai-category-suggest'));
    await user.click(await screen.findByRole('button', { name: /นำหมวดหมู่นี้ไปใช้/ }));

    await waitFor(() =>
      expect((byId('select-grievance-category') as HTMLSelectElement).value).toBe('Fraud')
    );
  });
});
