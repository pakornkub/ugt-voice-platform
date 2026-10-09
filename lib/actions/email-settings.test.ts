// Guards on the email-notification Server Actions (rewiring slice 3): tab permission, input
// validation, audit trail (no subject/body text), server-owned fields.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_ROLE_PERMISSIONS } from '@/services/rosterDefaults';
import { DEFAULT_EMAIL_SETTINGS } from '@/services/emailDefaults';
import type { TicketViewer } from '@/lib/ticket-scope';
import type { AppTabId, UserRole } from '@/types';

const db = vi.hoisted(() => ({ prisma: { activityLog: { create: vi.fn() } } }));
const access = vi.hoisted(() => ({ requireTicketViewer: vi.fn() }));
const notifications = vi.hoisted(() => ({
  loadEmailSettings: vi.fn(),
  storeEmailSettings: vi.fn(),
  listDispatchLogs: vi.fn(),
  clearDispatchLogs: vi.fn(),
  sendTestNotification: vi.fn(),
  mailActorFor: vi.fn(),
}));

vi.mock('@/lib/prisma', () => db);
vi.mock('@/lib/ticket-access', () => access);
vi.mock('@/lib/email-notifications', () => notifications);

const actions = await import('./email-settings');

const viewer = (role: UserRole, tabs: AppTabId[]): TicketViewer => ({
  userId: 'me-id',
  email: 'me@ube.co.th',
  name: 'Me',
  rbacRoleName: null,
  role,
  config: { ...INITIAL_ROLE_PERMISSIONS[role], allowedTabs: tabs },
  gatekeeperCategories: [],
});
const admin = viewer('admin', ['admin_gatekeeper']);

const validInput = () => ({
  masterEnabled: true,
  onTicketSubmitted: { enabled: true, subject: 'S1', body: 'B1' },
  onTicketResolved: { enabled: false, subject: 'S2', body: 'B2' },
});

const WRITES: ReadonlyArray<readonly [string, () => Promise<unknown>]> = [
  ['save', () => actions.saveEmailNotificationSettings(validInput())],
  ['reset', () => actions.resetEmailNotificationSettings()],
  ['clear logs', () => actions.clearEmailDispatchLogs()],
  ['test send', () => actions.sendTestEmailNotification('ticket_submitted')],
];
const READS: ReadonlyArray<readonly [string, () => Promise<unknown>]> = [
  ['get settings', () => actions.getEmailNotificationSettings()],
  ['get logs', () => actions.getEmailDispatchLogs()],
];

beforeEach(() => {
  vi.resetAllMocks();
  access.requireTicketViewer.mockResolvedValue(admin);
  db.prisma.activityLog.create.mockResolvedValue({});
  notifications.loadEmailSettings.mockResolvedValue(DEFAULT_EMAIL_SETTINGS);
  notifications.storeEmailSettings.mockImplementation(async (input) => ({
    ...input,
    updatedAt: 'now',
  }));
  notifications.listDispatchLogs.mockResolvedValue([]);
  notifications.sendTestNotification.mockResolvedValue({ id: 'l1', status: 'sent' });
  notifications.mailActorFor.mockReturnValue({ email: 'me@ube.co.th', hasDevMode: true });
});

describe.each([...READS, ...WRITES])('%s — permission guard', (_name, call) => {
  it('refuses a caller who is not signed in', async () => {
    access.requireTicketViewer.mockRejectedValue(new Error('UNAUTHORIZED'));
    await expect(call()).rejects.toThrow('UNAUTHORIZED');
  });

  it('refuses a role without the Gatekeeper-management or RBAC tab', async () => {
    access.requireTicketViewer.mockResolvedValue(viewer('employee', ['submit', 'my_tickets']));
    await expect(call()).rejects.toThrow('FORBIDDEN');
    expect(notifications.storeEmailSettings).not.toHaveBeenCalled();
    expect(notifications.clearDispatchLogs).not.toHaveBeenCalled();
    expect(notifications.sendTestNotification).not.toHaveBeenCalled();
  });

  it('allows the RBAC-management tab as well (ROSTER_TABS)', async () => {
    access.requireTicketViewer.mockResolvedValue(viewer('admin', ['rbac_management']));
    await expect(call()).resolves.not.toThrow();
  });
});

describe('reads', () => {
  it('returns the stored settings and the latest logs', async () => {
    expect(await actions.getEmailNotificationSettings()).toBe(DEFAULT_EMAIL_SETTINGS);
    notifications.listDispatchLogs.mockResolvedValue([{ id: 'x' }]);
    expect(await actions.getEmailDispatchLogs()).toEqual([{ id: 'x' }]);
  });
});

