import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  prisma: { departmentGatekeeperConfig: { findFirst: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => db);

const { autoAssignOfficer } = await import('./auto-assign');

const A = { name: 'A', email: 'a@ube.com', isLead: false };
const B = { name: 'B', email: 'b@ube.com', isLead: true };
const C = { name: 'C', email: 'c@ube.com', isLead: false };

describe('autoAssignOfficer', () => {
  beforeEach(() => vi.clearAllMocks());

  const officers = (list: (typeof A)[]) =>
    db.prisma.departmentGatekeeperConfig.findFirst.mockResolvedValue({ officers: list });

  it('puts the category Lead on the ticket, whatever the old per-category mode said', async () => {
    officers([A, B, C]);
    await expect(autoAssignOfficer('HR')).resolves.toBe(B);
    const query = db.prisma.departmentGatekeeperConfig.findFirst.mock.calls[0][0];
    expect(query.where).toEqual({ category: 'HR', isDeleted: false });
    expect(query.select.officers.where).toEqual({ isActive: true, isDeleted: false });
    expect(query.select.autoAssignMode).toBeUndefined();
  });

  it('falls back to the first active officer when no Lead is set, else nobody', async () => {
    officers([A, C]);
    await expect(autoAssignOfficer('HR')).resolves.toBe(A);
    officers([]);
    await expect(autoAssignOfficer('HR')).resolves.toBeNull();
    db.prisma.departmentGatekeeperConfig.findFirst.mockResolvedValue(null);
    await expect(autoAssignOfficer('HR')).resolves.toBeNull();
  });
});
