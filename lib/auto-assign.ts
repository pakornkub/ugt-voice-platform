// lib/auto-assign.ts — the responsible officer of a new ticket. Server-only.
// One rule for every category (owner 2026-10-14): the category Lead (else the first active officer)
// is put on the ticket; the new-ticket email goes to every GK of the category, and any GK can
// re-assign from the triage form. The roster read and the pick live in lib/ticket-events.ts.
import 'server-only';
import { prisma } from '@/lib/prisma';
import { assigneeOf, readCategoryRoster, type RosterOfficer } from '@/lib/ticket-events';

export type AssignableOfficer = RosterOfficer;

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
  return assigneeOf(await readCategoryRoster(category));
}