describe('saveEmailNotificationSettings', () => {
  it('stores the validated settings for the acting user and audits switch states only', async () => {
    const saved = await actions.saveEmailNotificationSettings(validInput());
    expect(notifications.storeEmailSettings).toHaveBeenCalledWith(validInput(), 'me-id');
    expect(saved.updatedAt).toBe('now');

    const audit = db.prisma.activityLog.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({ userId: 'me-id', action: 'email-settings.update' });
    expect(JSON.parse(audit.detail)).toEqual({
      masterEnabled: true,
      onTicketSubmitted: true,
      onTicketResolved: false,
    });
    expect(audit.detail).not.toContain('S1');
    expect(audit.detail).not.toContain('B1');
  });

  it('drops a client-supplied updatedAt (the server owns it)', async () => {
    await actions.saveEmailNotificationSettings({ ...validInput(), updatedAt: '1999-01-01' });
    expect(notifications.storeEmailSettings.mock.calls[0][0]).not.toHaveProperty('updatedAt');
  });

  it.each([
    ['a non-object', null],
    [
      'a missing trigger',
      { masterEnabled: true, onTicketSubmitted: validInput().onTicketSubmitted },
    ],
    ['a non-boolean switch', { ...validInput(), masterEnabled: 'true' }],
    [
      'a blank subject',
      { ...validInput(), onTicketSubmitted: { enabled: true, subject: '  ', body: 'x' } },
    ],
    [
      'an empty body',
      { ...validInput(), onTicketResolved: { enabled: true, subject: 'x', body: '' } },
    ],
    [
      'an over-long subject',
      {
        ...validInput(),
        onTicketSubmitted: { enabled: true, subject: 'x'.repeat(301), body: 'x' },
      },
    ],
    [
      'an over-long body',
      {
        ...validInput(),
        onTicketResolved: { enabled: true, subject: 'x', body: 'x'.repeat(20001) },
      },
    ],
  ])('rejects %s without touching the DB', async (_name, input) => {
    await expect(actions.saveEmailNotificationSettings(input)).rejects.toThrow();
    expect(notifications.storeEmailSettings).not.toHaveBeenCalled();
    expect(db.prisma.activityLog.create).not.toHaveBeenCalled();
  });

  it('does not fail the save when the audit write fails', async () => {
    db.prisma.activityLog.create.mockRejectedValue(new Error('audit down'));
    await expect(actions.saveEmailNotificationSettings(validInput())).resolves.toBeDefined();
  });
});

describe('resetEmailNotificationSettings', () => {
  it('stores the upstream defaults (without their stale updatedAt) and audits it', async () => {
    await actions.resetEmailNotificationSettings();
    const [stored, userId] = notifications.storeEmailSettings.mock.calls[0];
    expect(userId).toBe('me-id');
    expect(stored).toEqual({
      masterEnabled: DEFAULT_EMAIL_SETTINGS.masterEnabled,
      onTicketSubmitted: DEFAULT_EMAIL_SETTINGS.onTicketSubmitted,
      onTicketResolved: DEFAULT_EMAIL_SETTINGS.onTicketResolved,
    });
    expect(db.prisma.activityLog.create.mock.calls[0][0].data.action).toBe('email-settings.reset');
  });
});

describe('clearEmailDispatchLogs', () => {
  it('clears for the acting user and audits it', async () => {
    await actions.clearEmailDispatchLogs();
    expect(notifications.clearDispatchLogs).toHaveBeenCalledWith('me-id');
    expect(db.prisma.activityLog.create.mock.calls[0][0].data.action).toBe('email-logs.clear');
  });
});

describe('sendTestEmailNotification', () => {
  it('sends to the signed-in admin with the dev-mode actor and audits trigger + status only', async () => {
    const log = await actions.sendTestEmailNotification('ticket_resolved');
    expect(log).toEqual({ id: 'l1', status: 'sent' });
    expect(notifications.sendTestNotification).toHaveBeenCalledWith('ticket_resolved', {
      actor: { email: 'me@ube.co.th', hasDevMode: true },
      userId: 'me-id',
      email: 'me@ube.co.th',
    });
    const audit = db.prisma.activityLog.create.mock.calls[0][0].data;
    expect(audit.action).toBe('email-settings.test-send');
    expect(JSON.parse(audit.detail)).toEqual({ trigger: 'ticket_resolved', status: 'sent' });
  });

  it('rejects an unknown trigger before sending anything', async () => {
    await expect(actions.sendTestEmailNotification('test_dispatch')).rejects.toThrow();
    await expect(actions.sendTestEmailNotification(undefined)).rejects.toThrow();
    expect(notifications.sendTestNotification).not.toHaveBeenCalled();
  });
});
