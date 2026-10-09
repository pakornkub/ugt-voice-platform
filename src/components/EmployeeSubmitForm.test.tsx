import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeSubmitForm } from './EmployeeSubmitForm';
import { LanguageProvider } from '../context/LanguageContext';
import { submitTicket } from '@/lib/actions/tickets';
import type { ComplaintTicket, EmployeeRecord } from '../types';
// The error Next.js throws when a page from an older deployment calls a Server Action.
import { UnrecognizedActionError } from 'next/dist/client/components/unrecognized-action-error';

// Server Action stand-in: echoes the payload back as the saved ticket.
vi.mock('@/lib/actions/tickets', () => ({ submitTicket: vi.fn() }));
vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_BASE_PATH: '/ugt-voice-platform' } }));
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

const fetchMock = vi.fn();
const okUpload = () => new Response(JSON.stringify({ success: true }), { status: 201 });
const memo = new File(['memo'], 'memo.pdf', { type: 'application/pdf' });
const photo = new File(['x'.repeat(2048)], 'photo.png', { type: 'image/png' });
const fileInput = () => byId('input-ticket-attachments') as HTMLInputElement;

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await fill(user, 'input-ticket-title', 'ปัญหาทดสอบ');
  await fill(user, 'input-ticket-description', 'รายละเอียดข้อเท็จจริงสำหรับการทดสอบระบบ');
}

