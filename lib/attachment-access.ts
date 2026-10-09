// kit: ugt-nextjs-platform 4.58.0 · ugt-nextjs-upload-setup/lib/attachment-access.ts (adapted)
import 'server-only';
import { prisma } from '@/lib/prisma';
import { findVisibleTicket, resolveViewer } from '@/lib/ticket-access';

/**
 * Who may read a given ticket's attachments — the project-specific rule the skill's skeleton
 * leaves as an EXTENSION POINT (deny by default). Rewiring slice 2 (2026-10-09): exactly the
 * people who may see the ticket itself — role from the people rosters, scope from
 * lib/ticket-scope.ts (own tickets, gatekeeper categories, direct-to-CEO flag …) via
 * resolveViewer + findVisibleTicket, so attachments can never be wider than the ticket.
 * A user or ticket that can't be loaded answers false.
 */
export async function canReadAttachment(
  userId: string,
  attachment: { ticketId: string }
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return false;
  const viewer = await resolveViewer({ user: { id: userId, email: user.email } });
  if (!viewer) return false;
  return (await findVisibleTicket(viewer, { id: attachment.ticketId })) !== null;
}
