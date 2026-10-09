import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminEmailNotificationSettings } from './AdminEmailNotificationSettings';
import { LanguageProvider } from '../context/LanguageContext';
import { DEFAULT_EMAIL_SETTINGS } from '../services/emailDefaults';
import type { EmailDispatchLog, EmailNotificationSettings } from '../types';

// userEvent-heavy tests: stay green on loaded CI agents / dev machines.
vi.setConfig({ testTimeout: 20000 });

const actions = vi.hoisted(() => ({
  getEmailNotificationSettings: vi.fn(),
  getEmailDispatchLogs: vi.fn(),
  saveEmailNotificationSettings: vi.fn(),
  resetEmailNotificationSettings: vi.fn(),
  clearEmailDispatchLogs: vi.fn(),
  sendTestEmailNotification: vi.fn(),
}));
vi.mock('@/lib/actions/email-settings', () => actions);

const testLog = (overrides: Partial<EmailDispatchLog> = {}): EmailDispatchLog => ({
  id: 'log-1',
  timestamp: '2026-10-09T03:00:00.000Z',
  trigger: 'test_dispatch',
  ticketId: 'TK-2026-TEST',
  trackingCode: 'TK-2026-TEST',
  recipientEmail: 'admin@ube.co.th',
  recipientName: 'Admin',
  recipientRole: 'test',
  subject: '[TEST SIMULATION] subject',
  body: 'body text',
  status: 'sent',
  ...overrides,
});

const renderPanel = async (props: Parameters<typeof AdminEmailNotificationSettings>[0] = {}) => {
  render(
    <LanguageProvider>
      <AdminEmailNotificationSettings {...props} />
    </LanguageProvider>
  );
  await screen.findByRole('button', { name: /บันทึกการตั้งค่าทั้งหมด|Save All Settings/ });
};

const byId = (id: string) => document.getElementById(id) as HTMLElement;

