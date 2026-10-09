// lib/ticket-scope.ts — who may see / act on which ticket, enforced on the server (slice 1 of the
// localStorage → DB rewiring, 2026-10-09). Pure: no Prisma client, no session — the caller resolves
// the viewer (resolveViewer in lib/ticket-access.ts) and passes it in, so every rule here is unit-testable.
//
// Mirrors the client-side scoping the upstream screens already apply:
//   - everyone sees the tickets they submitted (login email, or the submitter email on legacy rows
//     that have none — the same "active login email" TrackingTimelineModal shows);
//   - employee: only their own;
//   - gatekeeper: viewer.gatekeeperCategories (resolved once by resolveViewer in
//     lib/ticket-access.ts), direct-to-CEO tickets only with canViewDirectCeoTickets;
//   - executive / admin: every department, direct-to-CEO only with canViewDirectCeoTickets.
// A role without a RoleAccessConfigs row sees only its own tickets (deny by default).
import type { Prisma } from '@prisma/client';
import type {
  ComplaintTicket,
  GrievanceCategory,
  NotificationItem,
  RolePermissionConfig,
  UserRole,
} from '@/types';

export interface TicketViewer {
  userId: string;
  email: string;
  /** Display name of the signed-in user (actor of staff notes). */
  name: string;
  /** RBAC role name for the identity menu (null when none). */
  rbacRoleName: string | null;
  role: UserRole;
  /** RoleAccessConfigs row of `role` — what the role may do (RBAC matrix). */
  config?: RolePermissionConfig;
  /** Categories a gatekeeper may see (unused for other roles). */
  gatekeeperCategories: GrievanceCategory[];
}

export function ownTicketsWhere(email: string): Prisma.ticketWhereInput {
  return {
    OR: [{ loginEmail: email }, { loginEmail: null, submitterEmail: email }],
  };
}

/** Role-level category scope from the RBAC page (empty → ['HR'], GatekeeperInbox's fallback). */
export function gatekeeperDepartments(config?: RolePermissionConfig): GrievanceCategory[] {
  return config?.assignedDepartments?.length ? config.assignedDepartments : ['HR'];
}

export function ticketScopeWhere(viewer: TicketViewer): Prisma.ticketWhereInput {
  const own = ownTicketsWhere(viewer.email);
  if (viewer.role === 'employee' || !viewer.config) return { isDeleted: false, ...own };

  const roleScope: Prisma.ticketWhereInput[] = [];
  if (!viewer.config.canViewDirectCeoTickets) roleScope.push({ isDirectToExecutive: false });
  if (viewer.role === 'gatekeeper') {
    roleScope.push({ category: { in: viewer.gatekeeperCategories } });
  }
  // No role restriction → everything. (Prisma renders an empty AND nested in OR as false on SQL
  // Server, so never emit `{ AND: [] }`.)
  if (roleScope.length === 0) return { isDeleted: false };
  return { isDeleted: false, OR: [own, { AND: roleScope }] };
}

/** Filing a ticket — whoever the RBAC matrix gives the submit tab. */
export function canSubmit(viewer: TicketViewer): boolean {
  return viewer.config?.allowedTabs?.includes('submit') ?? false;
}

/** Status / assignment / CAPA changes — whoever the RBAC matrix gives the Gatekeeper inbox. */
export function canTriage(viewer: TicketViewer): boolean {
  return viewer.config?.allowedTabs?.includes('gatekeeper') ?? false;
}

/** Fields only a triaging role may change; anyone who sees the ticket may add a note. */
export const TRIAGE_FIELDS = [
  'status',
  'assignedOfficerName',
  'assignedOfficerEmail',
  'gatekeeperDepartment',
  'resolutionSummary',
  'urgency',
  'riskSeverity',
  'rootCauseCategory',
  'preventiveActionPlan',
  'clusterGroup',
] as const;

export function touchesTriageFields(updates: object): boolean {
  const values = updates as Partial<Record<string, unknown>>;
  return TRIAGE_FIELDS.some((field) => values[field] !== undefined);
}

/** Same rule as ownTicketsWhere, for a row already loaded (SQL Server compares case-insensitively). */
export function isOwnTicket(
  viewer: Pick<TicketViewer, 'email'>,
  ticket: { loginEmail?: string | null; submitterEmail?: string | null }
): boolean {
  const me = viewer.email.toLowerCase();
  const owner = ticket.loginEmail || ticket.submitterEmail;
  return !!owner && owner.toLowerCase() === me;
}

export const ANONYMOUS_SUBMITTER_NAME = 'ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)';
export const PROTECTED_ACTOR_NAME = 'พนักงานผู้ร้องเรียน (ปกปิดตัวตน)';

/**
 * Server-side twin of the client masking (TrackingTimelineModal submitter cards / timeline,
 * ExecutiveDashboard SubmitterLine): the submitter sees everything; for everyone else
 *   - anonymous: name/employee id/department/phone only with canViewConfidentialIdentities,
 *     login + submitter email only with canViewAnonymousSubmitterEmail;
 *   - confidential_restricted: every identity field and the submitter's own timeline actor only
 *     with canViewConfidentialIdentities;
 *   - standard_named: unchanged (the UI shows it to every role).
 */
export function redactTicketForViewer(
  viewer: TicketViewer,
  ticket: ComplaintTicket
): ComplaintTicket {
  if (ticket.confidentiality === 'standard_named' || isOwnTicket(viewer, ticket)) return ticket;
  const canSeeIdentity = viewer.config?.canViewConfidentialIdentities ?? false;

  if (ticket.confidentiality === 'anonymous') {
    const canSeeEmail = viewer.config?.canViewAnonymousSubmitterEmail ?? false;
    return {
      ...ticket,
      ...(canSeeIdentity
        ? {}
        : {
            submitterName: ANONYMOUS_SUBMITTER_NAME,
            submitterEmployeeId: undefined,
            submitterDepartment: undefined,
            submitterPhone: undefined,
          }),
      ...(canSeeEmail ? {} : { loginEmail: undefined, submitterEmail: undefined }),
    };
  }

  if (canSeeIdentity) return ticket;
  const isSubmitterLog = (actorRole: string, actor: string) =>
    actorRole === 'Employee' || (!!ticket.submitterName && actor === ticket.submitterName);
  return {
    ...ticket,
    submitterName: undefined,
    submitterEmployeeId: undefined,
    submitterDepartment: undefined,
    submitterEmail: undefined,
    submitterPhone: undefined,
    loginEmail: undefined,
    timeline: ticket.timeline.map((log) =>
      isSubmitterLog(log.actorRole, log.actor) ? { ...log, actor: PROTECTED_ACTOR_NAME } : log
    ),
  };
}

/** A notification's recipient email is only for its recipient. */
export function redactNotificationForViewer(
  viewer: Pick<TicketViewer, 'email'>,
  notification: NotificationItem
): NotificationItem {
  const mine = notification.recipientEmail?.toLowerCase() === viewer.email.toLowerCase();
  return mine ? notification : { ...notification, recipientEmail: undefined };
}
