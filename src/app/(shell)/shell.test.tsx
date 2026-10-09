import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Shell from './shell';
import { useShell } from '../shell-context';
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

describe('Shell (bilingual)', () => {
  const statusNotification: NotificationItem = {
    ...notification,
    id: 'n2',
    title: 'อัปเดตความคืบหน้า (TK-2026-0001)',
    message:
      'เรื่องของคุณมีการเปลี่ยนสถานะเป็น "กำลังแก้ไข (In Progress)" โดย Gatekeeper Supervisor',
  };

  function ShellActions() {
    const { navigateTab, handleTicketCreated, handleTicketUpdated } = useShell();
    return (
      <>
        <button type="button" onClick={() => navigateTab('gatekeeper')}>
          go-gatekeeper
        </button>
        <button type="button" onClick={() => handleTicketCreated(ticket)}>
          ticket-created
        </button>
        <button type="button" onClick={() => handleTicketUpdated(ticket)}>
          ticket-updated
        </button>
      </>
    );
  }

  const renderLocalized = (
    lang: 'th' | 'en',
    notifications: NotificationItem[] = [statusNotification]
  ) => {
    localStorage.setItem('voiceplatform_lang_preference_v2', lang);
    return render(
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
            notifications,
            rolePermissions: INITIAL_ROLE_PERMISSIONS,
            gatekeeperConfigs: INITIAL_GATEKEEPER_CONFIGS,
            gatekeeperCategories: [],
          }}
        >
          <ShellActions />
        </Shell>
      </LanguageProvider>
    );
  };

  const openDrawer = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(await waitFor(() => document.getElementById('btn-notifications-open')!));

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('keeps the Thai mobile navigation labels in TH', async () => {
    renderLocalized('th');
    expect(await screen.findByText('ยื่นเรื่อง')).toBeInTheDocument();
    expect(screen.getByText('คำร้องของฉัน')).toBeInTheDocument();
  });

  it('shows the mobile navigation labels in English', async () => {
    renderLocalized('en');
    expect(await screen.findByText('My Tickets')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
    expect(screen.queryByText('คำร้องของฉัน')).not.toBeInTheDocument();
  });

  it('translates the notification drawer, including server-written titles and messages', async () => {
    const user = userEvent.setup();
    renderLocalized('en');

    await openDrawer(user);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Ticket status updates & alerts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeInTheDocument();
    expect(screen.getByText('Progress update (TK-2026-0001)')).toBeInTheDocument();
    expect(
      screen.getByText('Your ticket\'s status changed to "In Progress" by Gatekeeper Supervisor')
    ).toBeInTheDocument();
  });

  it('keeps the stored Thai notification text in the drawer in TH', async () => {
    const user = userEvent.setup();
    renderLocalized('th');

    await openDrawer(user);

    expect(screen.getByText(statusNotification.title)).toBeInTheDocument();
    expect(screen.getByText(statusNotification.message)).toBeInTheDocument();
  });

  it('says there are no notifications in English', async () => {
    const user = userEvent.setup();
    renderLocalized('en', []);

    await openDrawer(user);

    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('shows the not-found toast in English', async () => {
    const user = userEvent.setup();
    vi.mocked(getTicketByTrackingCode).mockResolvedValue(null);
    renderLocalized('en');

    await user.type(
      await waitFor(() => document.getElementById('global-tracking-search')!),
      'TK-0000-0000{Enter}'
    );

    expect(
      await screen.findByText(
        'Tracking code "TK-0000-0000" was not found (saved to recent searches)'
      )
    ).toBeInTheDocument();
  });

  it('shows the mark-read failure toast in English', async () => {
    const user = userEvent.setup();
    vi.mocked(markAllNotificationsAsRead).mockRejectedValueOnce(new Error('UNAUTHORIZED'));
    renderLocalized('en');

    await openDrawer(user);
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }));

    expect(
      await screen.findByText('Could not update the notification status. Please try again.')
    ).toBeInTheDocument();
  });

  it('toasts a denied navigation with the English role title', async () => {
    const user = userEvent.setup();
    renderLocalized('en');

    await user.click(await screen.findByRole('button', { name: 'go-gatekeeper' }));

    expect(
      await screen.findByText(
        `⚠️ The "${INITIAL_ROLE_PERMISSIONS.employee.roleTitleEn}" role is not allowed to open this page under the permission matrix`
      )
    ).toBeInTheDocument();
  });

  it('toasts a denied navigation with the Thai role title in TH', async () => {
    const user = userEvent.setup();
    renderLocalized('th');

    await user.click(await screen.findByRole('button', { name: 'go-gatekeeper' }));

    expect(
      await screen.findByText(
        `⚠️ บัญชีในบทบาท "${INITIAL_ROLE_PERMISSIONS.employee.roleTitleTh}" ไม่มีสิทธิ์เข้าถึงหน้านี้ตามเมทริกซ์สิทธิ์`
      )
    ).toBeInTheDocument();
  });

  it('toasts the saved and updated tickets in English', async () => {
    const user = userEvent.setup();
    renderLocalized('en');

    await user.click(await screen.findByRole('button', { name: 'ticket-created' }));
    expect(
      await screen.findByText(`Ticket ${ticket.trackingCode} saved and sent to the Gatekeeper`)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ticket-updated' }));
    expect(
      await screen.findByText(`Ticket ${ticket.trackingCode} updated successfully`)
    ).toBeInTheDocument();
  });

  it('toasts the saved and updated tickets in Thai', async () => {
    const user = userEvent.setup();
    renderLocalized('th');

    await user.click(await screen.findByRole('button', { name: 'ticket-created' }));
    expect(
      await screen.findByText(
        `บันทึกคำร้อง ${ticket.trackingCode} เข้าระบบและส่งไปยัง Gatekeeper แล้ว`
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ticket-updated' }));
    expect(
      await screen.findByText(`อัปเดตสถานะคำร้อง ${ticket.trackingCode} เรียบร้อยแล้ว`)
    ).toBeInTheDocument();
  });
});
