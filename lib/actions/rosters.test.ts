// Guards on the roster / RBAC Server Actions (rewiring slice 2): tab permission, lock-out rules,
// input whitelisting, officer-list diffing.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_ROLE_PERMISSIONS } from '@/services/rosterDefaults';
import type { TicketViewer } from '@/lib/ticket-scope';
import type { AppTabId, UserRole } from '@/types';

const db = vi.hoisted(() => {
  const tx = {
    hrAdminMember: { findMany: vi.fn(), updateMany: vi.fn(), createMany: vi.fn() },
    gatekeeperOfficer: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    departmentGatekeeperConfig: { update: vi.fn() },
  };
  const prisma = {
    hrAdminMember: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    executiveMember: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    departmentGatekeeperConfig: { findMany: vi.fn() },
    roleAccessConfig: { findMany: vi.fn(), update: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma, tx };
});
const access = vi.hoisted(() => ({ requireTicketViewer: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: db.prisma }));
vi.mock('@/lib/ticket-access', () => access);

const hrAdmins = await import('./hr-admins');
const executives = await import('./executives');
const gatekeeper = await import('./gatekeeper');
const roleAccess = await import('./role-access');

const viewer = (role: UserRole, tabs: AppTabId[]): TicketViewer => ({
  userId: 'me-id',
  email: 'me@ube.co.th',
  name: 'Me',
  rbacRoleName: null,
  role,
  config: { ...INITIAL_ROLE_PERMISSIONS[role], allowedTabs: tabs },
  gatekeeperCategories: [],
});
const admin = viewer('admin', ['admin_gatekeeper', 'rbac_management']);

const adminRow = (id: string, email: string) => ({
  id,
  name: id,
  position: '',
  department: '',
  email,
  phone: null,
  roleLevel: 'super_admin',
  canManageRbac: true,
  canManageGatekeepers: true,
  canManageExecutives: true,
  receiveSystemAlerts: true,
  status: 'active',
  updatedAt: new Date(),
});
const newAdmin = {
  name: 'New',
  position: 'P',
  department: 'D',
  email: ' New@UBE.co.th ',
  roleLevel: 'hr_manager' as const,
  canManageRbac: false,
  canManageGatekeepers: false,
  canManageExecutives: false,
  receiveSystemAlerts: true,
  status: 'active' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  access.requireTicketViewer.mockResolvedValue(admin);
  db.prisma.activityLog.create.mockResolvedValue({});
  db.prisma.hrAdminMember.findMany.mockResolvedValue([]);
  db.prisma.executiveMember.findMany.mockResolvedValue([]);
  db.prisma.departmentGatekeeperConfig.findMany.mockResolvedValue([]);
  db.prisma.roleAccessConfig.findMany.mockResolvedValue([]);
  db.prisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function' ? arg(db.tx) : Promise.all(arg as Promise<unknown>[])
  );
});

describe('tab guard', () => {
  it('refuses a role whose RBAC tabs do not include the screen', async () => {
    access.requireTicketViewer.mockResolvedValue(viewer('employee', ['submit']));
    await expect(hrAdmins.addHrAdminMember(newAdmin)).rejects.toThrow('FORBIDDEN');
    await expect(roleAccess.resetRolePermissionsToDefault()).rejects.toThrow('FORBIDDEN');
    expect(db.prisma.hrAdminMember.create).not.toHaveBeenCalled();
  });

  it('lets the gatekeeper-management tab edit rosters but not the RBAC matrix', async () => {
    access.requireTicketViewer.mockResolvedValue(viewer('gatekeeper', ['admin_gatekeeper']));
    db.prisma.hrAdminMember.create.mockResolvedValue({ id: 'n1' });
    await hrAdmins.addHrAdminMember(newAdmin);
    await expect(roleAccess.updateRoleAccessConfig('employee', {})).rejects.toThrow('FORBIDDEN');
  });
});

