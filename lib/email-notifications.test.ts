import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EMAIL_SETTINGS } from '@/services/emailDefaults';
import type { EmailNotificationSettings } from '@/types';

const db = vi.hoisted(() => ({
  prisma: {
    appSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    emailDispatchLog: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    departmentGatekeeperConfig: { findFirst: vi.fn() },
    roleAccessConfig: { findFirst: vi.fn() },
  },
}));
const mail = vi.hoisted(() => ({ sendRenderedMail: vi.fn() }));

vi.mock('@/lib/prisma', () => db);
vi.mock('@/lib/email', () => mail);
vi.mock('@/lib/ticket-access', () => ({}));
vi.mock('@/lib/env', () => ({
  env: {
    APP_URL: 'https://ugtweb.ube.co.th/',
    BETTER_AUTH_URL: 'https://fallback.example',
    NEXT_PUBLIC_BASE_PATH: '/ugt-voice-platform',
  },
}));

const {
  clearDispatchLogs,
  listDispatchLogs,
  loadEmailSettings,
  mailActorFor,
  notifyTicketResolved,
  notifyTicketSubmitted,
  parseStoredSettings,
  renderBodyHtml,
  sendTestNotification,
  storeEmailSettings,
  trackingUrlFor,
} = await import('./email-notifications');

const actor = { email: 'staff@ube.com', hasDevMode: false };
const ctx = { actor, userId: 'user-1' };

const ticket = (overrides: Record<string, unknown> = {}) => ({
  id: 'tk1',
  trackingCode: 'TK-2026-1111',
  category: 'HR',
  title: 'เรื่องทดสอบ',
  description: 'รายละเอียดเรื่อง',
  urgency: 'High',
  confidentiality: 'standard_named',
  isDirectToExecutive: false,
  submitterName: 'สมชาย ใจดี',
  submitterDepartment: 'ฝ่ายผลิต',
  submitterEmail: 'somchai@ube.com',
  loginEmail: 'somchai@ube.com',
  createdAt: new Date('2026-10-09T03:00:00Z'),
  ...overrides,
});

const officer = (overrides: Record<string, unknown> = {}) => ({
  name: 'วิภาวรรณ',
  email: 'lead.hr@ube.com',
  isLead: true,
  ...overrides,
});

const gkConfig = (officers = [officer()], escalationEmail: string | null = null) => ({
  officers,
  escalationEmail,
});

function useSettings(settings: Partial<EmailNotificationSettings> = {}) {
  db.prisma.appSetting.findUnique.mockResolvedValue({
    value: JSON.stringify({ ...DEFAULT_EMAIL_SETTINGS, ...settings }),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  });
}

const lastLog = () => db.prisma.emailDispatchLog.create.mock.calls.at(-1)![0].data;

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  db.prisma.appSetting.findUnique.mockResolvedValue(null);
  db.prisma.departmentGatekeeperConfig.findFirst.mockResolvedValue(gkConfig());
  db.prisma.roleAccessConfig.findFirst.mockResolvedValue({ canViewDirectCeoTickets: true });
  db.prisma.emailDispatchLog.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'log-1',
      createdAt: new Date('2026-10-09T04:00:00Z'),
      ticketId: null,
      deliveryChannel: null,
      errorMessage: null,
      ...data,
    })
  );
  mail.sendRenderedMail.mockResolvedValue(undefined);
});

