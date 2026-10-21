// kit: ugt-nextjs-platform 4.58.0 · ugt-nextjs-upload-setup/lib/attachment-access.ts (adapted)
import 'server-only';
import { auth } from '@/lib/auth';
import { getUserPermissions } from '@/lib/get-user-permissions';
import type { PermissionKey } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { findVisibleTicket, getPublicTicketViewer, resolveViewer } from '@/lib/ticket-access';

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

/** Who is calling a file route, and which tickets' files they may use. */
export interface FileCaller {
  /** ActivityLogs user id. */
  userId: string;
  /** Attachments.CreatedBy. */
  label: string;
  mayUseTicket: (ticketId: string) => Promise<boolean>;
}

/**
 * The signed-in user (needs `permission`), else the no-login portal's submitter (cookie,
 * lib/public-access.ts, 2026-10-21), who may use the files of their one ticket only.
 */
export async function fileCaller(
  requestHeaders: Headers,
  permission: PermissionKey
): Promise<FileCaller | 'UNAUTHORIZED' | 'FORBIDDEN'> {
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (session?.user) {
    const userId = session.user.id;
    if (!(await getUserPermissions(userId)).includes(permission)) return 'FORBIDDEN';
    return {
      userId,
      label: session.user.email ?? userId,
      mayUseTicket: (ticketId) => canReadAttachment(userId, { ticketId }),
    };
  }
  const viewer = await getPublicTicketViewer();
  if (!viewer) return 'UNAUTHORIZED';
  return {
    userId: viewer.userId,
    label: viewer.userId,
    mayUseTicket: async (ticketId) => ticketId === viewer.publicTicketId,
  };
}
