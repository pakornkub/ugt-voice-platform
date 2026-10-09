// lib/tab-guard.ts — guard for the admin-config Server Actions (rosters, RBAC matrix, gatekeeper
// configs). One permission system (decisions.md 2026-10-09): a user may change what the RBAC
// matrix lets their role open — the screen's tab is the permission. Order per the org contract:
// session → permission (here) → action (caller) → audit (writeAudit, non-blocking).
import 'server-only';
import { prisma } from '@/lib/prisma';
import { requireTicketViewer } from '@/lib/ticket-access';
import type { AuditAction } from '@/lib/audit-actions';
import type { TicketViewer } from '@/lib/ticket-scope';
import type { AppTabId } from '@/types';

/** Rosters are edited from the Gatekeeper-management page and the RBAC page's executive box. */
export const ROSTER_TABS: readonly AppTabId[] = ['admin_gatekeeper', 'rbac_management'];
export const RBAC_TABS: readonly AppTabId[] = ['rbac_management'];

/** The caller's viewer when their role may open any of `tabs`; throws UNAUTHORIZED / FORBIDDEN. */
export async function requireTab(tabs: readonly AppTabId[]): Promise<TicketViewer> {
  const viewer = await requireTicketViewer();
  const allowed = viewer.config?.allowedTabs ?? [];
  if (!tabs.some((tab) => allowed.includes(tab))) throw new Error('FORBIDDEN');
  return viewer;
}

export function writeAudit(viewer: TicketViewer, action: AuditAction, detail: object): void {
  prisma.activityLog
    .create({ data: { userId: viewer.userId, action, detail: JSON.stringify(detail) } })
    .catch(() => {}); // an audit failure must never fail the change itself
}