describe('HR-admin roster', () => {
  it('stores a lowercase email, whitelists fields and writes an audit row', async () => {
    db.prisma.hrAdminMember.create.mockResolvedValue({ id: 'n1' });
    await hrAdmins.addHrAdminMember({ ...newAdmin, isDeleted: true } as never);
    const data = db.prisma.hrAdminMember.create.mock.calls[0][0].data;
    expect(data.email).toBe('new@ube.co.th');
    expect(data).not.toHaveProperty('isDeleted');
    expect(db.prisma.activityLog.create).toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    await expect(hrAdmins.addHrAdminMember({ ...newAdmin, email: 'nope' })).rejects.toThrow();
  });

  it('cannot remove yourself', async () => {
    db.prisma.hrAdminMember.findFirst.mockResolvedValue(adminRow('a1', 'ME@ube.co.th'));
    await expect(hrAdmins.deleteHrAdminMember('a1')).rejects.toThrow('CANNOT_REMOVE_SELF');
    expect(db.prisma.hrAdminMember.update).not.toHaveBeenCalled();
  });

  it('cannot remove or deactivate the last active admin', async () => {
    db.prisma.hrAdminMember.findFirst.mockResolvedValue(adminRow('a2', 'other@ube.co.th'));
    db.prisma.hrAdminMember.count.mockResolvedValue(0);
    await expect(hrAdmins.deleteHrAdminMember('a2')).rejects.toThrow('LAST_ADMIN');
    await expect(hrAdmins.updateHrAdminMember('a2', { status: 'inactive' })).rejects.toThrow(
      'LAST_ADMIN'
    );
  });

  it('removes another admin when someone else stays active', async () => {
    db.prisma.hrAdminMember.findFirst.mockResolvedValue(adminRow('a2', 'other@ube.co.th'));
    db.prisma.hrAdminMember.count.mockResolvedValue(1);
    await hrAdmins.deleteHrAdminMember('a2');
    expect(db.prisma.hrAdminMember.update.mock.calls[0][0].data).toMatchObject({
      isDeleted: true,
    });
  });

  it('a plain field edit skips the lock-out checks; unknown id is NOT_FOUND', async () => {
    db.prisma.hrAdminMember.findFirst.mockResolvedValueOnce(adminRow('a1', 'me@ube.co.th'));
    await hrAdmins.updateHrAdminMember('a1', { position: 'Lead' });
    expect(db.prisma.hrAdminMember.count).not.toHaveBeenCalled();
    db.prisma.hrAdminMember.findFirst.mockResolvedValueOnce(null);
    await expect(hrAdmins.updateHrAdminMember('x', { position: 'y' })).rejects.toThrow('NOT_FOUND');
  });

  it('reset keeps the caller in the roster', async () => {
    db.tx.hrAdminMember.findMany.mockResolvedValue([
      { id: 'mine', email: 'Me@ube.co.th' },
      { id: 'other', email: 'x@ube.co.th' },
    ]);
    await hrAdmins.resetHrAdminsToDefault();
    expect(db.tx.hrAdminMember.updateMany.mock.calls[0][0].where).toEqual({
      id: { in: ['other'] },
    });
    expect(db.tx.hrAdminMember.createMany).toHaveBeenCalled();
  });
});

describe('executive roster', () => {
  it('serialises committees and reports a missing row', async () => {
    db.prisma.executiveMember.create.mockResolvedValue({ id: 'e1' });
    await executives.addExecutiveMember({
      name: 'CEO',
      position: 'CEO',
      department: 'Office',
      email: 'ceo@ube.co.th',
      roleType: 'CEO',
      isPrimaryWhistleblowerReceiver: true,
      canViewConfidentialIdentities: true,
      receiveAlertNotifications: true,
      assignedCommittees: ['ExCom'],
      status: 'active',
    });
    expect(db.prisma.executiveMember.create.mock.calls[0][0].data.assignedCommitteesJson).toBe(
      '["ExCom"]'
    );
    db.prisma.executiveMember.updateMany.mockResolvedValue({ count: 0 });
    await expect(executives.updateExecutiveMember('gone', { status: 'inactive' })).rejects.toThrow(
      'NOT_FOUND'
    );
  });
});

