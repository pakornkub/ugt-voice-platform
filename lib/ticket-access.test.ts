import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    roleAccessConfig: { findFirst: vi.fn() },
    ticket: { findMany: vi.fn(), findFirst: vi.fn() },
    notification: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));

const { getTicketViewer, listVisibleNotifications, requireTicketViewer } =
  await import('./ticket-access');
const { markAllNotificationsAsRead, markNotificationAsRead } =
  await import('./actions/notifications');

const NOW = new Date('2026-10-09T00:00:00Z');
const notif = (id: string, ticketId: string | null, isRead = false) => ({
  id,
  ticketId,
  trackingCode: 'TK-2026-1111',
  title: 't',
  message: 'm',
  type: 'status_update',
  recipientRole: 'employee',
  recipientEmail: null,
  isRead,
  createdAt: NOW,
  updatedAt: NOW,
});

beforeEach(() => vi.clearAllMocks());

describe('getTicketViewer', () => {
  it('is null without a session or without an app role', async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    expect(await getTicketViewer()).toBeNull();

    mocks.getSession.mockResolvedValueOnce({ user: { id: 'u1' } });
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ email: 'a@ube.co.th', appRole: null });
    expect(await getTicketViewer()).toBeNull();

    mocks.getSession.mockResolvedValueOnce(null);
    await expect(requireTicketViewer()).rejects.toThrow('UNAUTHORIZED');
  });

  it('carries the role and its RoleAccessConfigs row', async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: 'u1' } });
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      email: 'a@ube.co.th',
      appRole: 'gatekeeper',
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
      email: 'a@ube.co.th',
      role: 'gatekeeper',
      config: { allowedTabs: ['gatekeeper'], assignedDepartments: ['Quality'] },
    });
  });
});

describe('notifications follow ticket visibility', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1' } });
    mocks.prisma.user.findUnique.mockResolvedValue({ email: 'a@ube.co.th', appRole: 'employee' });
    mocks.prisma.roleAccessConfig.findFirst.mockResolvedValue(null);
    mocks.prisma.ticket.findMany.mockResolvedValue([{ id: 'mine' }]);
    mocks.prisma.notification.findMany.mockResolvedValue([
      notif('n1', 'mine'),
      notif('n2', 'theirs'),
      notif('n3', null),
      notif('n4', 'mine', true),
    ]);
  });

  it('lists only notifications of visible tickets', async () => {
    const list = await listVisibleNotifications(['mine']);
    expect(list.map((n) => n.id)).toEqual(['n1', 'n4']);
  });

  it('marks one visible notification and refuses others', async () => {
    const list = await markNotificationAsRead('n1');
    expect(list.find((n) => n.id === 'n1')?.read).toBe(true);
    expect(mocks.prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { isRead: true },
    });

    await expect(markNotificationAsRead('n2')).rejects.toThrow('FORBIDDEN');
  });

  it('marks all of the caller’s unread notifications only', async () => {
    const list = await markAllNotificationsAsRead();
    expect(list.every((n) => n.read)).toBe(true);
    expect(mocks.prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['n1'] } },
      data: { isRead: true },
    });
  });
});
