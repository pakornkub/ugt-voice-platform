import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  resolveViewer: vi.fn(),
  findVisibleTicket: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
vi.mock('@/lib/ticket-access', () => ({
  resolveViewer: mocks.resolveViewer,
  findVisibleTicket: mocks.findVisibleTicket,
}));

const { canReadAttachment } = await import('./attachment-access');

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
