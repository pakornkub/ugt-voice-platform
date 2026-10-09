// lib/reports.ts — the preset reports behind the "SQL Query Studio" tab, run on SQL Server through
// Prisma (rewiring slice 5, 2026-10-09). Upstream ran free-text SQL over a browser copy of the
// tickets; free SQL is not acceptable against the real database (decisions.md 2026-09-02), so the
// report list is fixed (lib/report-catalog.ts) and no user text ever reaches a query. Every report
// aggregates ONLY the tickets the viewer may see (ticketScopeWhere) — the same rule as the ticket
// list, so a report can never leak what the screens hide. No raw SQL: groupBy / findMany only.
import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { REPORTS, type ReportCell, type ReportId, type ReportResult } from '@/lib/report-catalog';
import { ticketScopeWhere, type TicketViewer } from '@/lib/ticket-scope';

const NOT_SPECIFIED = 'ยังไม่ระบุ';
const RESOLVED_STATUSES = new Set(['resolved', 'closed']);
const IN_PROGRESS_STATUSES = ['in_progress', 'gatekeeper_triaged'];

/** The export button is HR-admin only upstream (Navbar: currentRole === 'admin') — same here. */
export function canRunReports(viewer: Pick<TicketViewer, 'role'>): boolean {
  return viewer.role === 'admin';
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : round(values.reduce((a, b) => a + b, 0) / values.length, 2);
}

/** Largest count first, name as the tie-break so the order is stable between runs. */
const byCountThenName = (a: { name: string; total: number }, b: { name: string; total: number }) =>
  b.total - a.total || a.name.localeCompare(b.name);

type Runner = (where: Prisma.ticketWhereInput) => Promise<ReportCell[][]>;

const categoryPareto: Runner = async (where) => {
  const groups = await prisma.ticket.groupBy({
    by: ['category', 'status'],
    where,
    _count: { _all: true },
  });
  const perCategory = new Map<string, { name: string; total: number; resolved: number }>();
  for (const group of groups) {
    const entry = perCategory.get(group.category) ?? {
      name: group.category,
      total: 0,
      resolved: 0,
    };
    entry.total += group._count._all;
    if (RESOLVED_STATUSES.has(group.status)) entry.resolved += group._count._all;
    perCategory.set(group.category, entry);
  }
  const entries = [...perCategory.values()];
  const grand = entries.reduce((sum, e) => sum + e.total, 0);
  return entries
    .sort(byCountThenName)
    .map((e) => [e.name, e.total, `${round((e.total * 100) / grand, 1)}%`, e.resolved]);
};

const inProgressTickets: Runner = async (where) => {
  const rows = await prisma.ticket.findMany({
    where: { AND: [where, { status: { in: IN_PROGRESS_STATUSES } }] },
    orderBy: { createdAt: 'asc' },
    select: {
      trackingCode: true,
      category: true,
      title: true,
      urgency: true,
      status: true,
      assignedOfficerName: true,
    },
  });
  return rows.map((t) => [
    t.trackingCode,
    t.category,
    t.title,
    t.urgency,
    t.status,
    t.assignedOfficerName,
  ]);
};

const csatByCategory: Runner = async (where) => {
  const evaluations = await prisma.ticketEvaluation.findMany({
    where: { ticket: where },
    select: {
      overallScore: true,
      speedRating: true,
      resolutionQualityRating: true,
      isResolvedPermanently: true,
      ticket: { select: { category: true } },
    },
  });
  const perCategory = new Map<string, typeof evaluations>();
  for (const evaluation of evaluations) {
    const list = perCategory.get(evaluation.ticket.category) ?? [];
    list.push(evaluation);
    perCategory.set(evaluation.ticket.category, list);
  }
  return [...perCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, list]) => [
      category,
      list.length,
      average(list.map((e) => e.overallScore)),
      average(list.map((e) => e.speedRating)),
      average(list.map((e) => e.resolutionQualityRating)),
      list.filter((e) => e.isResolvedPermanently).length,
    ]);
};

const rootCauseBreakdown: Runner = async (where) => {
  const groups = await prisma.ticket.groupBy({
    by: ['rootCauseCategory', 'category'],
    where,
    _count: { _all: true },
  });
  const perCause = new Map<string, { name: string; total: number; categories: Set<string> }>();
  for (const group of groups) {
    const name = group.rootCauseCategory?.trim() || NOT_SPECIFIED;
    const entry = perCause.get(name) ?? { name, total: 0, categories: new Set<string>() };
    entry.total += group._count._all;
    entry.categories.add(group.category);
    perCause.set(name, entry);
  }
  return [...perCause.values()]
    .sort(byCountThenName)
    .map((e) => [e.name, e.total, [...e.categories].sort().join(', ')]);
};

const directToExecutive: Runner = async (where) => {
  const rows = await prisma.ticket.findMany({
    where: { AND: [where, { isDirectToExecutive: true }] },
    orderBy: { createdAt: 'desc' },
    select: {
      trackingCode: true,
      category: true,
      title: true,
      confidentiality: true,
      urgency: true,
      status: true,
      createdAt: true,
    },
  });
  return rows.map((t) => [
    t.trackingCode,
    t.category,
    t.title,
    t.confidentiality,
    t.urgency,
    t.status,
    t.createdAt.toISOString(),
  ]);
};

const RUNNERS: Record<ReportId, Runner> = {
  category_pareto: categoryPareto,
  in_progress_tickets: inProgressTickets,
  csat_by_category: csatByCategory,
  root_cause_breakdown: rootCauseBreakdown,
  direct_to_executive: directToExecutive,
};

// ponytail: every report reads its whole (viewer-scoped) slice — fine at this app's ticket volume;
// add a date-range parameter / row cap if the list reports reach the thousands.
export async function runPresetReport(
  viewer: TicketViewer,
  reportId: ReportId
): Promise<ReportResult> {
  const definition = REPORTS.find((r) => r.id === reportId);
  if (!definition) throw new Error('INVALID_REPORT');
  const startedAt = performance.now();
  const rows = await RUNNERS[reportId](ticketScopeWhere(viewer));
  return {
    columns: [...definition.columns],
    rows,
    executionTimeMs: round(performance.now() - startedAt, 1),
  };
}
