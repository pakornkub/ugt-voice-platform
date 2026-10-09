import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleBasedAccessManagement } from './RoleBasedAccessManagement';
import { LanguageProvider } from '../context/LanguageContext';
import { APP_TABS, INITIAL_ROLE_PERMISSIONS } from '../services/api';
import { renderWithShell } from '@/test/shell';
import { resetRolePermissionsToDefault, saveRoleAccessConfigs } from '@/lib/actions/role-access';
import {
  addExecutiveMember,
  deleteExecutiveMember,
  updateExecutiveMember,
} from '@/lib/actions/executives';
import { getDirectoryPage, searchHrEmployees } from '@/lib/actions/directory';
import type { EmployeeRecord, ExecutiveMember } from '../types';

vi.mock('@/lib/actions/role-access', () => ({
  saveRoleAccessConfigs: vi.fn(),
  resetRolePermissionsToDefault: vi.fn(),
}));
vi.mock('@/lib/actions/executives', () => ({
  addExecutiveMember: vi.fn(),
  updateExecutiveMember: vi.fn(),
  deleteExecutiveMember: vi.fn(),
}));
vi.mock('@/lib/actions/directory', () => ({
  getDirectoryPage: vi.fn(),
  searchHrEmployees: vi.fn(),
}));

// userEvent-heavy tests: stay green on loaded CI agents / dev machines.
vi.setConfig({ testTimeout: 20000 });

const makeExecutive = (overrides: Partial<ExecutiveMember>): ExecutiveMember => ({
  id: 'exec-1',
  name: 'คุณทดสอบ หนึ่ง',
  position: 'CEO',
  department: 'สำนักประธาน',
  email: 'one@ube.co.th',
  roleType: 'CEO',
  isPrimaryWhistleblowerReceiver: true,
  canViewConfidentialIdentities: true,
  receiveAlertNotifications: true,
  assignedCommittees: [],
  status: 'active',
  updatedAt: '2026-10-09T00:00:00.000Z',
  ...overrides,
});

const executives: ExecutiveMember[] = [
  makeExecutive({}),
  makeExecutive({ id: 'exec-2', name: 'คุณทดสอบ สอง', email: 'Two@ube.co.th' }),
  makeExecutive({ id: 'exec-3', name: 'คุณทดสอบ สาม', email: 'three@ube.co.th' }),
];

const hrEmployee: EmployeeRecord = {
  employeeId: 'E001',
  nameTh: 'สมชาย ใจดี',
  nameEn: 'Somchai Jaidee',
  loginEmail: 'somchai.j@ube.co.th',
  department: 'ฝ่ายบัญชี',
  position: 'ผู้จัดการฝ่าย',
  phone: '',
  status: 'active',
};

const renderPage = (
  props: Partial<React.ComponentProps<typeof RoleBasedAccessManagement>> = {}
) => {
  const onPermissionsUpdated = vi.fn();
  const view = renderWithShell(
    <LanguageProvider>
      <RoleBasedAccessManagement
        currentRole="admin"
        onNavigateTab={vi.fn()}
        onPermissionsUpdated={onPermissionsUpdated}
        initialExecutives={executives}
        hrStatus={null}
        {...props}
      />
    </LanguageProvider>
  );
  return { onPermissionsUpdated, ...view };
};

const matrixBox = () => document.getElementById('anonymous-visibility-matrix-box') as HTMLElement;

const lastSavedConfigs = () => {
  const calls = vi.mocked(saveRoleAccessConfigs).mock.calls;
  return calls[calls.length - 1][0];
};

