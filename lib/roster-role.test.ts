import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  hrAdminMember: { findFirst: vi.fn() },
  executiveMember: { findFirst: vi.fn() },
  gatekeeperOfficer: { findMany: vi.fn() },
};
const findEmployeeByLogin = vi.fn();
vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/lib/directory', () => ({ findEmployeeByLogin }));

describe('roster role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.hrAdminMember.findFirst.mockResolvedValue(null);
    db.executiveMember.findFirst.mockResolvedValue(null);
    db.gatekeeperOfficer.findMany.mockResolvedValue([]);
    findEmployeeByLogin.mockResolvedValue(null);
  });

  it('highest roster wins', async () => {
    const { pickRole } = await import('./roster-role');
    const none = { isHrAdmin: false, isExecutive: false, officerCategories: [] };
    expect(pickRole(none)).toBe('employee');
    expect(pickRole({ ...none, officerCategories: ['HR'] })).toBe('gatekeeper');
    expect(pickRole({ ...none, isExecutive: true, officerCategories: ['HR'] })).toBe('executive');
    expect(pickRole({ ...none, isHrAdmin: true, isExecutive: true })).toBe('admin');
  });

  it('matches the session email and the HR-view email, deduplicating officer categories', async () => {
    const { resolveRosterRole } = await import('./roster-role');
    findEmployeeByLogin.mockResolvedValue({ loginEmail: 'p.w@ube.com' });
    db.gatekeeperOfficer.findMany.mockResolvedValue([
      { category: 'HR' },
      { category: 'HR' },
      { category: 'Quality' },
    ]);
    await expect(resolveRosterRole(' PakornWo@ube.com ')).resolves.toEqual({
      role: 'gatekeeper',
      officerCategories: ['HR', 'Quality'],
    });
    const where = db.gatekeeperOfficer.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      email: {
        in: ['pakornwo@ube.com', 'pakornwo@ube.co.th', 'p.w@ube.com', 'p.w@ube.co.th'],
      },
      isActive: true,
      isDeleted: false,
    });
    expect(db.hrAdminMember.findFirst.mock.calls[0][0].where.status).toBe('active');
  });

  it('still resolves when the HR view is unreachable, and blank email is an employee', async () => {
    const { resolveRosterRole } = await import('./roster-role');
    findEmployeeByLogin.mockRejectedValue(new Error('linked server down'));
    db.hrAdminMember.findFirst.mockResolvedValue({ id: 'a' });
    await expect(resolveRosterRole('x@ube.com')).resolves.toMatchObject({ role: 'admin' });
    vi.clearAllMocks();
    await expect(resolveRosterRole('  ')).resolves.toEqual({
      role: 'employee',
      officerCategories: [],
    });
    expect(db.hrAdminMember.findFirst).not.toHaveBeenCalled();
  });

  it('gatekeeper scope is officer categories within the RBAC ceiling', async () => {
    const { gatekeeperScope } = await import('./roster-role');
    expect(gatekeeperScope(['HR', 'Quality'], ['HR', 'Ethics'])).toEqual(['HR']);
    expect(gatekeeperScope(['HR'], undefined)).toEqual([]);
  });
});
