import { beforeEach, describe, expect, it, vi } from 'vitest';

const smtp = vi.hoisted(() => ({ sendMail: vi.fn() }));
const envMock = vi.hoisted(() => ({
  env: {
    SMTP_HOST: 'smtp.example' as string | undefined,
    SMTP_PORT: '25',
    SMTP_SECURE: 'false',
    SMTP_USER: undefined,
    SMTP_PASS: undefined,
    SMTP_FROM: 'noreply@ube.com',
    NEXT_PUBLIC_APP_NAME: 'UGT VoicePlatform',
  },
}));

vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: smtp.sendMail }) },
}));
vi.mock('@/lib/env', () => envMock);
vi.mock('@/lib/prisma', () => ({ prisma: { appSetting: { findUnique: vi.fn() } } }));

const { sendRenderedMail, sendTemplatedMail } = await import('./email');

const base = {
  subject: 'Hello',
  html: '<p>Hi</p>',
  to: 'real@ube.com',
};

beforeEach(() => {
  vi.clearAllMocks();
  envMock.env.SMTP_HOST = 'smtp.example';
  smtp.sendMail.mockResolvedValue(undefined);
});

describe('sendRenderedMail', () => {
  it('sends to the real recipient when the actor is not in dev mode', async () => {
    await sendRenderedMail({ ...base, actor: { email: 'a@ube.com', hasDevMode: false } });
    expect(smtp.sendMail).toHaveBeenCalledWith({
      from: '"UGT VoicePlatform" <noreply@ube.com>',
      to: 'real@ube.com',
      cc: undefined,
      subject: 'Hello',
      html: '<p>Hi</p>',
    });
  });

  it('redirects to the actor in dev mode, drops CC and names the real recipients in a banner', async () => {
    await sendRenderedMail({
      ...base,
      cc: 'boss@ube.com',
      actor: { email: 'tester@ube.com', hasDevMode: true },
    });
    const sent = smtp.sendMail.mock.calls[0][0];
    expect(sent.to).toBe('tester@ube.com');
    expect(sent.cc).toBeUndefined();
    expect(sent.subject).toBe('[DEV] Hello');
    expect(sent.html).toContain('DEV MODE');
    expect(sent.html).toContain('real@ube.com');
    expect(sent.html.endsWith('<p>Hi</p>')).toBe(true);
  });

  it('shows bannerTo instead of the real address when it must stay hidden', async () => {
    await sendRenderedMail({
      ...base,
      bannerTo: 'anonymous-submitter@voiceplatform.internal',
      actor: { email: 'tester@ube.com', hasDevMode: true },
    });
    const { html } = smtp.sendMail.mock.calls[0][0];
    expect(html).toContain('anonymous-submitter@voiceplatform.internal');
    expect(html).not.toContain('real@ube.com');
  });

  it('sends to the real recipient when dev mode has no actor email to redirect to', async () => {
    await sendRenderedMail({ ...base, actor: { email: null, hasDevMode: true } });
    expect(smtp.sendMail.mock.calls[0][0].to).toBe('real@ube.com');
  });

  it('fails fast without SMTP_HOST', async () => {
    envMock.env.SMTP_HOST = undefined;
    await expect(
      sendRenderedMail({ ...base, actor: { email: 'a@ube.com', hasDevMode: false } })
    ).rejects.toThrow('SMTP_HOST');
    expect(smtp.sendMail).not.toHaveBeenCalled();
  });

  it('sendTemplatedMail renders the default template and delivers it through the same dev-mode rule', async () => {
    await sendTemplatedMail({
      templateKey: 'ticket.status_update',
      to: 'real@ube.com',
      vars: { appName: 'App', trackingCode: 'TK-1', notificationTitle: '<i>t</i>' },
      actor: { email: 'tester@ube.com', hasDevMode: true },
    });
    const sent = smtp.sendMail.mock.calls[0][0];
    expect(sent.to).toBe('tester@ube.com');
    expect(sent.subject).toBe('[DEV] [App] อัปเดตสถานะคำร้อง TK-1');
    expect(sent.html).toContain('&lt;i&gt;t&lt;/i&gt;');
  });
});
