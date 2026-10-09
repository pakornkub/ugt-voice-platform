// lib/auto-assign.ts — picks the officer a new ticket is assigned to, per the category's
// AutoAssignMode (admin page "รูปแบบการจ่ายงานอัตโนมัติ"). Server-only.
//   off               → nobody; the ticket waits unassigned for triage
//   lead_manual       → the category's Lead, who re-assigns from the triage modal
//   round_robin       → the officer after the one who got this category's last auto/manual assignment
//   workload_balanced → the officer with the fewest open tickets in this category (ties: list order)
import 'server-only';
import { normalizeEmail } from '@/lib/email-identity';
import { prisma } from '@/lib/prisma';
import type { DepartmentGatekeeperConfig } from '@/types';

export type AutoAssignMode = DepartmentGatekeeperConfig['autoAssignMode'];

export interface AssignableOfficer {
  name: string;
  email: string;
  isLead: boolean;
}

export interface AssignmentStats {
  /** Email of the officer on this category's most recently assigned ticket, if any. */
  lastAssignedEmail?: string | null;
  /** Open (not resolved/closed) tickets per officer email, lowercase. */
  openCounts?: Record<string, number>;
}

const OPEN_EXCLUDED = ['resolved', 'closed'];

/** Pure choice — officers are the category's active roster in display order. */
export function pickAssignee(
  mode: AutoAssignMode,
  officers: readonly AssignableOfficer[],
  stats: AssignmentStats = {}
): AssignableOfficer | null {
  if (mode === 'off' || officers.length === 0) return null;
  const key = (o: AssignableOfficer) => normalizeEmail(o.email);
  if (mode === 'round_robin') {
    const last = normalizeEmail(stats.lastAssignedEmail);
    const index = officers.findIndex((o) => key(o) === last);
    return officers[(index + 1) % officers.length]; // unknown/none → index -1 → first officer
  }
  if (mode === 'workload_balanced') {
    const load = (o: AssignableOfficer) => stats.openCounts?.[key(o)] ?? 0;
    return officers.reduce((best, o) => (load(o) < load(best) ? o : best));
  }
  return officers.find((o) => o.isLead) ?? officers[0];
}

/**
 * Officer for a new ticket in `category`, or null (mode off, no active officers, unknown category).
 * ponytail: two submissions in the same instant can pick the same round-robin officer — fine at
 * this volume; a per-category counter row would be the upgrade.
 */
export async function autoAssignOfficer(category: string): Promise<AssignableOfficer | null> {
  const config = await prisma.departmentGatekeeperConfig.findFirst({
    where: { category, isDeleted: false },
    select: {
      autoAssignMode: true,
      officers: {
        where: { isActive: true, isDeleted: false },
        select: { name: true, email: true, isLead: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!config) return null;
  const mode = config.autoAssignMode as AutoAssignMode;
  if (mode === 'off' || mode === 'lead_manual' || config.officers.length === 0) {
    return pickAssignee(mode, config.officers);
  }
  const inCategory = { category, isDeleted: false, assignedOfficerEmail: { not: null } };
  if (mode === 'round_robin') {
    const last = await prisma.ticket.findFirst({
      where: inCategory,
      orderBy: { createdAt: 'desc' },
      select: { assignedOfficerEmail: true },
    });
    return pickAssignee(mode, config.officers, { lastAssignedEmail: last?.assignedOfficerEmail });
  }
  const groups = await prisma.ticket.groupBy({
    by: ['assignedOfficerEmail'],
    where: { ...inCategory, status: { notIn: OPEN_EXCLUDED } },
    _count: { _all: true },
  });
  const openCounts: Record<string, number> = {};
  for (const g of groups) {
    const email = normalizeEmail(g.assignedOfficerEmail);
    if (email) openCounts[email] = (openCounts[email] ?? 0) + g._count._all;
  }
  return pickAssignee(mode, config.officers, { openCounts });
}
