import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminGatekeeperManagement } from './AdminGatekeeperManagement';
import { LanguageProvider } from '../context/LanguageContext';
import { INITIAL_GATEKEEPER_CONFIGS } from '../mockData';
import { INITIAL_EXECUTIVES, INITIAL_HR_ADMINS } from '../services/rosterDefaults';
import { makeShell, renderWithShell, withRoleConfig } from '@/test/shell';
import {
  resetGatekeeperConfigsToDefault,
  updateDepartmentGatekeeperConfig,
} from '@/lib/actions/gatekeeper';
import {
  addExecutiveMember,
  deleteExecutiveMember,
  resetExecutivesToDefault,
  updateExecutiveMember,
} from '@/lib/actions/executives';
import {
  addHrAdminMember,
  deleteHrAdminMember,
  resetHrAdminsToDefault,
  updateHrAdminMember,
} from '@/lib/actions/hr-admins';
import { searchHrEmployees } from '@/lib/actions/directory';
import type { ShellContextValue } from '@/app/shell-context';
import type { EmployeeRecord } from '../types';

// Server Action stand-ins: the screen only talks to the DB through these.
vi.mock('@/lib/actions/gatekeeper', () => ({
  updateDepartmentGatekeeperConfig: vi.fn(),
  resetGatekeeperConfigsToDefault: vi.fn(),
}));
vi.mock('@/lib/actions/executives', () => ({
  addExecutiveMember: vi.fn(),
  updateExecutiveMember: vi.fn(),
  deleteExecutiveMember: vi.fn(),
  resetExecutivesToDefault: vi.fn(),
}));
vi.mock('@/lib/actions/hr-admins', () => ({
  addHrAdminMember: vi.fn(),
  updateHrAdminMember: vi.fn(),
  deleteHrAdminMember: vi.fn(),
  resetHrAdminsToDefault: vi.fn(),
}));
vi.mock('@/lib/actions/directory', () => ({ searchHrEmployees: vi.fn() }));

// userEvent-heavy tests: stay green on loaded CI agents / dev machines.
vi.setConfig({ testTimeout: 20000 });

type PageProps = React.ComponentProps<typeof AdminGatekeeperManagement>;

const renderPage = (props: Partial<PageProps> = {}, shell: Partial<ShellContextValue> = {}) =>
  renderWithShell(
    <LanguageProvider>
      <AdminGatekeeperManagement
        initialExecutives={INITIAL_EXECUTIVES}
        initialHrAdmins={INITIAL_HR_ADMINS}
        hrStatus={null}
        {...props}
      />
    </LanguageProvider>,
    shell
  );

const byId = (id: string) => document.getElementById(id) as HTMLInputElement;

const hrEmployee: EmployeeRecord = {
  employeeId: 'E001',
  nameTh: 'สมชาย ใจดี',
  nameEn: 'Somchai Jaidee',
  loginEmail: 'somchai.j@ube.co.th',
  department: 'ฝ่ายบัญชี',
  position: 'ผู้จัดการฝ่ายบัญชี',
  phone: '02-000-0000',
  status: 'active',
};

const hrOfficers = INITIAL_GATEKEEPER_CONFIGS.HR.officers;
const confirmButton = () =>
  within(screen.getByRole('alertdialog')).getByRole('button', { name: /ลบรายชื่อ/ });

