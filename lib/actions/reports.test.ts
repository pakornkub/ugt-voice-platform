import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_ROLE_PERMISSIONS } from '@/services/rosterDefaults';
import type { TicketViewer } from '@/lib/ticket-scope';
import type { UserRole } from '@/types';

const mocks = vi.hoisted(() => ({
  requireTicketViewer: vi.fn(),
  runPresetReport: vi.fn(),
  prisma: { activityLog: { create: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/ticket-access', () => ({ requireTicketViewer: mocks.requireTicketViewer }));
vi.mock('@/lib/reports', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/reports')>()),
  runPresetReport: mocks.runPresetReport,
}));

const { runReport } = await import('./reports');

const viewer = (role: UserRole): TicketViewer => ({
  userId: `user-${role}`,
  email: `${role}@ube.co.th`,
  name: role,
  rbacRoleName: null,
  role,
  config: INITIAL_ROLE_PERMISSIONS[role],
  gatekeeperCategories: ['HR'],
});

const REPORT = { columns: ['a'], rows: [['x'], ['y']], executionTimeMs: 1.2 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireTicketViewer.mockResolvedValue(viewer('admin'));
  mocks.runPresetReport.mockResolvedValue(REPORT);
  mocks.prisma.activityLog.create.mockResolvedValue({});
});

describe('runReport', () => {
  it('runs the report for the HR admin and audits it with the row count', async () => {
    const result = await runReport('category_pareto');

    expect(result).toEqual({ ok: true, ...REPORT });
    expect(mocks.runPresetReport).toHaveBeenCalledWith(viewer('admin'), 'category_pareto');
    expect(mocks.prisma.activityLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-admin',
        action: 'reports.run',
        detail: JSON.stringify({ reportId: 'category_pareto', rows: 2 }),
      },
    });
  });

  it('refuses without a session, before touching the database', async () => {
    mocks.requireTicketViewer.mockRejectedValueOnce(new Error('UNAUTHORIZED'));
    expect(await runReport('category_pareto')).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    expect(mocks.runPresetReport).not.toHaveBeenCalled();
    expect(mocks.prisma.activityLog.create).not.toHaveBeenCalled();
  });

  it.each(['employee', 'gatekeeper', 'executive'] as const)('refuses the %s role', async (role) => {
    mocks.requireTicketViewer.mockResolvedValueOnce(viewer(role));
    expect(await runReport('category_pareto')).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(mocks.runPresetReport).not.toHaveBeenCalled();
    expect(mocks.prisma.activityLog.create).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, '', 'SELECT * FROM Tickets', { id: 'category_pareto' }])(
    'rejects the unknown report id %j',
    async (reportId) => {
      expect(await runReport(reportId)).toEqual({ ok: false, error: 'INVALID_REPORT' });
      expect(mocks.runPresetReport).not.toHaveBeenCalled();
    }
  );

  it('returns FAILED (and no audit row) when the report throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.runPresetReport.mockRejectedValueOnce(new Error('db down'));
    expect(await runReport('csat_by_category')).toEqual({ ok: false, error: 'FAILED' });
    expect(mocks.prisma.activityLog.create).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('still returns the report when the audit write fails', async () => {
    mocks.prisma.activityLog.create.mockRejectedValueOnce(new Error('log down'));
    expect(await runReport('direct_to_executive')).toEqual({ ok: true, ...REPORT });
  });
});
