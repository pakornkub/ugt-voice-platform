import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  resolveViewer: vi.fn(),
  findVisibleTicket: vi.fn(),
  getSession: vi.fn(),
  getUserPermissions: vi.fn(),
  getPublicTicketViewer: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('@/lib/get-user-permissions', () => ({ getUserPermissions: mocks.getUserPermissions }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
vi.mock('@/lib/ticket-access', () => ({
  resolveViewer: mocks.resolveViewer,
  findVisibleTicket: mocks.findVisibleTicket,
  getPublicTicketViewer: mocks.getPublicTicketViewer,
}));

const { canReadAttachment, fileCaller } = await import('./attachment-access');

describe('canReadAttachment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('follows ticket visibility for the roster-resolved viewer', async () => {
    const viewer = { userId: 'u1', role: 'gatekeeper' };
    mocks.findUnique.mockResolvedValue({ email: 'gk@ube.com' });
    mocks.resolveViewer.mockResolvedValue(viewer);
    mocks.findVisibleTicket.mockResolvedValueOnce({ id: 't1' }).mockResolvedValueOnce(null);
    await expect(canReadAttachment('u1', { ticketId: 't1' })).resolves.toBe(true);
    await expect(canReadAttachment('u1', { ticketId: 't2' })).resolves.toBe(false);
    expect(mocks.findVisibleTicket).toHaveBeenCalledWith(viewer, { id: 't1' });
    expect(mocks.resolveViewer).toHaveBeenCalledWith({ user: { id: 'u1', email: 'gk@ube.com' } });
  });

  it('denies an unknown user', async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(canReadAttachment('x', { ticketId: 't1' })).resolves.toBe(false);
    expect(mocks.findVisibleTicket).not.toHaveBeenCalled();
  });
});

describe('fileCaller', () => {
  const headers = new Headers();

  it('a signed-in user needs the permission key', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1', email: 'a@ube.com' } });
    mocks.getUserPermissions.mockResolvedValue([]);
    await expect(fileCaller(headers, 'files:read')).resolves.toBe('FORBIDDEN');
    mocks.getUserPermissions.mockResolvedValue(['files:read']);
    await expect(fileCaller(headers, 'files:read')).resolves.toMatchObject({
      userId: 'u1',
      label: 'a@ube.com',
    });
  });

  it('the portal submitter may use the files of their one ticket only', async () => {
    mocks.getSession.mockResolvedValue(null);
    mocks.getPublicTicketViewer.mockResolvedValue({
      userId: 'public-portal',
      publicTicketId: 't1',
    });
    const caller = await fileCaller(headers, 'files:create');
    if (typeof caller === 'string') throw new Error(caller);
    await expect(caller.mayUseTicket('t1')).resolves.toBe(true);
    await expect(caller.mayUseTicket('t2')).resolves.toBe(false);
    expect(mocks.getUserPermissions).not.toHaveBeenCalledWith('public-portal');
  });

  it('no session and no portal ticket → UNAUTHORIZED', async () => {
    mocks.getSession.mockResolvedValue(null);
    mocks.getPublicTicketViewer.mockResolvedValue(null);
    await expect(fileCaller(headers, 'files:read')).resolves.toBe('UNAUTHORIZED');
  });
});
