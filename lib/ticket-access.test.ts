import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveRosterRole: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    roleAccessConfig: { findFirst: vi.fn() },
    ticket: { findMany: vi.fn(), findFirst: vi.fn() },
    notification: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    notificationRead: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/roster-role', async (importActual) => ({
  ...(await importActual<typeof import('./roster-role')>()),
  resolveRosterRole: mocks.resolveRosterRole,
}));

const { getTicketViewer, listVisibleNotifications, listVisibleTickets, requireTicketViewer } =
  await import('./ticket-access');
const { INITIAL_ROLE_PERMISSIONS } = await import('@/services/api');
const { markAllNotificationsAsRead, markNotificationAsRead } =
  await import('./actions/notifications');

const NOW = new Date('2026-10-09T00:00:00Z');
const notif = (
  id: string,
  ticketId: string | null,
  isRead = false,
  recipientEmail: string | null = null
) => ({
  id,
  ticketId,
  trackingCode: 'TK-2026-1111',
  title: 't',
  message: 'm',
  type: 'status_update',
  recipientRole: 'employee',
  recipientEmail,
  isRead,
  createdAt: NOW,
  updatedAt: NOW,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveRosterRole.mockResolvedValue({ role: 'employee', officerCategories: [] });
});

describe('getTicketViewer', () => {
  it('is null without a session or without a user row', async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    expect(await getTicketViewer()).toBeNull();

    mocks.getSession.mockResolvedValueOnce({ user: { id: 'u1' } });
    mocks.prisma.user.findUnique.mockResolvedValueOnce(null);
    expect(await getTicketViewer()).toBeNull();

    mocks.getSession.mockResolvedValueOnce(null);
    await expect(requireTicketViewer()).rejects.toThrow('UNAUTHORIZED');
  });

  it('takes the role from the rosters, scoped to officer categories within the RBAC ceiling', async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: 'u1' } });
    mocks.resolveRosterRole.mockResolvedValueOnce({
      role: 'gatekeeper',
      officerCategories: ['Quality', 'HR'],
    });
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      name: 'Gate Keeper',
      email: 'a@ube.com',
      userRole: { name: 'Administrator' },
    });
    mocks.prisma.roleAccessConfig.findFirst.mockResolvedValueOnce({
      role: 'gatekeeper',
      allowedTabsJson: '["gatekeeper"]',
      assignedDepartmentsJson: '["Quality"]',
      canViewDirectCeoTickets: false,
    });

    const viewer = await getTicketViewer();

    expect(viewer).toMatchObject({
      userId: 'u1',
      email: 'a@ube.com',
      name: 'Gate Keeper',
      rbacRoleName: 'Administrator',
      role: 'gatekeeper',
      config: { allowedTabs: ['gatekeeper'], assignedDepartments: ['Quality'] },
      gatekeeperCategories: ['Quality'],
    });
  });
});

const employee = {
  userId: 'u1',
  email: 'a@ube.com',
  name: 'A',
  rbacRoleName: null,
  role: 'employee' as const,
  config: INITIAL_ROLE_PERMISSIONS.employee,
  gatekeeperCategories: [],
};

describe('listVisibleTickets', () => {
  it('redacts identities the viewer may not see before they leave the server', async () => {
    mocks.prisma.ticket.findMany.mockResolvedValueOnce([
      {
        id: 't1',
        trackingCode: 'TK-2026-0001',
        type: 'complaint',
        category: 'HR',
        title: 't',
        description: 'd',
        isDirectToExecutive: false,
        confidentiality: 'anonymous',
        submitterName: 'Real Name',
        submitterEmployeeId: 'EMP9',
        submitterEmail: 'whistle@ube.com',
        loginEmail: 'whistle@ube.com',
        isAnonymousMapped: true,
        gatekeeperDepartment: 'HR',
        status: 'submitted',
        urgency: 'Medium',
        riskSeverity: 'Moderate',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);
    const gatekeeper = {
      ...employee,
      email: 'gk@ube.com',
      role: 'gatekeeper' as const,
      config: INITIAL_ROLE_PERMISSIONS.gatekeeper,
      gatekeeperCategories: ['HR' as const],
    };

    const [ticket] = await listVisibleTickets(gatekeeper);

    expect(ticket.loginEmail).toBeUndefined();
    expect(ticket.submitterEmployeeId).toBeUndefined();
    expect(ticket.submitterName).toBe('ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)');
  });
});

describe('notifications follow ticket visibility', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1' } });
    mocks.prisma.user.findUnique.mockResolvedValue({ email: 'a@ube.com' });
    mocks.prisma.roleAccessConfig.findFirst.mockResolvedValue(null);
    mocks.prisma.ticket.findMany.mockResolvedValue([{ id: 'mine' }]);
    mocks.prisma.notification.findMany.mockResolvedValue([
      notif('n1', 'mine'),
      notif('n2', 'theirs'),
      notif('n3', null),
      notif('n4', 'mine', true, 'someone.else@ube.com'),
      notif('n5', 'mine', true, 'A@ube.com'),
    ]);
    // this viewer has read n4 and n5
    mocks.prisma.notificationRead.findMany.mockResolvedValue([
      { notificationId: 'n4' },
      { notificationId: 'n5' },
    ]);
  });

  it('takes read state from the viewer’s own NotificationReads, not the shared flag', async () => {
    mocks.prisma.notificationRead.findMany.mockResolvedValue([]);
    const list = await listVisibleNotifications(employee, ['mine']);
    expect(list.every((n) => !n.read)).toBe(true);
    expect(mocks.prisma.notificationRead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', isDeleted: false } })
    );
  });

  it('lists only notifications of visible tickets', async () => {
    const list = await listVisibleNotifications(employee, ['mine']);
    expect(list.map((n) => n.id)).toEqual(['n1', 'n4', 'n5']);
  });

  it('strips the recipient email from notifications addressed to someone else', async () => {
    const list = await listVisibleNotifications(employee, ['mine']);
    expect(list.find((n) => n.id === 'n4')?.recipientEmail).toBeUndefined();
    expect(list.find((n) => n.id === 'n5')?.recipientEmail).toBe('A@ube.com');
  });

  it('marks one visible notification and refuses others', async () => {
    const list = await markNotificationAsRead('n1');
    expect(list.find((n) => n.id === 'n1')?.read).toBe(true);
    expect(mocks.prisma.notificationRead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { notificationId_userId: { notificationId: 'n1', userId: 'u1' } },
      })
    );
    expect(mocks.prisma.notification.update).not.toHaveBeenCalled();

    await expect(markNotificationAsRead('n2')).rejects.toThrow('FORBIDDEN');
  });

  it('marks all of the caller’s unread notifications only', async () => {
    const list = await markAllNotificationsAsRead();
    expect(list.every((n) => n.read)).toBe(true);
    expect(mocks.prisma.notificationRead.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.notificationRead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { notificationId_userId: { notificationId: 'n1', userId: 'u1' } },
        update: expect.objectContaining({ isDeleted: false }),
      })
    );
  });

  it('reports a failed mark-all instead of pretending it worked', async () => {
    mocks.prisma.$transaction.mockRejectedValueOnce(new Error('db down'));
    await expect(markAllNotificationsAsRead()).rejects.toThrow('db down');
  });
});