describe('settings storage', () => {
  it('falls back to the defaults when nothing is stored', async () => {
    expect(await loadEmailSettings()).toEqual(DEFAULT_EMAIL_SETTINGS);
  });

  it('reads a stored row and keeps its updatedAt', async () => {
    useSettings({ masterEnabled: false, updatedAt: '2026-10-05T00:00:00.000Z' });
    expect(await loadEmailSettings()).toMatchObject({
      masterEnabled: false,
      updatedAt: '2026-10-05T00:00:00.000Z',
    });
  });

  it('merges missing template fields with the defaults, like upstream', () => {
    const parsed = parseStoredSettings(
      JSON.stringify({ onTicketResolved: { enabled: false } }),
      new Date('2026-10-02T00:00:00Z')
    );
    expect(parsed.onTicketResolved.enabled).toBe(false);
    expect(parsed.onTicketResolved.subject).toBe(DEFAULT_EMAIL_SETTINGS.onTicketResolved.subject);
    expect(parsed.updatedAt).toBe('2026-10-02T00:00:00.000Z');
  });

  it.each([
    ['corrupt JSON', '{not json'],
    ['a blank subject', JSON.stringify({ onTicketSubmitted: { subject: '   ' } })],
    ['a non-boolean switch', JSON.stringify({ masterEnabled: 'yes' })],
    ['a non-object', '"text"'],
  ])('uses the defaults for %s', (_name, raw) => {
    expect(parseStoredSettings(raw, new Date())).toMatchObject({
      masterEnabled: true,
      onTicketSubmitted: DEFAULT_EMAIL_SETTINGS.onTicketSubmitted,
      onTicketResolved: DEFAULT_EMAIL_SETTINGS.onTicketResolved,
    });
  });

  it('upserts the single settings row with the acting user and a fresh updatedAt', async () => {
    const saved = await storeEmailSettings(
      {
        masterEnabled: false,
        onTicketSubmitted: DEFAULT_EMAIL_SETTINGS.onTicketSubmitted,
        onTicketResolved: DEFAULT_EMAIL_SETTINGS.onTicketResolved,
      },
      'user-1'
    );
    const args = db.prisma.appSetting.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ key: 'email.notification-settings' });
    expect(args.create.updatedBy).toBe('user-1');
    expect(JSON.parse(args.update.value)).toMatchObject({ masterEnabled: false });
    expect(saved.updatedAt).not.toBe(DEFAULT_EMAIL_SETTINGS.updatedAt);
  });
});

