import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminEmailNotificationSettings } from './AdminEmailNotificationSettings';
import { LanguageProvider } from '../context/LanguageContext';
import { getStoredEmailDispatchLogs, getStoredEmailNotificationSettings } from '../services/api';

const renderPanel = () =>
  render(
    <LanguageProvider>
      <AdminEmailNotificationSettings />
    </LanguageProvider>
  );

const byId = (id: string) => document.getElementById(id) as HTMLElement;

describe('AdminEmailNotificationSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the disabled warning and persists the master switch on save', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.queryByText(/Master Switch OFF/)).not.toBeInTheDocument();
    await user.click(byId('toggle-master-email-notifications'));
    expect(screen.getByText(/Master Switch OFF/)).toBeInTheDocument();

    await user.click(byId('btn-save-email-settings'));
    expect(getStoredEmailNotificationSettings().masterEnabled).toBe(false);
    expect(screen.getByText('บันทึกการตั้งค่าสำเร็จ')).toBeInTheDocument();
  });

  it('inserts a dynamic tag into the body and edits the subject', async () => {
    const user = userEvent.setup();
    renderPanel();

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
    renderPanel();

    await user.click(byId('btn-preview-submitted-email'));
    expect(screen.getByText(/LIVE PREVIEW: อีเมลส่งหา Gatekeeper/)).toBeInTheDocument();
    expect(screen.getAllByText(/TK-2026-0881/).length).toBeGreaterThan(0);

    await user.click(byId('btn-preview-submitted-email'));
    expect(screen.queryByText(/LIVE PREVIEW/)).not.toBeInTheDocument();
  });

  it('logs a test dispatch, opens its detail and clears logs through the in-app confirm', async () => {
    const user = userEvent.setup();
    renderPanel();
    expect(getStoredEmailDispatchLogs()).toHaveLength(0);

    await user.click(byId('btn-test-submitted-email'));
    expect(getStoredEmailDispatchLogs()).toHaveLength(1);
    expect(screen.getByText('เคสทดสอบ')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /เปิดดู/ }));
    const detail = screen.getByRole('dialog');
    expect(within(detail).getByText('รายละเอียดอีเมลที่ส่งออกจากระบบ')).toBeInTheDocument();
    await user.click(within(detail).getByRole('button', { name: 'ปิดหน้าต่าง' }));

    await user.click(byId('btn-clear-email-logs'));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ยกเลิก' })
    );
    expect(getStoredEmailDispatchLogs()).toHaveLength(1);

    await user.click(byId('btn-clear-email-logs'));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: /ล้างประวัติ/ })
    );
    expect(getStoredEmailDispatchLogs()).toHaveLength(0);
    expect(screen.getByText('ยังไม่มีประวัติการส่งอีเมลในรอบนี้')).toBeInTheDocument();
  });

  it('resets settings to defaults after confirming', async () => {
    const user = userEvent.setup();
    renderPanel();

    const subject = byId('input-submitted-subject') as HTMLInputElement;
    const original = subject.value;
    await user.clear(subject);
    await user.type(subject, 'custom');
    await user.click(byId('btn-reset-email-settings'));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: /รีเซ็ตเป็นค่าเริ่มต้น/ })
    );
    expect(subject.value).toBe(original);
  });

  it('renders English copy when the stored language is en', async () => {
    localStorage.setItem('voicecare_lang_preference_v2', 'en');
    renderPanel();
    expect(await screen.findByText('Automated Email Notifications System')).toBeInTheDocument();
  });
});
