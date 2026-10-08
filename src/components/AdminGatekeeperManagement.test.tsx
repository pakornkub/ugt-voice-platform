import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminGatekeeperManagement } from './AdminGatekeeperManagement';
import { LanguageProvider } from '../context/LanguageContext';
import { getStoredExecutives, getStoredGatekeeperConfigs } from '../services/api';

// userEvent-heavy tests: stay green on loaded CI agents / dev machines.
vi.setConfig({ testTimeout: 20000 });

const renderPage = () =>
  render(
    <LanguageProvider>
      <AdminGatekeeperManagement />
    </LanguageProvider>
  );

const byId = (id: string) => document.getElementById(id) as HTMLElement;

describe('AdminGatekeeperManagement', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lists 6 categories and no SLA setting', () => {
    renderPage();
    expect(screen.getByText(/เลือกหน่วยงาน \(6 หมวดหมู่\)/)).toBeInTheDocument();
    expect(document.getElementById('input-sla-hours')).toBeNull();
    expect(document.querySelectorAll('[id^="btn-select-dept-"]')).toHaveLength(6);
  });

  it('blocks deleting the Lead officer with a toast instead of an alert', async () => {
    const user = userEvent.setup();
    renderPage();
    const lead = getStoredGatekeeperConfigs().HR.leadOfficer;

    expect(document.getElementById(`btn-remove-officer-${lead.id}`)).toBeNull();
    await user.click(screen.getAllByTitle(/ไม่สามารถลบ Lead Gatekeeper ได้/)[0]);
    expect(screen.getByText(/ไม่สามารถลบ Lead Gatekeeper ได้: กรุณากด/)).toBeInTheDocument();
  });

  it('removes a non-lead officer only after the in-app confirm', async () => {
    const user = userEvent.setup();
    renderPage();
    const before = getStoredGatekeeperConfigs().HR.officers;
    const target = before.find((o) => !o.isLead)!;

    await user.click(byId(`btn-remove-officer-${target.id}`));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ยกเลิก' })
    );
    expect(getStoredGatekeeperConfigs().HR.officers).toHaveLength(before.length);

    await user.click(byId(`btn-remove-officer-${target.id}`));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: /ลบรายชื่อ/ })
    );
    expect(getStoredGatekeeperConfigs().HR.officers).toHaveLength(before.length - 1);
  });

  it('opens the email notification sub-tab', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(byId('subtab-email-notifications'));
    expect(document.getElementById('admin-email-notifications-panel')).not.toBeNull();
  });

  it('saves a new executive with the chosen status', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(byId('subtab-executives'));
    await user.click(byId('btn-add-executive-toggle'));

    fireEvent.change(byId('exec-name'), { target: { value: 'ทดสอบ ระบบ' } });
    fireEvent.change(byId('exec-position'), { target: { value: 'CFO' } });
    fireEvent.change(byId('exec-email'), { target: { value: 'test@example.com' } });
    await user.selectOptions(byId('exec-status'), 'inactive');
    await user.click(byId('btn-save-exec'));

    const saved = getStoredExecutives().find((e) => e.name === 'ทดสอบ ระบบ');
    expect(saved?.status).toBe('inactive');
  });
});
