import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Shell from './shell';
import { LanguageProvider } from '@/context/LanguageContext';
import { INITIAL_COMPLAINTS, INITIAL_GATEKEEPER_CONFIGS } from '@/mockData';
import { INITIAL_ROLE_PERMISSIONS } from '@/services/api';
import { getTicketByTrackingCode } from '@/lib/actions/tickets';
import { markAllNotificationsAsRead, markNotificationAsRead } from '@/lib/actions/notifications';
import type { NotificationItem } from '@/types';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/my-tickets' }));
vi.mock('@/lib/actions/auth', () => ({ ssoLogoutAction: vi.fn() }));
vi.mock('@/lib/actions/tickets', () => ({ getTicketByTrackingCode: vi.fn() }));
vi.mock('@/lib/actions/notifications', () => ({
  markNotificationAsRead: vi.fn().mockResolvedValue([]),
  markAllNotificationsAsRead: vi.fn().mockResolvedValue([]),
}));

const ticket = INITIAL_COMPLAINTS[0];
const notification: NotificationItem = {
  id: 'n1',
  ticketId: ticket.id,
  trackingCode: ticket.trackingCode,
  title: 'อัปเดตความคืบหน้า',
  message: 'เรื่องของคุณมีการเปลี่ยนสถานะ',
  timestamp: '2026-10-09T00:00:00.000Z',
  read: false,
  type: 'status_update',
};

const renderShell = () =>
  render(
    <LanguageProvider>
      <Shell
        identity={{
          name: 'Test',
          email: 'test@ube.co.th',
          appRole: 'employee',
          roleName: null,
          employee: null,
          permissions: [],
        }}
        data={{
          tickets: INITIAL_COMPLAINTS,
          notifications: [notification],
          rolePermissions: INITIAL_ROLE_PERMISSIONS,
          gatekeeperConfigs: INITIAL_GATEKEEPER_CONFIGS,
          gatekeeperCategories: [],
        }}
      >
        <p>page</p>
      </Shell>
    </LanguageProvider>
  );

describe('Shell (server data + Server Actions)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('looks a searched tracking code up on the server and opens its timeline', async () => {
    const user = userEvent.setup();
    vi.mocked(getTicketByTrackingCode).mockResolvedValue(ticket);
    renderShell();

    await user.type(
      document.getElementById('global-tracking-search')!,
      `${ticket.trackingCode}{Enter}`
    );

    expect(getTicketByTrackingCode).toHaveBeenCalledWith(ticket.trackingCode);
    expect(await screen.findByText(ticket.title)).toBeInTheDocument();
  });

  it('answers an unknown or out-of-scope code with the not-found toast', async () => {
    const user = userEvent.setup();
    vi.mocked(getTicketByTrackingCode).mockRejectedValue(new Error('UNAUTHORIZED'));
    renderShell();

    await user.type(document.getElementById('global-tracking-search')!, 'TK-0000-0000{Enter}');

    expect(await screen.findByText(/ไม่พบรหัสติดตาม "TK-0000-0000"/)).toBeInTheDocument();
  });

  it('tells the user when marking notifications read fails', async () => {
    const user = userEvent.setup();
    vi.mocked(markAllNotificationsAsRead).mockRejectedValueOnce(new Error('UNAUTHORIZED'));
    renderShell();

    await user.click(document.getElementById('btn-notifications-open')!);
    await user.click(screen.getByRole('button', { name: 'อ่านทั้งหมด' }));

    expect(
      await screen.findByText('ไม่สามารถอัปเดตสถานะการแจ้งเตือนได้ กรุณาลองใหม่อีกครั้ง')
    ).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('marks notifications read through the Server Actions and refreshes the server data', async () => {
    const user = userEvent.setup();
    vi.mocked(getTicketByTrackingCode).mockResolvedValue(ticket);
    renderShell();

    await user.click(document.getElementById('btn-notifications-open')!);
    await user.click(screen.getByRole('button', { name: 'อ่านทั้งหมด' }));
    await waitFor(() => expect(markAllNotificationsAsRead).toHaveBeenCalledTimes(1));
    expect(router.refresh).toHaveBeenCalled();

    const drawer = screen.getByText('ศูนย์การแจ้งเตือน (Notifications)').closest('div.relative');
    await user.click(within(drawer as HTMLElement).getByText(notification.title));
    await waitFor(() => expect(markNotificationAsRead).toHaveBeenCalledWith('n1'));
    expect(getTicketByTrackingCode).toHaveBeenCalledWith(ticket.trackingCode);
  });
});
