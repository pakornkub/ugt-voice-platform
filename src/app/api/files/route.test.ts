import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fileCaller: vi.fn() }));
vi.mock('@/lib/env', () => ({
  env: {
    BETTER_AUTH_URL: 'https://ugtweb.ube.co.th',
    APP_URL: 'https://ugtweb.ube.co.th',
    UPLOAD_MAX_BYTES: String(5 * 1024 * 1024),
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/storage', () => ({}));
vi.mock('@/lib/attachment-access', () => ({ fileCaller: mocks.fileCaller }));

const { POST } = await import('./route');

const post = (headers: Record<string, string>) =>
  POST(new Request('https://ugtweb.ube.co.th/api/files', { method: 'POST', headers }));

describe('POST /api/files guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fileCaller.mockResolvedValue({ userId: 'u1', label: 'u1', mayUseTicket: vi.fn() });
  });

  it('refuses a request from another origin before looking at the caller', async () => {
    const res = await post({ origin: 'https://other.ube.co.th' });
    expect(res.status).toBe(403);
    expect(mocks.fileCaller).not.toHaveBeenCalled();
  });

  it('refuses an oversized body from its Content-Length before reading it', async () => {
    const res = await post({
      origin: 'https://ugtweb.ube.co.th',
      'content-length': String(50 * 1024 * 1024),
    });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: { code: 'FILE_TOO_LARGE', maxMb: 5 } });
  });

  it('answers 401 when there is neither a session nor a portal ticket', async () => {
    mocks.fileCaller.mockResolvedValue('UNAUTHORIZED');
    const res = await post({ origin: 'https://ugtweb.ube.co.th' });
    expect(res.status).toBe(401);
  });
});
