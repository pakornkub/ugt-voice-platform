import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REPORTS, type ReportId } from '@/lib/report-catalog';
import { INITIAL_ROLE_PERMISSIONS } from '@/services/rosterDefaults';
import { ticketScopeWhere, type TicketViewer } from '@/lib/ticket-scope';
import type { UserRole } from '@/types';

const db = vi.hoisted(() => ({
  prisma: {
    ticket: { groupBy: vi.fn(), findMany: vi.fn() },
    ticketEvaluation: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => db);

const { canRunReports, runPresetReport } = await import('./reports');

const viewer = (role: UserRole, email = 'hr@ube.co.th'): TicketViewer => ({
  userId: `user-${role}`,
  email,
  name: role,
  rbacRoleName: null,
  role,
  config: INITIAL_ROLE_PERMISSIONS[role],
  gatekeeperCategories: ['HR'],
});

const admin = viewer('admin');
const run = (id: ReportId, who: TicketViewer = admin) => runPresetReport(who, id);

beforeEach(() => {
  vi.clearAllMocks();
  db.prisma.ticket.groupBy.mockResolvedValue([]);
  db.prisma.ticket.findMany.mockResolvedValue([]);
  db.prisma.ticketEvaluation.findMany.mockResolvedValue([]);
});

describe('canRunReports', () => {
  it('is the HR admin role only, like the export button', () => {
    expect(canRunReports({ role: 'admin' })).toBe(true);
    for (const role of ['employee', 'gatekeeper', 'executive'] as const) {
      expect(canRunReports({ role })).toBe(false);
    }
  });
});

describe('scope', () => {
  const gatekeeper = viewer('gatekeeper', 'gk@ube.co.th');

  it.each(['category_pareto', 'root_cause_breakdown'] as const)(
    '%s groups only the tickets the viewer may see',
    async (id) => {
      await run(id, gatekeeper);
      expect(db.prisma.ticket.groupBy.mock.calls[0][0].where).toEqual(ticketScopeWhere(gatekeeper));
    }
  );

  it.each(['in_progress_tickets', 'direct_to_executive'] as const)(
    '%s lists only the tickets the viewer may see',
    async (id) => {
      await run(id, gatekeeper);
      expect(db.prisma.ticket.findMany.mock.calls[0][0].where.AND[0]).toEqual(
        ticketScopeWhere(gatekeeper)
      );
    }
  );

  it('csat_by_category scopes the evaluations through their ticket', async () => {
    await run('csat_by_category', gatekeeper);
    expect(db.prisma.ticketEvaluation.findMany.mock.calls[0][0].where).toEqual({
      ticket: ticketScopeWhere(gatekeeper),
    });
  });
});

describe('result shape', () => {
  it.each(REPORTS.map((r) => r.id))('%s returns the catalog columns and a timing', async (id) => {
    const result = await run(id);
    const definition = REPORTS.find((r) => r.id === id);
    expect(result.columns).toEqual(definition?.columns);
    expect(result.rows).toEqual([]);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('rejects an id outside the catalog', async () => {
    await expect(run('nope' as ReportId)).rejects.toThrow('INVALID_REPORT');
    expect(db.prisma.ticket.groupBy).not.toHaveBeenCalled();
  });
});

describe('category_pareto', () => {
  it('folds status groups into per-category totals, share and resolved, biggest first', async () => {
    db.prisma.ticket.groupBy.mockResolvedValue([
      { category: 'Quality', status: 'closed', _count: { _all: 1 } },
      { category: 'HR', status: 'resolved', _count: { _all: 2 } },
      { category: 'HR', status: 'submitted', _count: { _all: 1 } },
      { category: 'Fraud', status: 'in_progress', _count: { _all: 2 } },
    ]);
    const { rows } = await run('category_pareto');
    expect(rows).toEqual([
      ['HR', 3, '50%', 2],
      ['Fraud', 2, '33.3%', 0],
      ['Quality', 1, '16.7%', 1],
    ]);
  });
});

describe('in_progress_tickets', () => {
  it('asks for triaged and in-progress tickets oldest first', async () => {
    db.prisma.ticket.findMany.mockResolvedValue([
      {
        trackingCode: 'TK-1',
        category: 'HR',
        title: 'เรื่อง',
        urgency: 'High',
        status: 'in_progress',
        assignedOfficerName: null,
      },
    ]);
    const { rows } = await run('in_progress_tickets');
    const args = db.prisma.ticket.findMany.mock.calls[0][0];
    expect(args.where.AND[1]).toEqual({ status: { in: ['in_progress', 'gatekeeper_triaged'] } });
    expect(args.orderBy).toEqual({ createdAt: 'asc' });
    expect(rows).toEqual([['TK-1', 'HR', 'เรื่อง', 'High', 'in_progress', null]]);
  });
});

describe('csat_by_category', () => {
  it('averages the ratings per category to two decimals and counts permanent fixes', async () => {
    const evaluation = (category: string, overall: number, permanent: boolean) => ({
      overallScore: overall,
      speedRating: overall,
      resolutionQualityRating: 5,
      isResolvedPermanently: permanent,
      ticket: { category },
    });
    db.prisma.ticketEvaluation.findMany.mockResolvedValue([
      evaluation('HR', 5, true),
      evaluation('HR', 4, false),
      evaluation('HR', 4, true),
      evaluation('Ethics', 3, false),
    ]);
    const { rows } = await run('csat_by_category');
    expect(rows).toEqual([
      ['Ethics', 1, 3, 3, 5, 0],
      ['HR', 3, 4.33, 4.33, 5, 2],
    ]);
  });
});

describe('root_cause_breakdown', () => {
  it('groups blank causes as not specified and lists the categories found, sorted', async () => {
    db.prisma.ticket.groupBy.mockResolvedValue([
      { rootCauseCategory: null, category: 'HR', _count: { _all: 1 } },
      { rootCauseCategory: '', category: 'Quality', _count: { _all: 2 } },
      { rootCauseCategory: 'Process', category: 'Quality', _count: { _all: 1 } },
      { rootCauseCategory: 'Process', category: 'HR', _count: { _all: 4 } },
    ]);
    const { rows } = await run('root_cause_breakdown');
    expect(rows).toEqual([
      ['Process', 5, 'HR, Quality'],
      ['ยังไม่ระบุ', 3, 'HR, Quality'],
    ]);
  });
});

describe('direct_to_executive', () => {
  it('lists the whistleblower tickets newest first with ISO dates and no identity columns', async () => {
    db.prisma.ticket.findMany.mockResolvedValue([
      {
        trackingCode: 'TK-9',
        category: 'Fraud',
        title: 'แจ้งเบาะแส',
        confidentiality: 'anonymous',
        urgency: 'Critical',
        status: 'submitted',
        createdAt: new Date('2026-10-01T08:00:00Z'),
      },
    ]);
    const result = await run('direct_to_executive');
    const args = db.prisma.ticket.findMany.mock.calls[0][0];
    expect(args.where.AND[1]).toEqual({ isDirectToExecutive: true });
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
    expect(args.select).not.toHaveProperty('submitterName');
    expect(result.rows).toEqual([
      [
        'TK-9',
        'Fraud',
        'แจ้งเบาะแส',
        'anonymous',
        'Critical',
        'submitted',
        '2026-10-01T08:00:00.000Z',
      ],
    ]);
  });
});
