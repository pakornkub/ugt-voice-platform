import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  prisma: {
    departmentGatekeeperConfig: { findFirst: vi.fn() },
    ticket: { findFirst: vi.fn(), groupBy: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => db);

const { autoAssignOfficer, pickAssignee } = await import('./auto-assign');

const A = { name: 'A', email: 'a@ube.co.th', isLead: false };
const B = { name: 'B', email: 'b@ube.co.th', isLead: true };
const C = { name: 'C', email: 'c@ube.co.th', isLead: false };
const officers = [A, B, C];

describe('pickAssignee', () => {
  it('assigns nobody when off or when there are no officers', () => {
    expect(pickAssignee('off', officers)).toBeNull();
    expect(pickAssignee('round_robin', [])).toBeNull();
  });

  it('lead_manual → the Lead, else the first officer', () => {
    expect(pickAssignee('lead_manual', officers)).toBe(B);
    expect(pickAssignee('lead_manual', [A, C])).toBe(A);
  });

  it('round_robin → the officer after the last one, wrapping, first when unknown', () => {
    expect(pickAssignee('round_robin', officers, { lastAssignedEmail: 'A@ube.co.th' })).toBe(B);
    expect(pickAssignee('round_robin', officers, { lastAssignedEmail: 'c@ube.co.th' })).toBe(A);
    expect(pickAssignee('round_robin', officers, { lastAssignedEmail: 'gone@ube.co.th' })).toBe(A);
    expect(pickAssignee('round_robin', officers)).toBe(A);
  });

  it('workload_balanced → fewest open tickets, ties keep list order', () => {
    const openCounts = { 'a@ube.co.th': 3, 'b@ube.co.th': 1, 'c@ube.co.th': 1 };
    expect(pickAssignee('workload_balanced', officers, { openCounts })).toBe(B);
    expect(pickAssignee('workload_balanced', officers)).toBe(A);
  });
});

describe('autoAssignOfficer', () => {
  beforeEach(() => vi.clearAllMocks());

  const config = (autoAssignMode: string) =>
    db.prisma.departmentGatekeeperConfig.findFirst.mockResolvedValue({ autoAssignMode, officers });

  it('returns null for an unknown category without querying tickets', async () => {
    db.prisma.departmentGatekeeperConfig.findFirst.mockResolvedValue(null);
    await expect(autoAssignOfficer('HR')).resolves.toBeNull();
    config('off');
    await expect(autoAssignOfficer('HR')).resolves.toBeNull();
    expect(db.prisma.ticket.findFirst).not.toHaveBeenCalled();
  });

  it('round_robin reads the latest assigned ticket of the category', async () => {
    config('round_robin');
    db.prisma.ticket.findFirst.mockResolvedValue({ assignedOfficerEmail: 'b@ube.co.th' });
    await expect(autoAssignOfficer('HR')).resolves.toBe(C);
    expect(db.prisma.ticket.findFirst.mock.calls[0][0].where).toMatchObject({ category: 'HR' });
  });

  it('workload_balanced counts open tickets per officer, case-insensitively', async () => {
    config('workload_balanced');
    db.prisma.ticket.groupBy.mockResolvedValue([
      { assignedOfficerEmail: 'A@ube.co.th', _count: { _all: 2 } },
      { assignedOfficerEmail: 'b@ube.co.th', _count: { _all: 1 } },
      { assignedOfficerEmail: 'c@ube.co.th', _count: { _all: 4 } },
    ]);
    await expect(autoAssignOfficer('HR')).resolves.toBe(B);
    expect(db.prisma.ticket.groupBy.mock.calls[0][0].where.status).toEqual({
      notIn: ['resolved', 'closed'],
    });
  });
});
