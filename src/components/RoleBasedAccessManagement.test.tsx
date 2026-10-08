import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleBasedAccessManagement } from './RoleBasedAccessManagement';
import { LanguageProvider } from '../context/LanguageContext';
import { getStoredRolePermissions } from '../services/api';

// userEvent-heavy tests: stay green on loaded CI agents / dev machines.
vi.setConfig({ testTimeout: 20000 });

const renderPage = (onPermissionsUpdated = vi.fn()) =>
  render(
    <LanguageProvider>
      <RoleBasedAccessManagement
        currentRole="admin"
        onNavigateTab={vi.fn()}
        onPermissionsUpdated={onPermissionsUpdated}
      />
    </LanguageProvider>
  );

const matrixBox = () => document.getElementById('anonymous-visibility-matrix-box') as HTMLElement;

describe('RoleBasedAccessManagement', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('has no role-switch buttons (the SSO identity decides the real role)', () => {
    renderPage();
    expect(screen.queryByText('ทดสอบมุมมอง')).not.toBeInTheDocument();
    expect(document.querySelector('[id^="btn-switch-role-to-"]')).toBeNull();
  });

  it('toggles canViewAnonymousSubmitterEmail from the 4-role matrix and persists it', async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();
    renderPage(onUpdated);

    const before = getStoredRolePermissions().employee.canViewAnonymousSubmitterEmail;
    await user.click(within(matrixBox()).getByText('Role: employee'));

    expect(getStoredRolePermissions().employee.canViewAnonymousSubmitterEmail).toBe(!before);
    await vi.waitFor(() => expect(onUpdated).toHaveBeenCalled());
  });

  it('applies the "hide from everyone" preset', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /ปกปิด 100% ทุก Role/ }));
    const perms = Object.values(getStoredRolePermissions());
    expect(perms.every((p) => !p.canViewAnonymousSubmitterEmail)).toBe(true);
  });

  it('simulator previews a role without changing stored permissions', async () => {
    const user = userEvent.setup();
    renderPage();
    const snapshot = JSON.stringify(getStoredRolePermissions());

    await user.click(within(matrixBox()).getByRole('button', { name: 'Admin' }));
    expect(JSON.stringify(getStoredRolePermissions())).toBe(snapshot);
  });

  it('lists the employee directory on demand', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /ดูฐานข้อมูลพนักงาน/ }));
    expect(screen.getByText(/Corporate Employee Directory/)).toBeInTheDocument();
  });

  it('selects all 6 gatekeeper categories', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'เลือกทั้ง 6 หมวดหมู่' }));
    const gatekeeper = getStoredRolePermissions().gatekeeper;
    expect(gatekeeper.assignedDepartments).toHaveLength(6);
    expect(gatekeeper.canViewAllDepartments).toBe(true);
  });

  it('resets every role to defaults only after the in-app confirm', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /ปกปิด 100% ทุก Role/ }));

    await user.click(document.getElementById('btn-reset-rbac-defaults') as HTMLElement);
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ยกเลิก' })
    );
    expect(getStoredRolePermissions().admin.canViewAnonymousSubmitterEmail).toBe(false);

    await user.click(document.getElementById('btn-reset-rbac-defaults') as HTMLElement);
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: /รีเซ็ตค่าเริ่มต้น/ })
    );
    expect(getStoredRolePermissions().admin.canViewAnonymousSubmitterEmail).toBe(true);
  });
});
