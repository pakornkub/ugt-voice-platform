// kit: ugt-nextjs-platform 4.58.0 · ugt-nextjs-upload-setup/lib/attachment-access.ts (adapted)
import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * Who may read a given ticket's attachments — the project-specific rule the
 * skill's skeleton leaves as an EXTENSION POINT (denies everything by
 * default). Mirrors the scoping already established client-side in
 * `GatekeeperInbox.tsx` / `ExecutiveDashboard.tsx` (see
 * `docs/project-context/business-rules.md`), read here from the database
 * instead of local component state:
 *
 *   - admin: sees every ticket's attachments.
 *   - the ticket's own submitter: matched by email — this app has no
 *     stronger link between a logged-in session and the free-text submitter
 *     fields captured at submission time (`submitterName`/`submitterEmail`/
 *     `submitterEmployeeId` are typed by hand on `EmployeeSubmitForm`, not
 *     populated from the session). See docs/project-context/decisions.md.
 *   - executive: only the direct-to-CEO/EVP channel (`isDirectToExecutive`).
 *   - gatekeeper: only tickets in a department they are scoped to
 *     (`RoleAccessConfigs.canViewAllDepartments` / `assignedDepartments`,
 *     keyed by `GrievanceCategory` — matches `GatekeeperInbox.tsx`'s
 *     existing `assignedDepts.includes(t.category)` filter).
 *   - employee with no matching submitter email, or no `appRole` assigned
 *     yet: denied.
 *
 * A ticket or user that can't be loaded (soft-deleted, unknown id) answers
 * false, same as every unrecognised case — deny by default.
 */
export async function canReadAttachment(
  userId: string,
  attachment: { ticketId: string }
): Promise<boolean> {
  const [user, ticket] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, appRole: true },
    }),
    prisma.ticket.findFirst({
      where: { id: attachment.ticketId, isDeleted: false },
      select: { submitterEmail: true, category: true, isDirectToExecutive: true },
    }),
  ]);
  if (!user || !ticket) return false;

  if (user.appRole === 'admin') return true;

  if (user.email && ticket.submitterEmail && user.email === ticket.submitterEmail) {
    return true;
  }

  if (user.appRole === 'executive' && ticket.isDirectToExecutive) return true;

  if (user.appRole === 'gatekeeper') {
    const roleConfig = await prisma.roleAccessConfig.findUnique({
      where: { role: 'gatekeeper' },
      select: { canViewAllDepartments: true, assignedDepartmentsJson: true },
    });
    if (roleConfig?.canViewAllDepartments) return true;
    const assigned: string[] = roleConfig?.assignedDepartmentsJson
      ? (JSON.parse(roleConfig.assignedDepartmentsJson) as string[])
      : [];
    if (assigned.includes(ticket.category)) return true;
  }

  return false;
}
