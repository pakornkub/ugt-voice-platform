import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeSubmitForm } from '../EmployeeSubmitForm';
import { LanguageProvider } from '../../context/LanguageContext';
import { CATEGORY_DEFINITIONS } from '../../mockData';
import { submitTicket } from '@/lib/actions/tickets';
import type { ComplaintTicket, EmployeeRecord } from '../../types';

vi.mock('@/lib/actions/tickets', () => ({ submitTicket: vi.fn() }));
vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_BASE_PATH: '/ugt-voice-platform' } }));
vi.setConfig({ testTimeout: 20000 });

const byId = (id: string) => document.getElementById(id) as HTMLElement;

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

const renderForm = () =>
  render(
    <LanguageProvider>
      <EmployeeSubmitForm onTicketCreated={vi.fn()} onOpenTracking={vi.fn()} currentEmployee={ME} />
    </LanguageProvider>
  );

const useEnglish = () => localStorage.setItem('voiceplatform_lang_preference_v2', 'en');

describe('submit form — category scope text', () => {
  beforeEach(() => localStorage.clear());

  it('shows the Thai scope of the selected category in TH', () => {
    renderForm();
    expect(screen.getByText(CATEGORY_DEFINITIONS.HR.descriptionTh)).toBeInTheDocument();
  });

  it('shows the English scope of the selected category in EN', async () => {
    useEnglish();
    renderForm();
    expect(
      await screen.findByText(CATEGORY_DEFINITIONS.HR.descriptionEn as string)
    ).toBeInTheDocument();
    expect(screen.queryByText(CATEGORY_DEFINITIONS.HR.descriptionTh)).not.toBeInTheDocument();
  });

  it('has an English scope and responsible department for every category', () => {
    for (const info of Object.values(CATEGORY_DEFINITIONS)) {
      expect(info.descriptionEn).toBeTruthy();
      expect(info.responsibleDeptEn).toBeTruthy();
      expect(info.responsibleDeptEn).not.toMatch(/[฀-๿]/);
      expect(info.descriptionEn).not.toMatch(/[฀-๿]/);
    }
  });
});

describe('submit form — anonymous submitter label', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(submitTicket).mockReset();
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

  it.each([
    ['th', 'th'],
    ['en', 'en'],
  ])('persists the Thai label when the UI language is %s', async (_name, lang) => {
    const user = userEvent.setup();
    localStorage.setItem('voiceplatform_lang_preference_v2', lang);
    renderForm();

    await user.click(await waitFor(() => byId('btn-choice-anonymous')));
    await user.click(byId('input-ticket-title'));
    await user.paste('Secret');
    await user.click(byId('input-ticket-description'));
    await user.paste('Details of a confidential matter');
    await user.click(byId('btn-submit-ticket-final'));

    await waitFor(() => expect(submitTicket).toHaveBeenCalledTimes(1));
    expect(vi.mocked(submitTicket).mock.calls[0][0].submitterName).toBe(
      'ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)'
    );
  });
});