describe('executive reset', () => {
  it('replaces the roster with the demo executives', async () => {
    db.prisma.executiveMember.updateMany.mockReturnValue({});
    db.prisma.executiveMember.createMany = vi.fn().mockReturnValue({});
    await executives.resetExecutivesToDefault();
    expect(db.prisma.executiveMember.createMany.mock.calls[0][0].data.length).toBeGreaterThan(0);
  });
});

describe('gatekeeper officers', () => {
  it('diffs the saved list: creates new ids, updates kept ones, soft-deletes the rest, one lead', async () => {
    db.tx.gatekeeperOfficer.findMany.mockResolvedValue([{ id: 'keep' }, { id: 'drop' }]);
    const officer = (id: string, isLead: boolean) => ({
      id,
      name: id,
      email: `${id}@ube.co.th`,
      roleTitle: 'GK',
      isLead,
    });
    await gatekeeper.updateDepartmentGatekeeperConfig('HR', {
      officers: [officer('keep', true), officer('usr-new', false)],
      leadOfficer: officer('usr-new', true),
    });
    expect(db.tx.gatekeeperOfficer.updateMany.mock.calls[0][0].where).toEqual({
      id: { in: ['drop'] },
    });
    expect(db.tx.gatekeeperOfficer.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'keep' },
      data: { isLead: false },
    });
    expect(db.tx.gatekeeperOfficer.create.mock.calls[0][0].data).toMatchObject({
      category: 'HR',
      isLead: true,
    });
  });

  it('refuses an empty officer list and an unknown category', async () => {
    await expect(
      gatekeeper.updateDepartmentGatekeeperConfig('HR', { officers: [] })
    ).rejects.toThrow();
    await expect(
      gatekeeper.updateDepartmentGatekeeperConfig('Nope' as never, { departmentName: 'x' })
    ).rejects.toThrow();
  });

  it('reset recreates the demo officers for every department', async () => {
    await gatekeeper.resetGatekeeperConfigsToDefault();
    expect(db.tx.gatekeeperOfficer.updateMany).toHaveBeenCalled();
    expect(db.tx.departmentGatekeeperConfig.update).toHaveBeenCalledTimes(6);
  });
});

describe('RBAC matrix', () => {
  it('never lets admin lose the RBAC tab or the manage-RBAC flag', async () => {
    await expect(
      roleAccess.updateRoleAccessConfig('admin', { allowedTabs: ['submit'] })
    ).rejects.toThrow('ADMIN_LOCKOUT');
    await expect(
      roleAccess.updateRoleAccessConfig('admin', { canManageRolePermissions: false })
    ).rejects.toThrow('ADMIN_LOCKOUT');
    expect(db.prisma.roleAccessConfig.update).not.toHaveBeenCalled();
  });

  it('rejects unknown tabs and stores de-duplicated JSON', async () => {
    await expect(
      roleAccess.updateRoleAccessConfig('employee', { allowedTabs: ['hack' as AppTabId] })
    ).rejects.toThrow();
    db.prisma.roleAccessConfig.update.mockResolvedValue({
      ...INITIAL_ROLE_PERMISSIONS.employee,
      allowedTabsJson: '["submit"]',
      assignedDepartmentsJson: '[]',
      updatedAt: new Date(),
    });
    await roleAccess.updateRoleAccessConfig('employee', { allowedTabs: ['submit', 'submit'] });
    expect(db.prisma.roleAccessConfig.update.mock.calls[0][0].data.allowedTabsJson).toBe(
      '["submit"]'
    );
  });

  it('saves only the roles that changed and resets every role', async () => {
    db.prisma.roleAccessConfig.update.mockResolvedValue({});
    const next = {
      ...INITIAL_ROLE_PERMISSIONS,
      employee: { ...INITIAL_ROLE_PERMISSIONS.employee, canViewDirectCeoTickets: true },
    };
    await roleAccess.saveRoleAccessConfigs(next);
    expect(db.prisma.roleAccessConfig.update.mock.calls.map((c) => c[0].where.role)).toContain(
      'employee'
    );
    db.prisma.roleAccessConfig.update.mockClear();
    await roleAccess.resetRolePermissionsToDefault();
    expect(db.prisma.roleAccessConfig.update).toHaveBeenCalledTimes(4);
  });
});
