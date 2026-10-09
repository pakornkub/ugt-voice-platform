import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUserPermissions: vi.fn(),
}));
vi.mock('@/lib/env', () => ({
  env: {
    BETTER_AUTH_URL: 'https://ugtweb.ube.co.th',
    APP_URL: 'https://ugtweb.ube.co.th',
    UPLOAD_MAX_BYTES: String(5 * 1024 * 1024),
  },
}));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('@/lib/get-user-permissions', () => ({ getUserPermissions: mocks.getUserPermissions }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/storage', () => ({}));
vi.mock('@/lib/attachment-access', () => ({ canReadAttachment: vi.fn() }));

const { POST } = await import('./route');

const post = (headers: Record<string, string>) =>
  POST(new Request('https://ugtweb.ube.co.th/api/files', { method: 'POST', headers }));

describe('POST /api/files guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: 'u1' } });
    mocks.getUserPermissions.mockResolvedValue(['files:create']);
  });

  it('refuses a request from another origin before touching the session', async () => {
    const res = await post({ origin: 'https://other.ube.co.th' });
    expect(res.status).toBe(403);
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it('refuses an oversized body from its Content-Length before reading it', async () => {
    const res = await post({
      origin: 'https://ugtweb.ube.co.th',
      'content-length': String(50 * 1024 * 1024),
    });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: { code: 'FILE_TOO_LARGE', maxMb: 5 } });
  });
});