describe('dispatch log storage', () => {
  it('lists the latest 100 live rows, newest first', async () => {
    db.prisma.emailDispatchLog.findMany.mockResolvedValue([
      {
        id: 'a',
        createdAt: new Date('2026-10-09T01:00:00Z'),
        triggerEvent: 'ticket_submitted',
        ticketId: null,
        trackingCode: 'TK-1',
        recipientEmail: 'x@y.z',
        recipientName: 'X',
        recipientRole: 'gatekeeper',
        subject: 's',
        body: 'b',
        status: 'failed',
        deliveryChannel: null,
        errorMessage: 'boom',
      },
    ]);
    const logs = await listDispatchLogs();
    expect(db.prisma.emailDispatchLog.findMany).toHaveBeenCalledWith({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    expect(logs[0]).toMatchObject({
      id: 'a',
      trigger: 'ticket_submitted',
      ticketId: '',
      status: 'failed',
      errorMessage: 'boom',
      timestamp: '2026-10-09T01:00:00.000Z',
    });
  });

  it('clears by soft delete', async () => {
    await clearDispatchLogs('user-1');
    expect(db.prisma.emailDispatchLog.updateMany).toHaveBeenCalledWith({
      where: { isDeleted: false },
      data: { isDeleted: true, isActive: false, updatedBy: 'user-1' },
    });
  });
});

describe('rendering helpers', () => {
  it('escapes markup, keeps line breaks and links only our own tracking URL', () => {
    const url = 'https://ugtweb.ube.co.th/app/#tracking=TK-1';
    const html = renderBodyHtml(`<script>alert(1)</script>\r\nline2 & ${url}`, url);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<br>line2 &amp; ');
    expect(html).toContain(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  });

  it('renders without a link when no URL is given', () => {
    expect(renderBodyHtml('plain')).not.toContain('<a ');
  });

  it('links to the gatekeeper inbox or the tracking page under APP_URL + basePath', () => {
    expect(trackingUrlFor('/gatekeeper')).toBe(
      'https://ugtweb.ube.co.th/ugt-voice-platform/gatekeeper'
    );
    expect(trackingUrlFor('/my-tickets')).toBe(
      'https://ugtweb.ube.co.th/ugt-voice-platform/my-tickets'
    );
  });

  it('gives no dev mode on the production basePath, not even to admin', () => {
    // env mock uses '/ugt-voice-platform' — dev mode exists only on '-dev' (permissionsFor).
    expect(mailActorFor({ email: 'a@x', role: 'admin', config: undefined })).toEqual({
      email: 'a@x',
      hasDevMode: false,
    });
    expect(mailActorFor({ email: 'e@x', role: 'employee', config: undefined }).hasDevMode).toBe(
      false
    );
  });
});

describe('notifyTicketSubmitted', () => {
  it("mails the category's Lead Gatekeeper with the interpolated, escaped template and logs it", async () => {
    await notifyTicketSubmitted(ticket({ title: '<b>แย่</b> & "มาก"' }), ctx);

    const mailArgs = mail.sendRenderedMail.mock.calls[0][0];
    expect(mailArgs).toMatchObject({ to: 'lead.hr@ube.com', actor });
    expect(mailArgs.subject).toContain('TK-2026-1111');
    expect(mailArgs.subject).toContain('High');
    expect(mailArgs.html).toContain('&lt;b&gt;แย่&lt;/b&gt; &amp; &quot;มาก&quot;');
    expect(mailArgs.html).not.toContain('<b>แย่');
    expect(mailArgs.html).toContain('https://ugtweb.ube.co.th/ugt-voice-platform/gatekeeper');
    expect(lastLog()).toMatchObject({
      triggerEvent: 'ticket_submitted',
      ticketId: 'tk1',
      trackingCode: 'TK-2026-1111',
      recipientEmail: 'lead.hr@ube.com',
      recipientRole: 'gatekeeper',
      status: 'sent',
      createdBy: 'user-1',
    });
    expect(lastLog().body).toContain('สมชาย ใจดี');
  });

  it('mails the auto-assigned officer with the Lead in CC, and logs the assignee', async () => {
    await notifyTicketSubmitted(
      ticket({ assignedOfficerName: 'สมศรี', assignedOfficerEmail: 'somsri@ube.com' }),
      ctx
    );
    expect(mail.sendRenderedMail.mock.calls[0][0]).toMatchObject({
      to: 'somsri@ube.com',
      cc: 'lead.hr@ube.com',
    });
    expect(lastLog()).toMatchObject({ recipientEmail: 'somsri@ube.com', recipientName: 'สมศรี' });
  });

  it('does not CC the Lead when the Lead is the assignee', async () => {
    await notifyTicketSubmitted(
      ticket({ assignedOfficerName: 'Lead', assignedOfficerEmail: 'LEAD.hr@ube.com' }),
      ctx
    );
    expect(mail.sendRenderedMail.mock.calls[0][0].cc).toBeUndefined();
  });

  it('passes the actor through so dev mode redirects the mail', async () => {
    const devActor = { email: 'tester@ube.com', hasDevMode: true };
    await notifyTicketSubmitted(ticket(), { actor: devActor, userId: 'u' });
    expect(mail.sendRenderedMail.mock.calls[0][0].actor).toBe(devActor);
  });

  it('logs "disabled" and sends nothing when the master switch is off', async () => {
    useSettings({ masterEnabled: false });
    await notifyTicketSubmitted(ticket(), ctx);
    expect(mail.sendRenderedMail).not.toHaveBeenCalled();
    expect(lastLog().status).toBe('disabled');
  });

  it('logs "disabled" when only this trigger is switched off', async () => {
    useSettings({
      onTicketSubmitted: { ...DEFAULT_EMAIL_SETTINGS.onTicketSubmitted, enabled: false },
    });
    await notifyTicketSubmitted(ticket(), ctx);
    expect(mail.sendRenderedMail).not.toHaveBeenCalled();
    expect(lastLog().status).toBe('disabled');
  });

  it('falls back to the first officer, then to the department escalation address', async () => {
    db.prisma.departmentGatekeeperConfig.findFirst.mockResolvedValue(
      gkConfig([officer({ isLead: false, email: 'first@ube.com' })])
    );
    await notifyTicketSubmitted(ticket(), ctx);
    expect(mail.sendRenderedMail.mock.calls[0][0].to).toBe('first@ube.com');

    db.prisma.departmentGatekeeperConfig.findFirst.mockResolvedValue(
      gkConfig([], 'escalation@ube.com')
    );
    await notifyTicketSubmitted(ticket(), ctx);
    expect(mail.sendRenderedMail.mock.calls[1][0].to).toBe('escalation@ube.com');
  });

  it('logs "failed" instead of inventing an address when nobody can receive it', async () => {
    db.prisma.departmentGatekeeperConfig.findFirst.mockResolvedValue(null);
    await notifyTicketSubmitted(ticket(), ctx);
    expect(mail.sendRenderedMail).not.toHaveBeenCalled();
    expect(lastLog()).toMatchObject({
      status: 'failed',
      errorMessage: 'No recipient email address',
      recipientEmail: '-',
    });
  });

  it('records a delivery failure as a "failed" row and does not throw', async () => {
    mail.sendRenderedMail.mockRejectedValue(new Error('SMTP down'));
    await expect(notifyTicketSubmitted(ticket(), ctx)).resolves.toBeUndefined();
    expect(lastLog()).toMatchObject({ status: 'failed', errorMessage: 'SMTP down' });
  });

  it('never throws, even when settings or the log table are unreachable', async () => {
    db.prisma.appSetting.findUnique.mockRejectedValue(new Error('db down'));
    await expect(notifyTicketSubmitted(ticket(), ctx)).resolves.toBeUndefined();

    db.prisma.appSetting.findUnique.mockResolvedValue(null);
    db.prisma.emailDispatchLog.create.mockRejectedValue(new Error('log write failed'));
    await expect(notifyTicketSubmitted(ticket(), ctx)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('hides an anonymous submitter: no name, department or address reaches the gatekeeper', async () => {
    await notifyTicketSubmitted(ticket({ confidentiality: 'anonymous' }), ctx);
    const { html, subject } = mail.sendRenderedMail.mock.calls[0][0];
    for (const text of [html, subject, lastLog().body]) {
      expect(text).not.toContain('สมชาย');
      expect(text).not.toContain('ฝ่ายผลิต');
      expect(text).not.toContain('somchai@ube.com');
    }
    expect(lastLog().body).toContain('ผู้ยื่นเรื่องนิรนาม (Anonymous)');
    expect(lastLog().body).toContain('ไม่เปิดเผยสังกัด');
  });

  it('hides a confidential_restricted submitter the same way', async () => {
    await notifyTicketSubmitted(ticket({ confidentiality: 'confidential_restricted' }), ctx);
    expect(lastLog().body).not.toContain('สมชาย');
    expect(lastLog().body).toContain('ปกปิดตัวตน');
  });

  it('does not mail a direct-to-executive ticket to a gatekeeper role that may not view it', async () => {
    db.prisma.roleAccessConfig.findFirst.mockResolvedValue({ canViewDirectCeoTickets: false });
    await notifyTicketSubmitted(ticket({ isDirectToExecutive: true }), ctx);
    expect(mail.sendRenderedMail).not.toHaveBeenCalled();
    expect(lastLog()).toMatchObject({ status: 'disabled' });
    expect(lastLog().errorMessage).toContain('Direct-to-executive');
    // the withheld ticket text is not kept in the log either
    expect(lastLog().body).not.toContain(ticket().description ?? '__none__');
    expect(lastLog().body).toContain('ไม่ได้ส่ง');

    db.prisma.roleAccessConfig.findFirst.mockResolvedValue(null);
    await notifyTicketSubmitted(ticket({ isDirectToExecutive: true }), ctx);
    expect(mail.sendRenderedMail).not.toHaveBeenCalled();
  });

  it('does send a direct-to-executive ticket when the gatekeeper role may view it', async () => {
    await notifyTicketSubmitted(ticket({ isDirectToExecutive: true }), ctx);
    expect(mail.sendRenderedMail).toHaveBeenCalledTimes(1);
  });

  it('flattens line breaks in the subject (no header injection)', async () => {
    useSettings({
      onTicketSubmitted: {
        enabled: true,
        subject: 'Subject {title}',
        body: 'Body',
      },
    });
    await notifyTicketSubmitted(ticket({ title: 'a\r\nBcc: evil@example.com' }), ctx);
    expect(mail.sendRenderedMail.mock.calls[0][0].subject).toBe('Subject a Bcc: evil@example.com');
  });
});

describe('notifyTicketResolved', () => {
  const details = { resolvedBy: 'Gatekeeper Supervisor', resolutionNotes: 'แก้แล้ว <ok>' };

  it('mails the submitter with the resolution summary and logs it', async () => {
    await notifyTicketResolved(ticket(), details, ctx);
    const mailArgs = mail.sendRenderedMail.mock.calls[0][0];
    expect(mailArgs.to).toBe('somchai@ube.com');
    expect(mailArgs.html).toContain('แก้แล้ว &lt;ok&gt;');
    expect(mailArgs.bannerTo).toBeUndefined();
    expect(lastLog()).toMatchObject({
      triggerEvent: 'ticket_resolved',
      recipientRole: 'employee',
      recipientEmail: 'somchai@ube.com',
      recipientName: 'สมชาย ใจดี',
      status: 'sent',
    });
    expect(lastLog().body).toContain('Gatekeeper Supervisor');
  });

  it('mails the signed-in login email first, never a typed submitter address', async () => {
    await notifyTicketResolved(
      ticket({ loginEmail: 'real@ube.com', submitterEmail: 'typed@elsewhere.com' }),
      details,
      ctx
    );
    expect(mail.sendRenderedMail.mock.calls[0][0].to).toBe('real@ube.com');
  });

  it('uses the login email when the submitter email is empty, and fails when there is none', async () => {
    await notifyTicketResolved(ticket({ submitterEmail: null }), details, ctx);
    expect(mail.sendRenderedMail.mock.calls[0][0].to).toBe('somchai@ube.com');

    await notifyTicketResolved(ticket({ submitterEmail: null, loginEmail: null }), details, ctx);
    expect(mail.sendRenderedMail).toHaveBeenCalledTimes(1);
    expect(lastLog().status).toBe('failed');
  });

  it('respects both switches', async () => {
    useSettings({
      onTicketResolved: { ...DEFAULT_EMAIL_SETTINGS.onTicketResolved, enabled: false },
    });
    await notifyTicketResolved(ticket(), details, ctx);
    expect(mail.sendRenderedMail).not.toHaveBeenCalled();
    expect(lastLog().status).toBe('disabled');
  });

  it('mails an anonymous submitter but never shows their address or name in the log or the dev banner', async () => {
    await notifyTicketResolved(ticket({ confidentiality: 'anonymous' }), details, ctx);
    const mailArgs = mail.sendRenderedMail.mock.calls[0][0];
    expect(mailArgs.to).toBe('somchai@ube.com');
    expect(mailArgs.bannerTo).toBe('anonymous-submitter@voiceplatform.internal');
    expect(mailArgs.html).not.toContain('สมชาย');
    expect(lastLog()).toMatchObject({
      recipientEmail: 'anonymous-submitter@voiceplatform.internal',
      recipientName: 'ผู้ยื่นเรื่อง (Anonymous Submitter)',
      status: 'sent',
    });
    expect(lastLog().body).not.toContain('somchai@ube.com');
  });

  it('masks a confidential_restricted submitter too', async () => {
    await notifyTicketResolved(
      ticket({ confidentiality: 'confidential_restricted' }),
      details,
      ctx
    );
    expect(lastLog().recipientEmail).toBe('anonymous-submitter@voiceplatform.internal');
    expect(lastLog().recipientName).toContain('ปกปิดตัวตน');
  });

  it('records a delivery failure and does not throw', async () => {
    mail.sendRenderedMail.mockRejectedValue('weird');
    await expect(notifyTicketResolved(ticket(), details, ctx)).resolves.toBeUndefined();
    expect(lastLog()).toMatchObject({ status: 'failed', errorMessage: 'Unknown error' });
  });

  it('fills defaults for missing summary / officer and never throws on a broken log table', async () => {
    await notifyTicketResolved(ticket(), { resolvedBy: '', resolutionNotes: '' }, ctx);
    expect(lastLog().body).toContain('เจ้าหน้าที่ผู้รับผิดชอบ');

    db.prisma.emailDispatchLog.create.mockRejectedValue(new Error('nope'));
    await expect(notifyTicketResolved(ticket(), details, ctx)).resolves.toBeUndefined();
  });
});

describe('sendTestNotification', () => {
  const testCtx = { ...ctx, email: 'admin@ube.com' };

  it('mails the signed-in admin only, tags the subject and logs a test_dispatch', async () => {
    const log = await sendTestNotification('ticket_resolved', testCtx);
    const mailArgs = mail.sendRenderedMail.mock.calls[0][0];
    expect(mailArgs.to).toBe('admin@ube.com');
    expect(mailArgs.subject.startsWith('[TEST SIMULATION] ')).toBe(true);
    expect(lastLog()).toMatchObject({
      triggerEvent: 'test_dispatch',
      recipientRole: 'test',
      trackingCode: 'TK-2026-TEST',
      status: 'sent',
    });
    expect(log).toMatchObject({ trigger: 'test_dispatch', status: 'sent' });
  });

  it('sends even when the master switch is off (a test is still a test)', async () => {
    useSettings({ masterEnabled: false });
    await sendTestNotification('ticket_submitted', testCtx);
    expect(mail.sendRenderedMail).toHaveBeenCalledTimes(1);
  });

  it('returns a failed log when SMTP rejects', async () => {
    mail.sendRenderedMail.mockRejectedValue(
      new Error('SMTP_HOST environment variable is required')
    );
    const log = await sendTestNotification('ticket_submitted', testCtx);
    expect(log).toMatchObject({
      status: 'failed',
      errorMessage: 'SMTP_HOST environment variable is required',
    });
  });
});