function uploadedFileNames(): string[] {
  return fetchMock.mock.calls.map(([, init]) => ((init.body as FormData).get('file') as File).name);
}

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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.mocked(submitTicket).mockClear();
    fetchMock.mockImplementation(async () => okUpload());
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(submitTicket).mockImplementation(
      async (payload) =>
        ({
          ...payload,
          attachments: [],
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

  describe('attachments', () => {
    it('lists the chosen files with name and size and lets the user remove one before submit', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.upload(fileInput(), [memo, photo]);

      expect(screen.getByText('memo.pdf')).toBeInTheDocument();
      expect(screen.getByText('photo.png')).toBeInTheDocument();
      expect(screen.getByText('(2.0 KB)')).toBeInTheDocument();

      await user.click(screen.getAllByRole('button', { name: 'ลบไฟล์' })[0]);
      expect(screen.queryByText('memo.pdf')).toBeNull();
      expect(screen.getByText('photo.png')).toBeInTheDocument();
    });

    it('opens the real file picker from the attach button and the dashed drop zone', async () => {
      const user = userEvent.setup();
      renderForm();
      const clickSpy = vi.spyOn(fileInput(), 'click');

      await user.click(byId('btn-attach-file'));
      await user.click(screen.getByText(/คลิกเพื่อแนบไฟล์หลักฐาน/));

      expect(clickSpy).toHaveBeenCalledTimes(2);
      expect(fileInput().multiple).toBe(true);
    });

    it('never offers the old mock-file generator', () => {
      renderForm();
      expect(screen.queryByText(/จำลอง/)).toBeNull();
      expect(screen.getByText('+ แนบไฟล์')).toBeInTheDocument();
    });

    it('uploads every chosen file to the created ticket after submitTicket succeeds', async () => {
      const user = userEvent.setup();
      const { onTicketCreated } = renderForm();

      await fillRequired(user);
      await user.upload(fileInput(), [memo, photo]);
      await user.click(byId('btn-submit-ticket-final'));

      await waitFor(() => expect(onTicketCreated).toHaveBeenCalledTimes(1));
      // no fake attachment metadata goes into the ticket payload
      expect(vi.mocked(submitTicket).mock.calls[0][0]).not.toHaveProperty('attachments');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe('/ugt-voice-platform/api/files');
      for (const [, init] of fetchMock.mock.calls) {
        expect(init.method).toBe('POST');
        expect((init.body as FormData).get('ticketId')).toBe('tk-new');
      }
      expect(uploadedFileNames()).toEqual(['memo.pdf', 'photo.png']);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('does not upload a file that was removed before submit', async () => {
      const user = userEvent.setup();
      const { onTicketCreated } = renderForm();

      await fillRequired(user);
      await user.upload(fileInput(), [memo, photo]);
      await user.click(screen.getAllByRole('button', { name: 'ลบไฟล์' })[0]);
      await user.click(byId('btn-submit-ticket-final'));

      await waitFor(() => expect(onTicketCreated).toHaveBeenCalledTimes(1));
      expect(uploadedFileNames()).toEqual(['photo.png']);
    });

    it('makes no upload request when nothing was attached', async () => {
      const user = userEvent.setup();
      const { onTicketCreated } = renderForm();

      await fillRequired(user);
      await user.click(byId('btn-submit-ticket-final'));

      await waitFor(() => expect(onTicketCreated).toHaveBeenCalledTimes(1));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('keeps the ticket and names the file that failed to attach', async () => {
      const user = userEvent.setup();
      fetchMock
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ success: false, error: { code: 'FILE_TOO_LARGE', maxMb: 25 } }),
            { status: 413 }
          )
        )
        .mockResolvedValueOnce(okUpload());
      const { onTicketCreated } = renderForm();

      await fillRequired(user);
      await user.upload(fileInput(), [memo, photo]);
      await user.click(byId('btn-submit-ticket-final'));

      const notice = await screen.findByRole('alert');
      expect(notice).toHaveTextContent('แนบไฟล์ไม่สำเร็จ: memo.pdf');
      expect(notice).toHaveTextContent('ไฟล์มีขนาดเกิน 25 MB');
      expect(notice).not.toHaveTextContent('photo.png');
      // the ticket is created and its success screen is shown regardless
      expect(onTicketCreated).toHaveBeenCalledTimes(1);
      expect(screen.getByText('TK-2026-1234')).toBeInTheDocument();
    });

    it('retries only the failed files and clears the notice when they go through', async () => {
      const user = userEvent.setup();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      renderForm();

      await fillRequired(user);
      await user.upload(fileInput(), [memo]);
      await user.click(byId('btn-submit-ticket-final'));
      await screen.findByRole('alert');

      await user.click(byId('btn-retry-attachments'));

      await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(uploadedFileNames()).toEqual(['memo.pdf', 'memo.pdf']);
    });

    it('starts a fresh form (no files, no notice) after "submit another"', async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
      renderForm();

      await fillRequired(user);
      await user.upload(fileInput(), [memo]);
      await user.click(byId('btn-submit-ticket-final'));
      await screen.findByRole('alert');

      await user.click(byId('btn-submit-another'));

      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText('memo.pdf')).toBeNull();
    });

    it('asks for name and employee ID before submitting an identified ticket', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
      renderForm();

      await fillRequired(user);
      await user.clear(byId('input-submitter-id'));
      await fill(user, 'input-submitter-id', ' '); // whitespace passes the native required check
      await user.click(byId('btn-submit-ticket-final'));

      expect(alertSpy).toHaveBeenCalledWith('กรุณาระบุชื่อ-นามสกุลและรหัสพนักงานผู้ยื่นเรื่อง');
      expect(vi.mocked(submitTicket)).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });
  });

  describe('a page from before a redeploy (Server Action not found)', () => {
    beforeEach(() => sessionStorage.clear());

    it('keeps the typed draft and offers a reload instead of a generic failure', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(submitTicket).mockRejectedValueOnce(
        new UnrecognizedActionError('Server Action "x" was not found on the server.')
      );
      renderForm();
      await fillRequired(user);
      await user.click(byId('btn-submit-ticket-final'));

      await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
      expect(confirmSpy.mock.calls[0][0]).toContain('ระบบเพิ่งอัปเดตเป็นเวอร์ชันใหม่');
      expect(alertSpy).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('voiceplatform_submit_draft_v1')).toContain('ปัญหาทดสอบ');
      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('brings the saved draft back after the reload', async () => {
      sessionStorage.setItem(
        'voiceplatform_submit_draft_v1',
        JSON.stringify({
          submissionType: 'complaint',
          category: 'HR',
          urgency: 'Medium',
          title: 'ร่างที่เก็บไว้',
          description: 'รายละเอียดที่พิมพ์ไว้ก่อนโหลดใหม่',
          locationOrUnit: 'ระยอง',
          isDirectToExecutive: false,
          identityChoice: 'identified',
          submitterPhone: '081-111-2222',
        })
      );
      renderForm();
      await waitFor(() => expect(byId('input-ticket-title')).toHaveValue('ร่างที่เก็บไว้'));
      expect(byId('input-ticket-description')).toHaveValue('รายละเอียดที่พิมพ์ไว้ก่อนโหลดใหม่');
      expect(sessionStorage.getItem('voiceplatform_submit_draft_v1')).toBeNull();
    });
  });
});
