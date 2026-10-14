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
import { emailVariants, sameEmail } from '@/lib/email-identity';
import { effectiveDepartments } from '@/lib/role-access-rules';
import { SERVER_TEXT } from '@/lib/server-text';
import type {
  ComplaintTicket,
  GrievanceCategory,
  NotificationItem,
  RolePermissionConfig,
  TicketView,
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
    OR: [
      { loginEmail: { in: emailVariants(email) } },
      { loginEmail: null, submitterEmail: { in: emailVariants(email) } },
    ],
  };
}

/** Role-level category scope from the RBAC page (empty reads as HR — see effectiveDepartments). */
export function gatekeeperDepartments(config?: RolePermissionConfig): GrievanceCategory[] {
  return effectiveDepartments(config?.assignedDepartments);
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
  return sameEmail(ticket.loginEmail || ticket.submitterEmail, viewer.email);
}

export const ANONYMOUS_SUBMITTER_NAME = SERVER_TEXT.anonymousSubmitterName.th;
export const PROTECTED_ACTOR_NAME = SERVER_TEXT.protectedActorName.th;

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

/**
 * What the screens show for a ticket the viewer already may see — the facts the client used to
 * re-derive from the RBAC matrix (Gatekeeper inbox filter, tracking modal restricted screen and
 * masking). They deliberately mirror those client checks, not ownership: a gatekeeper's own
 * submission outside their scope is not in the inbox, and a submitter's own confidential ticket
 * is masked in the modal unless their role may see identities (the data itself is unredacted).
 */
export function ticketViewFor(
  viewer: Pick<TicketViewer, 'role' | 'config' | 'gatekeeperCategories'>,
  ticket: Pick<ComplaintTicket, 'isDirectToExecutive' | 'category'>
): TicketView {
  const canViewDirectCeo = viewer.config?.canViewDirectCeoTickets ?? false;
  const directBlocked = ticket.isDirectToExecutive && !canViewDirectCeo;
  const inGatekeeperScope =
    viewer.role !== 'gatekeeper' || viewer.gatekeeperCategories.includes(ticket.category);
  return {
    inTriageScope: !directBlocked && inGatekeeperScope,
    restricted: directBlocked && viewer.role === 'gatekeeper',
    identityShown: viewer.config?.canViewConfidentialIdentities ?? false,
    anonymousEmailShown: viewer.config?.canViewAnonymousSubmitterEmail ?? false,
  };
}

/** Everything a ticket carries to the browser: redacted for the viewer, plus its `view` facts. */
export function presentTicketForViewer(
  viewer: TicketViewer,
  ticket: ComplaintTicket
): ComplaintTicket {
  return { ...redactTicketForViewer(viewer, ticket), view: ticketViewFor(viewer, ticket) };
}

/**
 * Who a stored bell row is for — the one place; the browser filters nothing:
 *   - the CEO alert (and any row addressed to the executive audience) only reaches a role granted
 *     canViewDirectCeoTickets, so the submitter of a direct-to-CEO ticket never receives it;
 *   - an anonymous-chat notification goes to the other side only, never back to its sender
 *     (2026-10-09): staff → the submitter (recipientEmail = the ticket's login email), submitter →
 *     the staff who can see the ticket;
 *   - a CSAT rating is for staff, not for the submitter who gave it.
 * Every other notification follows ticket visibility alone.
 */
export function isNotificationForViewer(
  viewer: Pick<TicketViewer, 'email' | 'role' | 'config'>,
  notification: Pick<NotificationItem, 'type' | 'recipientRole' | 'recipientEmail'>
): boolean {
  const toExecutiveAudience =
    notification.type === 'direct_ceo_alert' || notification.recipientRole === 'executive';
  if (toExecutiveAudience && !viewer.config?.canViewDirectCeoTickets) return false;
  // A CSAT rating is news for the staff handling the ticket, not for the submitter who gave it.
  if (notification.type === 'evaluation_submitted') return viewer.role !== 'employee';
  if (notification.type !== 'chat_message') return true;
  if (notification.recipientRole === 'employee') {
    return sameEmail(notification.recipientEmail, viewer.email);
  }
  return viewer.role !== 'employee';
}

/** A notification's recipient email is only for its recipient. */
export function redactNotificationForViewer(
  viewer: Pick<TicketViewer, 'email'>,
  notification: NotificationItem
): NotificationItem {
  const mine = sameEmail(notification.recipientEmail, viewer.email);
  return mine ? notification : { ...notification, recipientEmail: undefined };
}