describe('RoleBasedAccessManagement', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(saveRoleAccessConfigs).mockReset();
    vi.mocked(saveRoleAccessConfigs).mockImplementation(async (configs) => configs);
    vi.mocked(resetRolePermissionsToDefault).mockReset();
    vi.mocked(resetRolePermissionsToDefault).mockResolvedValue(INITIAL_ROLE_PERMISSIONS);
    vi.mocked(getDirectoryPage).mockReset();
    vi.mocked(getDirectoryPage).mockResolvedValue({ rows: [hrEmployee], total: 45, pageSize: 20 });
    vi.mocked(searchHrEmployees).mockReset();
    vi.mocked(searchHrEmployees).mockResolvedValue([hrEmployee]);
    vi.mocked(addExecutiveMember).mockReset();
    vi.mocked(updateExecutiveMember).mockReset();
    vi.mocked(deleteExecutiveMember).mockReset();
  });

  it('has no role-switch buttons (the SSO identity decides the real role)', () => {
    renderPage();
    expect(screen.queryByText('ทดสอบมุมมอง')).not.toBeInTheDocument();
    expect(document.querySelector('[id^="btn-switch-role-to-"]')).toBeNull();
  });

  describe('permission matrix', () => {
    it('toggles canViewAnonymousSubmitterEmail from the 4-role matrix and saves it', async () => {
      const user = userEvent.setup();
      const { onPermissionsUpdated } = renderPage();

      const before = INITIAL_ROLE_PERMISSIONS.employee.canViewAnonymousSubmitterEmail;
      await user.click(within(matrixBox()).getByText('Role: employee'));

      expect(saveRoleAccessConfigs).toHaveBeenCalledTimes(1);
      expect(lastSavedConfigs().employee.canViewAnonymousSubmitterEmail).toBe(!before);
      await waitFor(() => expect(onPermissionsUpdated).toHaveBeenCalled());
    });

    it('toggling a screen tab saves the matrix with that tab flipped', async () => {
      const user = userEvent.setup();
      renderPage();
      const tab = APP_TABS.find(
        (t) => !INITIAL_ROLE_PERMISSIONS.employee.allowedTabs.includes(t.id)
      )!;

      await user.click(document.getElementById(`toggle-employee-${tab.id}`) as HTMLElement);

      expect(saveRoleAccessConfigs).toHaveBeenCalledTimes(1);
      expect(lastSavedConfigs().employee.allowedTabs).toContain(tab.id);
    });

    it('applies the "hide from everyone" preset', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: /ปกปิด 100% ทุก Role/ }));
      const perms = Object.values(lastSavedConfigs());
      expect(perms.every((p) => !p.canViewAnonymousSubmitterEmail)).toBe(true);
    });

    it('simulator previews a role without saving anything', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(within(matrixBox()).getByRole('button', { name: 'Admin' }));
      expect(saveRoleAccessConfigs).not.toHaveBeenCalled();
    });

    it('selects all 6 gatekeeper categories', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'เลือกทั้ง 6 หมวดหมู่' }));
      const gatekeeper = lastSavedConfigs().gatekeeper;
      expect(gatekeeper.assignedDepartments).toHaveLength(6);
      expect(gatekeeper.canViewAllDepartments).toBe(true);
    });

    it('reverts the optimistic change and warns when the save is rejected', async () => {
      const user = userEvent.setup();
      vi.mocked(saveRoleAccessConfigs).mockRejectedValue(new Error('ADMIN_LOCKOUT'));
      renderPage();

      const card = within(matrixBox()).getByText('Role: employee').closest('button')!;
      const before = card.getAttribute('aria-pressed');
      await user.click(card);

      expect(
        await screen.findByText(
          '⚠️ ไม่สามารถปิดสิทธิ์หน้า RBAC สำหรับ HR Admin เพื่อป้องกันการล็อกระบบ'
        )
      ).toBeInTheDocument();
      expect(card.getAttribute('aria-pressed')).toBe(before);
    });

    it('shows the generic error toast for any other failure', async () => {
      const user = userEvent.setup();
      vi.mocked(saveRoleAccessConfigs).mockRejectedValue(new Error('boom'));
      const { onPermissionsUpdated } = renderPage();

      await user.click(within(matrixBox()).getByText('Role: employee'));

      expect(
        await screen.findByText('⚠️ บันทึกสิทธิ์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      ).toBeInTheDocument();
      expect(onPermissionsUpdated).not.toHaveBeenCalled();
    });

    it('resets every role to defaults only after the in-app confirm', async () => {
      const user = userEvent.setup();
      const { onPermissionsUpdated } = renderPage();

      await user.click(document.getElementById('btn-reset-rbac-defaults') as HTMLElement);
      await user.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ยกเลิก' })
      );
      expect(resetRolePermissionsToDefault).not.toHaveBeenCalled();

      await user.click(document.getElementById('btn-reset-rbac-defaults') as HTMLElement);
      await user.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: /รีเซ็ตค่าเริ่มต้น/ })
      );
      expect(resetRolePermissionsToDefault).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(onPermissionsUpdated).toHaveBeenCalled());
    });
  });

  describe('employee directory', () => {
    const openDirectory = async (user: ReturnType<typeof userEvent.setup>) =>
      user.click(screen.getByRole('button', { name: /ดูฐานข้อมูลพนักงาน/ }));

    it('lists the employee directory on demand (page 0 from the HR view)', async () => {
      const user = userEvent.setup();
      renderPage();
      expect(getDirectoryPage).not.toHaveBeenCalled();

      await openDirectory(user);

      expect(screen.getByText(/Corporate Employee Directory/)).toBeInTheDocument();
      expect(await screen.findByText('E001')).toBeInTheDocument();
      expect(getDirectoryPage).toHaveBeenCalledWith('', 0);
      expect(screen.getByText('Total 45 Records')).toBeInTheDocument();
      expect(screen.getByText('หน้า 1 / 3')).toBeInTheDocument();
    });

    it('searches (debounced, back to page 0) and pages through the results', async () => {
      const user = userEvent.setup();
      renderPage();
      await openDirectory(user);
      await screen.findByText('E001');

      await user.click(screen.getByRole('button', { name: 'ถัดไป' }));
      await waitFor(() => expect(getDirectoryPage).toHaveBeenLastCalledWith('', 1));
      expect(await screen.findByText('หน้า 2 / 3')).toBeInTheDocument();

      await user.type(
        screen.getByPlaceholderText('ค้นหาชื่อ, รหัสพนักงาน, อีเมล หรือหน่วยงาน...'),
        'บัญชี'
      );
      await waitFor(() => expect(getDirectoryPage).toHaveBeenLastCalledWith('บัญชี', 0));
      expect(await screen.findByText('หน้า 1 / 3')).toBeInTheDocument();

      expect(screen.getByRole('button', { name: 'ก่อนหน้า' })).toBeDisabled();
    });

    it('shows a loading state while the first page is on its way', async () => {
      const user = userEvent.setup();
      vi.mocked(getDirectoryPage).mockReturnValue(new Promise(() => {}));
      renderPage();

      await openDirectory(user);

      expect(screen.getByText('กำลังโหลดข้อมูลพนักงานจาก HR...')).toBeInTheDocument();
    });

    it('shows a notice when the HR database cannot be reached', async () => {
      const user = userEvent.setup();
      vi.mocked(getDirectoryPage).mockRejectedValue(new Error('down'));
      renderPage();

      await openDirectory(user);

      expect(
        await screen.findByText('ไม่สามารถเชื่อมต่อฐานข้อมูล HR ได้ในขณะนี้')
      ).toBeInTheDocument();
    });
  });

  describe('executive roster', () => {
    const openAddForm = async (user: ReturnType<typeof userEvent.setup>) =>
      user.click(document.getElementById('btn-toggle-add-exec-form') as HTMLElement);

    it('lists the executives passed from the server', () => {
      renderPage();
      expect(screen.getByText('คุณทดสอบ หนึ่ง')).toBeInTheDocument();
      expect(screen.getByText('3 ท่าน')).toBeInTheDocument();
    });

    it('picking an HR suggestion fills the form and locks the e-mail until the name is retyped', async () => {
      const user = userEvent.setup();
      renderPage();
      await openAddForm(user);

      const nameInput = screen.getByPlaceholderText(
        'พิมพ์ค้นหาจากข้อมูล HR: ชื่อไทย/อังกฤษ รหัสพนักงาน อีเมล ตำแหน่ง หรือหน่วยงาน'
      );
      await user.type(nameInput, 'สมชาย');
      await user.click(
        await screen.findByRole('button', { name: /Somchai Jaidee/ }, { timeout: 5000 })
      );

      expect(nameInput).toHaveValue('สมชาย ใจดี');
      const email = screen.getByPlaceholderText('executive@enterprise.co.th');
      expect(email).toHaveValue('somchai.j@ube.co.th');
      expect(email).toHaveAttribute('readonly');
      expect(screen.getByPlaceholderText('เช่น Chief Executive Officer (CEO)')).toHaveValue(
        'ผู้จัดการฝ่าย'
      );
      expect(screen.getByPlaceholderText('เช่น สำนักประธานเจ้าหน้าที่บริหาร')).toHaveValue(
        'ฝ่ายบัญชี'
      );

      await user.type(nameInput, 'x');
      expect(email).not.toHaveAttribute('readonly');
    });

    it('adds an executive through the Server Action and shows the returned roster', async () => {
      const user = userEvent.setup();
      const added = makeExecutive({ id: 'exec-9', name: 'คุณใหม่ ล่าสุด', email: 'new@ube.co.th' });
      vi.mocked(addExecutiveMember).mockResolvedValue([...executives, added]);
      const { onPermissionsUpdated } = renderPage();
      await openAddForm(user);

      await user.type(
        screen.getByPlaceholderText(
          'พิมพ์ค้นหาจากข้อมูล HR: ชื่อไทย/อังกฤษ รหัสพนักงาน อีเมล ตำแหน่ง หรือหน่วยงาน'
        ),
        'คุณใหม่ ล่าสุด'
      );
      await user.type(screen.getByPlaceholderText('เช่น Chief Executive Officer (CEO)'), 'CFO');
      await user.type(screen.getByPlaceholderText('executive@enterprise.co.th'), 'new@ube.co.th');
      await user.click(document.getElementById('btn-save-exec-in-box') as HTMLElement);

      expect(addExecutiveMember).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'คุณใหม่ ล่าสุด', email: 'new@ube.co.th', position: 'CFO' })
      );
      expect(await screen.findByText('4 ท่าน')).toBeInTheDocument();
      expect(
        screen.getByText('เพิ่มรายชื่อผู้บริหาร "คุณใหม่ ล่าสุด" เข้าระบบเรียบร้อยแล้ว')
      ).toBeInTheDocument();
      await waitFor(() => expect(onPermissionsUpdated).toHaveBeenCalled());
    });

    it('keeps the form open and warns when saving fails', async () => {
      const user = userEvent.setup();
      vi.mocked(addExecutiveMember).mockRejectedValue(new Error('FORBIDDEN'));
      renderPage();
      await openAddForm(user);

      await user.type(
        screen.getByPlaceholderText(
          'พิมพ์ค้นหาจากข้อมูล HR: ชื่อไทย/อังกฤษ รหัสพนักงาน อีเมล ตำแหน่ง หรือหน่วยงาน'
        ),
        'คุณใหม่'
      );
      await user.type(screen.getByPlaceholderText('เช่น Chief Executive Officer (CEO)'), 'CFO');
      await user.type(screen.getByPlaceholderText('executive@enterprise.co.th'), 'new@ube.co.th');
      await user.click(document.getElementById('btn-save-exec-in-box') as HTMLElement);

      expect(
        await screen.findByText('⚠️ บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      ).toBeInTheDocument();
      expect(document.getElementById('btn-save-exec-in-box')).toBeInTheDocument();
    });

    it('toggles an executive status through the Server Action', async () => {
      const user = userEvent.setup();
      vi.mocked(updateExecutiveMember).mockResolvedValue([
        makeExecutive({ status: 'inactive' }),
        executives[1],
        executives[2],
      ]);
      renderPage();

      await user.click(document.getElementById('btn-toggle-exec-exec-1') as HTMLElement);

      expect(updateExecutiveMember).toHaveBeenCalledWith('exec-1', { status: 'inactive' });
      expect(await screen.findByText('เปลี่ยนสถานะเป็น ระงับชั่วคราว')).toBeInTheDocument();
    });

    it('deletes an executive only after the in-app confirm', async () => {
      const user = userEvent.setup();
      vi.mocked(deleteExecutiveMember).mockResolvedValue([executives[1], executives[2]]);
      renderPage();

      await user.click(screen.getAllByTitle('ลบรายชื่อ')[0]);
      expect(deleteExecutiveMember).not.toHaveBeenCalled();
      await user.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ลบรายชื่อ' })
      );

      expect(deleteExecutiveMember).toHaveBeenCalledWith('exec-1');
      expect(await screen.findByText('2 ท่าน')).toBeInTheDocument();
    });
  });

  describe('HR status badges', () => {
    it('shows none when the HR view is unreachable (hrStatus = null)', () => {
      renderPage({ hrStatus: null });
      expect(screen.queryByText('ไม่อยู่ใน HR')).not.toBeInTheDocument();
      expect(screen.queryByText('พ้นสภาพใน HR')).not.toBeInTheDocument();
    });

    it('flags executives missing from or no longer active in the HR view', () => {
      // exec-1 is active, exec-2 (mixed-case e-mail) is inactive, exec-3 is not in the view.
      renderPage({ hrStatus: { 'one@ube.com': 'active', 'two@ube.com': 'inactive' } });

      expect(screen.getAllByText('ไม่อยู่ใน HR')).toHaveLength(1);
      expect(screen.getAllByText('พ้นสภาพใน HR')).toHaveLength(1);
      expect(screen.getByText('พ้นสภาพใน HR')).toHaveAttribute(
        'title',
        'ไม่ใช่พนักงานที่ปฏิบัติงานอยู่ในฐานข้อมูล HR แล้ว'
      );
    });
  });

  describe('English UI', () => {
    const englishExecutives: ExecutiveMember[] = [
      makeExecutive({ name: 'Mr. One', position: 'CEO', department: 'Office of the CEO' }),
      makeExecutive({ id: 'exec-2', name: 'Ms. Two', email: 'Two@ube.co.th', department: 'Legal' }),
      makeExecutive({
        id: 'exec-3',
        name: 'Mr. Three',
        email: 'three@ube.co.th',
        department: 'HR',
      }),
    ];
    const THAI = /[฀-๿]/;

    const renderEnglish = (
      props: Partial<React.ComponentProps<typeof RoleBasedAccessManagement>> = {}
    ) => {
      localStorage.setItem('voiceplatform_lang_preference_v2', 'en');
      return renderPage({ initialExecutives: englishExecutives, ...props });
    };

    it('renders the whole page in English with no Thai left on screen', async () => {
      renderEnglish();

      expect(await screen.findByText('Screen Visibility Matrix')).toBeInTheDocument();
      expect(screen.getByText('Current view')).toBeInTheDocument();
      expect(screen.getByText('Submit Grievance')).toBeInTheDocument();
      expect(screen.getByText('Gatekeeper Category Scoping')).toBeInTheDocument();
      expect(screen.getByText('3 executives')).toBeInTheDocument();
      expect(screen.getByText('Ethics – Corporate Ethics & Business Conduct')).toBeInTheDocument();
      expect(
        screen.getByText(INITIAL_ROLE_PERMISSIONS.employee.descriptionEn!)
      ).toBeInTheDocument();
      expect(screen.getByText(APP_TABS[0].descriptionEn!)).toBeInTheDocument();
      expect(screen.queryByText('มุมมองปัจจุบัน')).not.toBeInTheDocument();
      expect(screen.queryByText('ยื่นข้อร้องเรียน')).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(THAI);
    });

    it('titles the matrix toggles and role chips in English', async () => {
      renderEnglish();
      await screen.findByText('Screen Visibility Matrix');

      expect(document.getElementById('toggle-employee-submit')).toHaveAttribute(
        'title',
        'Click to toggle Submit Grievance access for employee'
      );
      expect(document.getElementById('toggle-admin-rbac_management')).toHaveAttribute(
        'title',
        'HR Admin permission is permanent, to prevent a system lock-out'
      );
      expect(within(matrixBox()).getByRole('button', { name: 'Employee' })).toBeInTheDocument();
      expect(within(matrixBox()).getByRole('button', { name: 'Executive' })).toBeInTheDocument();
    });

    it('toasts and presets are English too', async () => {
      const user = userEvent.setup();
      renderEnglish();

      await user.click(screen.getByRole('button', { name: 'Select all 6' }));
      expect(
        await screen.findByText('Gatekeeper now has access to all 6 categories')
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Hide from every role/ }));
      expect(
        await screen.findByText('Set: login e-mail hidden from every role (100%)')
      ).toBeInTheDocument();
    });

    it('shows the English save and lock-out warnings', async () => {
      const user = userEvent.setup();
      vi.mocked(saveRoleAccessConfigs).mockRejectedValueOnce(new Error('ADMIN_LOCKOUT'));
      renderEnglish();

      await user.click(within(matrixBox()).getByText('Role: employee'));
      expect(
        await screen.findByText(
          '⚠️ The RBAC page permission for HR Admin cannot be turned off, to prevent a system lock-out'
        )
      ).toBeInTheDocument();

      vi.mocked(saveRoleAccessConfigs).mockRejectedValueOnce(new Error('boom'));
      await user.click(within(matrixBox()).getByText('Role: employee'));
      expect(
        await screen.findByText('⚠️ Could not save the permissions. Please try again.')
      ).toBeInTheDocument();
    });

    it('confirms the reset in English', async () => {
      const user = userEvent.setup();
      renderEnglish();

      await user.click(document.getElementById('btn-reset-rbac-defaults') as HTMLElement);
      const dialog = screen.getByRole('alertdialog');
      expect(within(dialog).getByText('Confirm RBAC permission reset')).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Reset to defaults' }));

      expect(resetRolePermissionsToDefault).toHaveBeenCalledTimes(1);
      expect(await screen.findByText('RBAC permissions reset to defaults')).toBeInTheDocument();
    });

    it('lists the employee directory in English', async () => {
      const user = userEvent.setup();
      renderEnglish();

      await user.click(screen.getByRole('button', { name: /View employee database/ }));

      expect(await screen.findByText('E001')).toBeInTheDocument();
      expect(screen.getByText('Somchai Jaidee')).toBeInTheDocument();
      expect(screen.queryByText(/สมชาย ใจดี/)).not.toBeInTheDocument();
      expect(screen.getByText('Employee ID')).toBeInTheDocument();
      expect(screen.getByText('Page 1 / 3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
      expect(screen.getByLabelText('Search employees')).toBeInTheDocument();
    });

    it('flags HR badges and runs the executive add / delete flow in English', async () => {
      const user = userEvent.setup();
      vi.mocked(addExecutiveMember).mockResolvedValue([
        ...englishExecutives,
        makeExecutive({ id: 'exec-9', name: 'Mr. New', email: 'new@ube.co.th' }),
      ]);
      vi.mocked(deleteExecutiveMember).mockResolvedValue(englishExecutives.slice(1));
      renderEnglish({ hrStatus: { 'one@ube.com': 'active', 'two@ube.com': 'inactive' } });

      expect(screen.getByText('Not in HR')).toBeInTheDocument();
      expect(screen.getByText('Inactive in HR')).toHaveAttribute(
        'title',
        'No longer an active employee in the HR database'
      );

      await user.click(document.getElementById('btn-toggle-add-exec-form') as HTMLElement);
      expect(screen.getByText('Add a new senior executive')).toBeInTheDocument();
      await user.type(
        screen.getByPlaceholderText(
          'Search the HR directory: Thai/English name, employee code, email, position or department'
        ),
        'Mr. New'
      );
      await user.type(screen.getByPlaceholderText('e.g. Chief Executive Officer (CEO)'), 'CFO');
      await user.type(screen.getByPlaceholderText('executive@enterprise.co.th'), 'new@ube.co.th');
      await user.click(document.getElementById('btn-save-exec-in-box') as HTMLElement);
      expect(
        await screen.findByText('Executive "Mr. New" added to the system')
      ).toBeInTheDocument();

      await user.click(screen.getAllByTitle('Delete executive')[0]);
      const dialog = screen.getByRole('alertdialog');
      expect(within(dialog).getByText('Confirm executive removal')).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
      expect(await screen.findByText('Executive "Mr. One" removed')).toBeInTheDocument();
    });
  });
});