describe('AdminGatekeeperManagement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    vi.mocked(updateDepartmentGatekeeperConfig).mockImplementation(async (category, updates) => ({
      ...INITIAL_GATEKEEPER_CONFIGS,
      [category]: { ...INITIAL_GATEKEEPER_CONFIGS[category], ...updates },
    }));
    vi.mocked(resetGatekeeperConfigsToDefault).mockResolvedValue(INITIAL_GATEKEEPER_CONFIGS);
    vi.mocked(addExecutiveMember).mockImplementation(async (exec) => [
      ...INITIAL_EXECUTIVES,
      { ...exec, id: 'exec-new', updatedAt: '2026-10-09T00:00:00.000Z' },
    ]);
    vi.mocked(updateExecutiveMember).mockResolvedValue(INITIAL_EXECUTIVES);
    vi.mocked(deleteExecutiveMember).mockResolvedValue(INITIAL_EXECUTIVES);
    vi.mocked(resetExecutivesToDefault).mockResolvedValue(INITIAL_EXECUTIVES);
    vi.mocked(addHrAdminMember).mockResolvedValue(INITIAL_HR_ADMINS);
    vi.mocked(updateHrAdminMember).mockResolvedValue(INITIAL_HR_ADMINS);
    vi.mocked(deleteHrAdminMember).mockResolvedValue(INITIAL_HR_ADMINS);
    vi.mocked(resetHrAdminsToDefault).mockResolvedValue(INITIAL_HR_ADMINS);
    vi.mocked(searchHrEmployees).mockResolvedValue([]);
  });

  it('flags officers of a category the RBAC page has not enabled for gatekeepers', () => {
    renderPage(
      {},
      { rolePermissions: withRoleConfig('gatekeeper', { assignedDepartments: ['Quality'] }) }
    );
    expect(screen.getAllByText('หมวดนี้ปิดในหน้า RBAC')).toHaveLength(hrOfficers.length);
  });

  it('shows no category warning when the category is enabled', () => {
    renderPage();
    expect(screen.queryByText('หมวดนี้ปิดในหน้า RBAC')).toBeNull();
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
    const lead = INITIAL_GATEKEEPER_CONFIGS.HR.leadOfficer;

    expect(document.getElementById(`btn-remove-officer-${lead.id}`)).toBeNull();
    await user.click(screen.getAllByTitle(/ไม่สามารถลบ Lead Gatekeeper ได้/)[0]);
    expect(screen.getByText(/ไม่สามารถลบ Lead Gatekeeper ได้: กรุณากด/)).toBeInTheDocument();
    expect(updateDepartmentGatekeeperConfig).not.toHaveBeenCalled();
  });

  it('removes a non-lead officer only after the in-app confirm', async () => {
    const user = userEvent.setup();
    renderPage();
    const target = hrOfficers.find((o) => !o.isLead)!;

    await user.click(byId(`btn-remove-officer-${target.id}`));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ยกเลิก' })
    );
    expect(updateDepartmentGatekeeperConfig).not.toHaveBeenCalled();

    await user.click(byId(`btn-remove-officer-${target.id}`));
    await user.click(confirmButton());

    expect(updateDepartmentGatekeeperConfig).toHaveBeenCalledWith('HR', {
      officers: hrOfficers.filter((o) => o.id !== target.id),
    });
    expect(
      await screen.findByText(`ลบคุณ "${target.name}" ออกจากรายชื่อ Gatekeeper เรียบร้อยแล้ว`)
    ).toBeInTheDocument();
  });

  it('adds an officer through updateDepartmentGatekeeperConfig and refreshes the shell', async () => {
    const user = userEvent.setup();
    const refreshData = vi.fn();
    renderPage({}, { refreshData });
    await user.click(byId('btn-add-gatekeeper-toggle'));

    fireEvent.change(byId('input-new-officer-name'), { target: { value: 'คุณทดสอบ ระบบ' } });
    fireEvent.change(byId('input-new-officer-email'), { target: { value: 'Tester@Example.com' } });
    await user.click(byId('btn-submit-new-officer'));

    expect(updateDepartmentGatekeeperConfig).toHaveBeenCalledTimes(1);
    const [category, updates] = vi.mocked(updateDepartmentGatekeeperConfig).mock.calls[0];
    expect(category).toBe('HR');
    expect(updates.officers).toHaveLength(hrOfficers.length + 1);
    expect(updates.officers?.at(-1)).toMatchObject({
      name: 'คุณทดสอบ ระบบ',
      email: 'Tester@Example.com',
      roleTitle: 'Gatekeeper Specialist',
      isLead: false,
    });
    expect(
      await screen.findByText('เพิ่มคุณ "คุณทดสอบ ระบบ" เป็น Gatekeeper ประจำหน่วยงานเรียบร้อยแล้ว')
    ).toBeInTheDocument();
    expect(refreshData).toHaveBeenCalled();
    // form closes after a successful save
    expect(document.getElementById('input-new-officer-name')).toBeNull();
  });

  it('keeps the officer form open and toasts when saving fails', async () => {
    const user = userEvent.setup();
    vi.mocked(updateDepartmentGatekeeperConfig).mockRejectedValueOnce(new Error('FORBIDDEN'));
    renderPage();
    await user.click(byId('btn-add-gatekeeper-toggle'));

    fireEvent.change(byId('input-new-officer-name'), { target: { value: 'คุณทดสอบ ระบบ' } });
    fireEvent.change(byId('input-new-officer-email'), { target: { value: 'tester@example.com' } });
    await user.click(byId('btn-submit-new-officer'));

    expect(await screen.findByText('⚠️ บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')).toBeInTheDocument();
    expect(byId('input-new-officer-name').value).toBe('คุณทดสอบ ระบบ');
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

    expect(addExecutiveMember).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ทดสอบ ระบบ',
        position: 'CFO',
        email: 'test@example.com',
        status: 'inactive',
      })
    );
    expect(
      await screen.findByText('เพิ่มผู้บริหาร "ทดสอบ ระบบ" ในบัญชีรายชื่อเรียบร้อยแล้ว')
    ).toBeInTheDocument();
    // the returned roster replaces the local one
    expect(await screen.findByText('ทดสอบ ระบบ')).toBeInTheDocument();
  });

  it('shows the mapped toast when deleting the last HR admin fails', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteHrAdminMember).mockRejectedValueOnce(new Error('LAST_ADMIN'));
    renderPage();
    await user.click(byId('subtab-hr-admins'));

    await user.click(screen.getAllByTitle('ลบรายชื่อ')[0]);
    await user.click(confirmButton());

    expect(deleteHrAdminMember).toHaveBeenCalledWith(INITIAL_HR_ADMINS[0].id);
    expect(
      await screen.findByText('⚠️ ต้องมี HR Admin ที่ใช้งานอยู่อย่างน้อย 1 ท่าน')
    ).toBeInTheDocument();
    expect(screen.getByText(INITIAL_HR_ADMINS[0].name)).toBeInTheDocument();
  });

  it('maps CANNOT_REMOVE_SELF when switching an HR admin off', async () => {
    const user = userEvent.setup();
    vi.mocked(updateHrAdminMember).mockRejectedValueOnce(new Error('CANNOT_REMOVE_SELF'));
    renderPage();
    await user.click(byId('subtab-hr-admins'));

    await user.click(screen.getAllByRole('button', { name: 'พักสถานะ' })[0]);

    expect(
      await screen.findByText('⚠️ ไม่สามารถลบหรือปิดสถานะบัญชีของตัวเองได้')
    ).toBeInTheDocument();
  });

  describe('client-side guards for HR admins (no request is made)', () => {
    const me = INITIAL_HR_ADMINS[0];
    const asMe = { identity: { ...makeShell().identity, email: me.email.toUpperCase() } };
    const SELF = '⚠️ ไม่สามารถลบหรือปิดสถานะบัญชีของตัวเองได้';
    const LAST = '⚠️ ต้องมี HR Admin ที่ใช้งานอยู่อย่างน้อย 1 ท่าน';
    const soleAdmin = [{ ...me, status: 'active' as const }];

    it('refuses to delete the signed-in user', async () => {
      const user = userEvent.setup();
      renderPage({}, asMe);
      await user.click(byId('subtab-hr-admins'));

      await user.click(screen.getAllByTitle('ลบรายชื่อ')[0]);

      expect(screen.getByText(SELF)).toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(deleteHrAdminMember).not.toHaveBeenCalled();
    });

    it('refuses to deactivate the signed-in user', async () => {
      const user = userEvent.setup();
      renderPage({}, asMe);
      await user.click(byId('subtab-hr-admins'));

      await user.click(screen.getAllByRole('button', { name: 'พักสถานะ' })[0]);

      expect(screen.getByText(SELF)).toBeInTheDocument();
      expect(updateHrAdminMember).not.toHaveBeenCalled();
    });

    it('refuses to change the email of the signed-in user', async () => {
      const user = userEvent.setup();
      renderPage({}, asMe);
      await user.click(byId('subtab-hr-admins'));

      await user.click(screen.getAllByTitle('แก้ไขข้อมูล')[0]);
      fireEvent.change(byId('admin-email'), { target: { value: 'someone.else@example.com' } });
      await user.click(byId('btn-save-admin'));

      expect(screen.getByText(SELF)).toBeInTheDocument();
      expect(updateHrAdminMember).not.toHaveBeenCalled();
    });

    it('refuses to delete the last active HR admin', async () => {
      const user = userEvent.setup();
      renderPage({ initialHrAdmins: soleAdmin });
      await user.click(byId('subtab-hr-admins'));

      await user.click(screen.getByTitle('ลบรายชื่อ'));

      expect(screen.getByText(LAST)).toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(deleteHrAdminMember).not.toHaveBeenCalled();
    });

    it('refuses to deactivate the last active HR admin', async () => {
      const user = userEvent.setup();
      renderPage({ initialHrAdmins: soleAdmin });
      await user.click(byId('subtab-hr-admins'));

      await user.click(screen.getByRole('button', { name: 'พักสถานะ' }));

      expect(screen.getByText(LAST)).toBeInTheDocument();
      expect(updateHrAdminMember).not.toHaveBeenCalled();
    });

    it('still deletes another admin when others stay active', async () => {
      const user = userEvent.setup();
      renderPage({}, asMe);
      await user.click(byId('subtab-hr-admins'));

      await user.click(screen.getAllByTitle('ลบรายชื่อ')[1]);
      await user.click(confirmButton());

      expect(deleteHrAdminMember).toHaveBeenCalledWith(INITIAL_HR_ADMINS[1].id);
    });
  });

  it('fills the executive form from an HR suggestion and locks the email', async () => {
    const user = userEvent.setup();
    vi.mocked(searchHrEmployees).mockResolvedValue([hrEmployee]);
    renderPage();
    await user.click(byId('subtab-executives'));
    await user.click(byId('btn-add-executive-toggle'));

    await user.type(byId('exec-name'), 'สมชาย');
    await user.click(await screen.findByRole('button', { name: /E001/ }, { timeout: 5000 }));

    expect(searchHrEmployees).toHaveBeenCalledWith('สมชาย');
    expect(byId('exec-name').value).toBe(hrEmployee.nameTh);
    expect(byId('exec-email').value).toBe(hrEmployee.loginEmail);
    expect(byId('exec-email').readOnly).toBe(true);
    expect(byId('exec-email')).toHaveClass('bg-slate-50');
    expect(byId('exec-position').value).toBe(hrEmployee.position);
    expect(byId('exec-department').value).toBe(hrEmployee.department);

    // typing the name freely again ("กรอกเอง") unlocks the email
    fireEvent.change(byId('exec-name'), { target: { value: 'คนนอก HR' } });
    expect(byId('exec-email').readOnly).toBe(false);
  });

  it('fills the HR admin form from an HR suggestion', async () => {
    const user = userEvent.setup();
    vi.mocked(searchHrEmployees).mockResolvedValue([hrEmployee]);
    renderPage();
    await user.click(byId('subtab-hr-admins'));
    await user.click(byId('btn-add-admin-toggle'));

    await user.type(byId('admin-name'), 'สมชาย');
    await user.click(await screen.findByRole('button', { name: /E001/ }, { timeout: 5000 }));

    expect(byId('admin-email').value).toBe(hrEmployee.loginEmail);
    expect(byId('admin-email').readOnly).toBe(true);
    expect(byId('admin-department').value).toBe(hrEmployee.department);
  });

  describe('HR status badges', () => {
    const [firstExec, secondExec] = INITIAL_EXECUTIVES;
    const hrStatus = {
      [firstExec.email.toLowerCase()]: 'active',
      [secondExec.email.toLowerCase()]: 'inactive',
    } as const;

    it('flags roster people who are missing from, or have left, the HR view', async () => {
      const user = userEvent.setup();
      renderPage({ hrStatus });
      await user.click(byId('subtab-executives'));

      expect(screen.getAllByText('ไม่อยู่ใน HR')).toHaveLength(INITIAL_EXECUTIVES.length - 2);
      expect(screen.getAllByText('พ้นสภาพใน HR')).toHaveLength(1);
      expect(screen.getAllByTitle(/ไม่พบในฐานข้อมูล HR/)[0]).toBeInTheDocument();
      expect(
        screen.getByTitle('ไม่ใช่พนักงานที่ปฏิบัติงานอยู่ในฐานข้อมูล HR แล้ว')
      ).toBeInTheDocument();
    });

    it('badges gatekeeper officers and HR admins too', async () => {
      const user = userEvent.setup();
      renderPage({ hrStatus: {} });

      expect(screen.getAllByText('ไม่อยู่ใน HR')).toHaveLength(hrOfficers.length);
      await user.click(byId('subtab-hr-admins'));
      expect(screen.getAllByText('ไม่อยู่ใน HR')).toHaveLength(INITIAL_HR_ADMINS.length);
    });

    it('shows no badges when the HR view is unreachable', async () => {
      const user = userEvent.setup();
      renderPage({ hrStatus: null });

      expect(screen.queryByText('ไม่อยู่ใน HR')).not.toBeInTheDocument();
      await user.click(byId('subtab-executives'));
      expect(screen.queryByText('ไม่อยู่ใน HR')).not.toBeInTheDocument();
      expect(screen.queryByText('พ้นสภาพใน HR')).not.toBeInTheDocument();
      await waitFor(() => expect(searchHrEmployees).not.toHaveBeenCalled());
    });
  });

  describe('English mode', () => {
    beforeEach(() => {
      localStorage.setItem('voiceplatform_lang_preference_v2', 'en');
    });

    it('renders the header, category list and auto-assign options in English', () => {
      renderPage();
      expect(screen.getByText('Personnel & Governance Directory')).toBeInTheDocument();
      expect(
        screen.getByText('Manage Executives, HR Admins & Department Gatekeepers')
      ).toBeInTheDocument();
      expect(screen.getByText('Select Department (6 categories)')).toBeInTheDocument();
      expect(screen.getByText('Auto-Assign Mode')).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Off — triage and assign manually' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', {
          name: 'Always route to the Lead for triage first (recommended)',
        })
      ).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Round-Robin/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Workload Balanced/ })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Officer / Email' })).toBeInTheDocument();
      expect(screen.getAllByText('Primary owner').length).toBeGreaterThan(0);
      // category names come from the catalog's English name
      expect(
        screen.getAllByText('HR – Human Resources & Employee Benefits').length
      ).toBeGreaterThan(0);
      // Thai copy is gone
      expect(screen.queryByText(/เลือกหน่วยงาน/)).toBeNull();
      expect(screen.queryByText('ผู้รับผิดชอบหลัก')).toBeNull();
      expect(screen.queryByText(/ศูนย์บริหารจัดการ/)).toBeNull();
    });

    it('flags the RBAC-disabled category and the HR badges in English', async () => {
      const user = userEvent.setup();
      renderPage(
        { hrStatus: {} },
        { rolePermissions: withRoleConfig('gatekeeper', { assignedDepartments: ['Quality'] }) }
      );
      expect(screen.getAllByText('Category off on RBAC page')).toHaveLength(hrOfficers.length);
      expect(screen.getAllByText('Not in HR')).toHaveLength(hrOfficers.length);
      expect(screen.queryByText('ไม่อยู่ใน HR')).toBeNull();
      expect(screen.getAllByTitle(/Not found in the HR database/)[0]).toBeInTheDocument();
      await user.click(byId('subtab-executives'));
      expect(screen.getAllByText('Not in HR').length).toBeGreaterThan(0);
    });

    it('confirms and toasts an officer removal in English', async () => {
      const user = userEvent.setup();
      renderPage();
      const target = hrOfficers.find((o) => !o.isLead)!;

      await user.click(byId(`btn-remove-officer-${target.id}`));
      const dialog = screen.getByRole('alertdialog');
      expect(within(dialog).getByText('Confirm Gatekeeper removal')).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

      expect(
        await screen.findByText(`Removed "${target.name}" from the Gatekeeper list`)
      ).toBeInTheDocument();
    });

    it('shows English toasts for the lead guard and for a failed save', async () => {
      const user = userEvent.setup();
      vi.mocked(updateDepartmentGatekeeperConfig).mockRejectedValueOnce(new Error('FORBIDDEN'));
      renderPage();

      await user.click(screen.getAllByTitle(/Cannot remove the Lead Gatekeeper/)[0]);
      expect(
        screen.getByText(/Cannot remove the Lead Gatekeeper: please click/)
      ).toBeInTheDocument();

      await user.click(byId('btn-add-gatekeeper-toggle'));
      fireEvent.change(byId('input-new-officer-name'), { target: { value: 'Tester' } });
      fireEvent.change(byId('input-new-officer-email'), {
        target: { value: 'tester@example.com' },
      });
      await user.click(byId('btn-submit-new-officer'));
      expect(await screen.findByText('⚠️ Could not save. Please try again.')).toBeInTheDocument();
    });

    it('translates the executive and HR admin tabs, forms and guards', async () => {
      const user = userEvent.setup();
      const me = INITIAL_HR_ADMINS[0];
      renderPage({}, { identity: { ...makeShell().identity, email: me.email } });

      await user.click(byId('subtab-executives'));
      expect(
        screen.getByText(`2. Senior Executives & CEO Direct (${INITIAL_EXECUTIVES.length})`)
      ).toBeInTheDocument();
      await user.click(byId('btn-add-executive-toggle'));
      expect(screen.getByText('Register New Senior Executive')).toBeInTheDocument();
      expect(screen.getByText('Receive Whistleblower direct cases')).toBeInTheDocument();
      expect(byId('exec-name')).toHaveAttribute(
        'placeholder',
        'Search the HR directory: Thai/English name, employee code, email, position or department'
      );
      expect(screen.getByRole('option', { name: 'Board Member' })).toBeInTheDocument();
      expect(screen.queryByText('ลงทะเบียนผู้บริหารระดับสูงท่านใหม่')).toBeNull();

      await user.click(byId('subtab-hr-admins'));
      await user.click(screen.getAllByTitle('Remove')[0]);
      expect(
        screen.getByText('⚠️ You cannot delete or deactivate your own account')
      ).toBeInTheDocument();
      expect(deleteHrAdminMember).not.toHaveBeenCalled();
    });
  });
});
