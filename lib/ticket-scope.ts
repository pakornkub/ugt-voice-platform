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
import type { GrievanceCategory, RolePermissionConfig, UserRole } from '@/types';

export interface TicketViewer {
  userId: string;
  email: string;
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

export function touchesTriageFields(updates: Partial<Record<string, unknown>>): boolean {
  return TRIAGE_FIELDS.some((field) => updates[field] !== undefined);
}
