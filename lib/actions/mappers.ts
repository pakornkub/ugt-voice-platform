// src/lib/actions/mappers.ts — Prisma row <-> app domain type converters.
// Every Server Action in this folder returns shapes from src/types.ts (not
// raw Prisma rows), so a future call-site swap from src/services/api.ts to
// these actions is a drop-in change wherever the signatures line up.
import type {
  departmentGatekeeperConfig as DeptConfigRow,
  executiveMember as ExecutiveRow,
  gatekeeperOfficer as OfficerRow,
  hrAdminMember as HrAdminRow,
  notification as NotificationRow,
  roleAccessConfig as RoleAccessRow,
  ticket as TicketRow,
  ticketEvaluation as EvaluationRow,
  ticketTimelineLog as TimelineRow,
} from '@prisma/client';
import type {
  Attachment,
  ComplaintTicket,
  DepartmentGatekeeperConfig,
  ExecutiveMember,
  GatekeeperOfficer,
  GrievanceCategory,
  HrAdminMember,
  NotificationItem,
  RolePermissionConfig,
  SatisfactionEvaluation,
  TimelineLog,
} from '@/types';

function parseJsonArray<T>(json: string | null | undefined, fallback: T[] = []): T[] {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function mapTimeline(row: TimelineRow): TimelineLog {
  return {
    id: row.id,
    timestamp: row.createdAt.toISOString(),
    actor: row.actor,
    actorRole: row.actorRole,
    action: row.action,
    status: row.status as TimelineLog['status'],
    notes: row.notes ?? undefined,
    attachmentName: row.attachmentName ?? undefined,
    isAutomated: row.isAutomated,
  };
}

export function mapEvaluation(row: EvaluationRow): SatisfactionEvaluation {
  return {
    id: row.id,
    ticketId: row.ticketId,
    overallScore: row.overallScore,
    speedRating: row.speedRating,
    resolutionQualityRating: row.resolutionQualityRating,
    serviceMannerRating: row.serviceMannerRating,
    clarityRating: row.clarityRating,
    isResolvedPermanently: row.isResolvedPermanently,
    feedbackComment: row.feedbackComment ?? '',
    improvementSuggestions: row.improvementSuggestions ?? undefined,
    evaluatedAt: row.createdAt.toISOString(),
  };
}

export function mapTicket(
  row: TicketRow & { timeline?: TimelineRow[]; evaluation?: EvaluationRow | null }
): ComplaintTicket {
  return {
    id: row.id,
    trackingCode: row.trackingCode,
    type: row.type as ComplaintTicket['type'],
    category: row.category as GrievanceCategory,
    title: row.title,
    description: row.description,
    locationOrUnit: row.locationOrUnit ?? undefined,
    isDirectToExecutive: row.isDirectToExecutive,
    confidentiality: row.confidentiality as ComplaintTicket['confidentiality'],
    submitterName: row.submitterName ?? undefined,
    submitterEmployeeId: row.submitterEmployeeId ?? undefined,
    submitterDepartment: row.submitterDepartment ?? undefined,
    submitterEmail: row.submitterEmail ?? undefined,
    submitterPhone: row.submitterPhone ?? undefined,
    gatekeeperDepartment: row.gatekeeperDepartment,
    assignedOfficerName: row.assignedOfficerName ?? undefined,
    assignedOfficerEmail: row.assignedOfficerEmail ?? undefined,
    slaTargetHours: row.slaTargetHours,
    slaDueDate: row.slaDueDate.toISOString(),
    slaStatus: row.slaStatus as ComplaintTicket['slaStatus'],
    status: row.status as ComplaintTicket['status'],
    urgency: row.urgency as ComplaintTicket['urgency'],
    riskSeverity: row.riskSeverity as ComplaintTicket['riskSeverity'],
    sentiment: row.sentiment ?? undefined,
    clusterGroup: row.clusterGroup ?? undefined,
    rootCauseCategory: (row.rootCauseCategory as ComplaintTicket['rootCauseCategory']) ?? undefined,
    rootCauseSummary: row.rootCauseSummary ?? undefined,
    preventiveActionPlan: row.preventiveActionPlan ?? undefined,
    resolutionSummary: row.resolutionSummary ?? undefined,
    resolvedAt: row.resolvedAt?.toISOString(),
    closedAt: row.closedAt?.toISOString(),
    evaluation: row.evaluation ? mapEvaluation(row.evaluation) : undefined,
    attachments: parseJsonArray<Attachment>(row.attachmentsJson),
    timeline: (row.timeline ?? []).map(mapTimeline),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    ticketId: row.ticketId ?? '',
    trackingCode: row.trackingCode ?? '',
    title: row.title,
    message: row.message,
    timestamp: row.createdAt.toISOString(),
    read: row.isRead,
    type: row.type as NotificationItem['type'],
    recipientRole: (row.recipientRole as NotificationItem['recipientRole']) ?? undefined,
    recipientEmail: row.recipientEmail ?? undefined,
  };
}

export function mapOfficer(row: OfficerRow): GatekeeperOfficer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roleTitle: row.roleTitle,
    isLead: row.isLead,
    avatarUrl: row.avatarUrl ?? undefined,
    phone: row.phone ?? undefined,
  };
}