describe('AdminEmailNotificationSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    actions.getEmailNotificationSettings.mockResolvedValue(DEFAULT_EMAIL_SETTINGS);
    actions.getEmailDispatchLogs.mockResolvedValue([]);
    actions.saveEmailNotificationSettings.mockImplementation(
      async (s: EmailNotificationSettings) => ({ ...s, updatedAt: '2026-10-09T05:00:00.000Z' })
    );
    actions.resetEmailNotificationSettings.mockResolvedValue(DEFAULT_EMAIL_SETTINGS);
    actions.clearEmailDispatchLogs.mockResolvedValue(undefined);
    actions.sendTestEmailNotification.mockResolvedValue(testLog());
  });

  it('shows a loading note, then the panel loaded through the Server Actions', async () => {
    render(
      <LanguageProvider>
        <AdminEmailNotificationSettings />
      </LanguageProvider>
    );
    expect(screen.getByText('กำลังโหลดการตั้งค่าอีเมล…')).toBeInTheDocument();
    await screen.findByText('ระบบแจ้งเตือน Email อัตโนมัติ (Email Notifications)');
    expect(actions.getEmailNotificationSettings).toHaveBeenCalledTimes(1);
    expect(actions.getEmailDispatchLogs).toHaveBeenCalledTimes(1);
  });

  it('uses server-provided initial props without calling the actions', async () => {
    await renderPanel({
      initialSettings: { ...DEFAULT_EMAIL_SETTINGS, masterEnabled: false },
      initialLogs: [testLog()],
    });
    expect(actions.getEmailNotificationSettings).not.toHaveBeenCalled();
    expect(screen.getByText(/Master Switch OFF/)).toBeInTheDocument();
    expect(screen.getByText('เคสทดสอบ')).toBeInTheDocument();
  });

  it('explains when the settings cannot be loaded', async () => {
    actions.getEmailNotificationSettings.mockRejectedValue(new Error('boom'));
    render(
      <LanguageProvider>
        <AdminEmailNotificationSettings />
      </LanguageProvider>
    );
    expect(await screen.findByText(/โหลดการตั้งค่าอีเมลไม่สำเร็จ/)).toBeInTheDocument();
  });

  it('shows the disabled warning and saves the master switch through the action', async () => {
    const user = userEvent.setup();
    await renderPanel();

    expect(screen.queryByText(/Master Switch OFF/)).not.toBeInTheDocument();
    await user.click(byId('toggle-master-email-notifications'));
    expect(screen.getByText(/Master Switch OFF/)).toBeInTheDocument();

    await user.click(byId('btn-save-email-settings'));
    expect(actions.saveEmailNotificationSettings).toHaveBeenCalledWith(
      expect.objectContaining({ masterEnabled: false })
    );
    expect(await screen.findByText('บันทึกการตั้งค่าสำเร็จ')).toBeInTheDocument();
  });

  it('turns a failed save into the generic retry message', async () => {
    const user = userEvent.setup();
    actions.saveEmailNotificationSettings.mockRejectedValue(new Error('masked'));
    await renderPanel();

    await user.click(byId('btn-save-email-settings'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠️ บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
    );
    expect(screen.queryByText('บันทึกการตั้งค่าสำเร็จ')).not.toBeInTheDocument();
  });

  it('inserts a dynamic tag into the body and edits the subject', async () => {
    const user = userEvent.setup();
    await renderPanel();

    const body = byId('textarea-submitted-body') as HTMLTextAreaElement;
    const before = body.value;
    await user.click(screen.getAllByRole('button', { name: '+ {ticketId}' })[0]);
    expect(body.value).toBe(`${before} {ticketId} `);

    const subject = byId('input-resolved-subject') as HTMLInputElement;
    await user.clear(subject);
    await user.type(subject, 'Done');
    expect(subject.value).toBe('Done');
  });

  it('renders a live preview with interpolated sample data and closes it again', async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(byId('btn-preview-submitted-email'));
    expect(screen.getByText(/LIVE PREVIEW: อีเมลส่งหา Gatekeeper/)).toBeInTheDocument();
    expect(screen.getAllByText(/TK-2026-0881/).length).toBeGreaterThan(0);

    await user.click(byId('btn-preview-submitted-email'));
    expect(screen.queryByText(/LIVE PREVIEW/)).not.toBeInTheDocument();
  });

  it('sends a test dispatch, opens its detail and clears logs through the in-app confirm', async () => {
    const user = userEvent.setup();
    await renderPanel();

    await user.click(byId('btn-test-submitted-email'));
    expect(actions.sendTestEmailNotification).toHaveBeenCalledWith('ticket_submitted');
    expect(await screen.findByText('เคสทดสอบ')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /เปิดดู/ }));
    const detail = screen.getByRole('dialog');
    expect(within(detail).getByText('รายละเอียดอีเมลที่ส่งออกจากระบบ')).toBeInTheDocument();
    await user.click(within(detail).getByRole('button', { name: 'ปิดหน้าต่าง' }));

    await user.click(byId('btn-clear-email-logs'));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ยกเลิก' })
    );
    expect(actions.clearEmailDispatchLogs).not.toHaveBeenCalled();

    await user.click(byId('btn-clear-email-logs'));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: /ล้างประวัติ/ })
    );
    expect(actions.clearEmailDispatchLogs).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('ยังไม่มีประวัติการส่งอีเมลในรอบนี้')).toBeInTheDocument();
  });

  it('resets settings to defaults after confirming', async () => {
    const user = userEvent.setup();
    await renderPanel();

    const subject = byId('input-submitted-subject') as HTMLInputElement;
    const original = subject.value;
    await user.clear(subject);
    await user.type(subject, 'custom');
    await user.click(byId('btn-reset-email-settings'));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: /รีเซ็ตเป็นค่าเริ่มต้น/ })
    );
    expect(actions.resetEmailNotificationSettings).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('บันทึกการตั้งค่าสำเร็จ')).toBeInTheDocument();
    expect(subject.value).toBe(original);
  });

  it('renders English copy when the stored language is en', async () => {
    localStorage.setItem('voiceplatform_lang_preference_v2', 'en');
    await renderPanel();
    expect(await screen.findByText('Automated Email Notifications System')).toBeInTheDocument();
  });

  it('sends a ticket_resolved test dispatch and closes the detail with its X button or Escape', async () => {
    const user = userEvent.setup();
    actions.sendTestEmailNotification.mockResolvedValue(testLog({ id: 'log-2' }));
    await renderPanel();

    await user.click(byId('btn-test-resolved-email'));
    expect(actions.sendTestEmailNotification).toHaveBeenCalledWith('ticket_resolved');
    expect(await screen.findByText(/จำลองการส่งอีเมล แจ้งผลการแก้ไขหาพนักงาน/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /เปิดดู/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ปิด' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /เปิดดู/ }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a failed test send with its reason in the log and a failure message', async () => {
    const user = userEvent.setup();
    actions.sendTestEmailNotification.mockResolvedValue(
      testLog({ status: 'failed', errorMessage: 'SMTP_HOST environment variable is required' })
    );
    await renderPanel();

    await user.click(byId('btn-test-submitted-email'));
    expect(await screen.findByRole('alert')).toHaveTextContent('ส่งอีเมลทดสอบไม่สำเร็จ');
    expect(screen.queryByText(/จำลองการส่งอีเมล/)).not.toBeInTheDocument();
    expect(screen.getByText('ส่งไม่สำเร็จ (Failed)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /เปิดดู/ }));
    expect(screen.getByText(/SMTP_HOST environment variable is required/)).toBeInTheDocument();
  });

  it('marks a switched-off dispatch as disabled in the log', async () => {
    await renderPanel({
      initialSettings: DEFAULT_EMAIL_SETTINGS,
      initialLogs: [testLog({ status: 'disabled', trigger: 'ticket_submitted' })],
    });
    expect(screen.getByText('ระบบปิด (Disabled)')).toBeInTheDocument();
    expect(screen.getByText('ยื่นเรื่องใหม่')).toBeInTheDocument();
  });
});
