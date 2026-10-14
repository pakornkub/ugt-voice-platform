// lib/auto-assign.ts — the responsible officer of a new ticket. Server-only.
// One rule for every category (owner 2026-10-14): the category Lead (else the first active officer)
// is put on the ticket; the new-ticket email goes to every GK of the category, and any GK can
// re-assign from the triage form. The per-category AutoAssignMode column is no longer read.
import 'server-only';
import { prisma } from '@/lib/prisma';

export interface AssignableOfficer {
  name: string;
  email: string;
  isLead: boolean;
}

/**
 * A direct-to-executive ticket is handled by the category gatekeepers only when the RBAC page lets
 * the gatekeeper role open such tickets ("direct CEO/EVP inbox" right) — otherwise nobody is
 * assigned an item they cannot see.
 */
export async function gatekeepersSeeDirectTickets(): Promise<boolean> {
  const row = await prisma.roleAccessConfig.findFirst({
    where: { role: 'gatekeeper', isDeleted: false },
    select: { canViewDirectCeoTickets: true },
  });
  return row?.canViewDirectCeoTickets ?? false;
}

/** The category's Lead (else first active officer) for a new ticket, or null when it has none. */
export async function autoAssignOfficer(category: string): Promise<AssignableOfficer | null> {
  const config = await prisma.departmentGatekeeperConfig.findFirst({
    where: { category, isDeleted: false },
    select: {
      officers: {
        where: { isActive: true, isDeleted: false },
        select: { name: true, email: true, isLead: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  const officers = config?.officers ?? [];
  return officers.find((o) => o.isLead) ?? officers[0] ?? null;
}