export function mapDepartmentConfig(row: DeptConfigRow & { officers: OfficerRow[] }): DepartmentGatekeeperConfig {
  const officers = row.officers.map(mapOfficer);
  const lead = officers.find((o) => o.isLead) ?? officers[0];
  return {
    category: row.category as GrievanceCategory,
    departmentName: row.departmentName,
    departmentCode: row.departmentCode,
    defaultSlaHours: row.defaultSlaHours,
    leadOfficer: lead as GatekeeperOfficer,
    officers,
    autoAssignMode: row.autoAssignMode as DepartmentGatekeeperConfig['autoAssignMode'],
    escalationEmail: row.escalationEmail ?? undefined,
    notificationWebhookUrl: row.notificationWebhookUrl ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapExecutive(row: ExecutiveRow): ExecutiveMember {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    department: row.department,
    email: row.email,
    phone: row.phone ?? undefined,
    roleType: row.roleType as ExecutiveMember['roleType'],
    isPrimaryWhistleblowerReceiver: row.isPrimaryWhistleblowerReceiver,
    canViewConfidentialIdentities: row.canViewConfidentialIdentities,
    receiveAlertNotifications: row.receiveAlertNotifications,
    assignedCommittees: parseJsonArray<string>(row.assignedCommitteesJson),
    status: row.status as ExecutiveMember['status'],
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapHrAdmin(row: HrAdminRow): HrAdminMember {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    department: row.department,
    email: row.email,
    phone: row.phone ?? undefined,
    roleLevel: row.roleLevel as HrAdminMember['roleLevel'],
    canManageRbac: row.canManageRbac,
    canManageGatekeepers: row.canManageGatekeepers,
    canManageExecutives: row.canManageExecutives,
    receiveSystemAlerts: row.receiveSystemAlerts,
    status: row.status as HrAdminMember['status'],
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapRoleAccessConfig(row: RoleAccessRow): RolePermissionConfig {
  return {
    role: row.role as RolePermissionConfig['role'],
    roleTitleTh: row.roleTitleTh,
    roleTitleEn: row.roleTitleEn,
    descriptionTh: row.descriptionTh,
    badgeColor: row.badgeColor,
    allowedTabs: parseJsonArray(row.allowedTabsJson),
    canViewAllDepartments: row.canViewAllDepartments,
    assignedDepartments: parseJsonArray<GrievanceCategory>(row.assignedDepartmentsJson),
    canViewDirectCeoTickets: row.canViewDirectCeoTickets,
    canViewConfidentialIdentities: row.canViewConfidentialIdentities,
    canEditRootCauseAndCapa: row.canEditRootCauseAndCapa,
    canManageGatekeeperOfficers: row.canManageGatekeeperOfficers,
    canManageRolePermissions: row.canManageRolePermissions,
  };
}
