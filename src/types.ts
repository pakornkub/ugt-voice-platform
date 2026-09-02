export type GrievanceCategory =
  | 'HR'
  | 'IT'
  | 'Safety'
  | 'Compliance'
  | 'Ethics'
  | 'Harassment'
  | 'Fraud'
  | 'Quality'
  | 'Environment';

export type SubmissionType = 'complaint' | 'suggestion';

export type TicketStatus =
  'submitted' | 'gatekeeper_triaged' | 'in_progress' | 'resolved' | 'closed';

export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type ConfidentialityLevel = 'anonymous' | 'confidential_restricted' | 'standard_named';

export type UserRole = 'employee' | 'gatekeeper' | 'executive' | 'admin';

export type AppTabId =
  | 'submit'
  | 'my_tickets'
  | 'workflow'
  | 'gatekeeper'
  | 'executive'
  | 'clustering'
  | 'admin_gatekeeper'
  | 'rbac_management'
  // Added by ugt-nextjs-auth-setup (2026-09-02) — NOT governed by
  // RoleAccessConfigs.allowedTabs like the tabs above. Visibility comes from
  // the new RBAC permission system (users:read/roles:read/audit-logs:read)
  // instead, checked directly in Navbar. See docs/project-context/decisions.md.
  | 'admin_users'
  | 'admin_roles'
  | 'admin_audit_logs'
  // Added by ugt-nextjs-mail-setup (2026-09-02) — same pattern as the 3
  // tabs above: governed by RBAC permission (mail-templates:manage), not
  // RoleAccessConfigs.allowedTabs.
  | 'admin_mail_templates';

export interface TabDefinition {
  id: AppTabId;
  nameTh: string;
  nameEn: string;
  descriptionTh: string;
  category: 'core' | 'operations' | 'executive' | 'administration';
  iconName: string;
  defaultRoles: UserRole[];
}

export interface RolePermissionConfig {
  role: UserRole;
  roleTitleTh: string;
  roleTitleEn: string;
  descriptionTh: string;
  badgeColor: string;
  allowedTabs: AppTabId[];
  // Gatekeeper departmental scope
  canViewAllDepartments: boolean;
  assignedDepartments?: GrievanceCategory[]; // If empty or not set and not canViewAll, defaults to specific dept
  // Executive / Special privileges
  canViewDirectCeoTickets: boolean;
  canViewConfidentialIdentities: boolean;
  canEditRootCauseAndCapa: boolean;
  canManageGatekeeperOfficers: boolean;
  canManageRolePermissions: boolean;
}

export interface TimelineLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  status: TicketStatus;
  notes?: string;
  attachmentName?: string;
  isAutomated?: boolean;
}

export interface SatisfactionEvaluation {
  id: string;
  ticketId: string;
  overallScore: number; // 1 to 5
  speedRating: number; // 1 to 5
  resolutionQualityRating: number; // 1 to 5
  serviceMannerRating: number; // 1 to 5
  clarityRating: number; // 1 to 5
  isResolvedPermanently: boolean;
  feedbackComment: string;
  improvementSuggestions?: string;
  evaluatedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
}

export interface ComplaintTicket {
  id: string;
  trackingCode: string; // e.g. TK-2026-0881
  type: SubmissionType; // 'complaint' | 'suggestion'
  category: GrievanceCategory;
  title: string;
  description: string;
  locationOrUnit?: string;

  // High-priority executive channel
  isDirectToExecutive: boolean;

  // Privacy & Confidentiality
  confidentiality: ConfidentialityLevel;
  submitterName?: string;
  submitterEmployeeId?: string;
  submitterDepartment?: string;
  submitterEmail?: string;
  submitterPhone?: string;

  // Triage & Gatekeeper handling
  gatekeeperDepartment: string;
  assignedOfficerName?: string;
  assignedOfficerEmail?: string;
  slaTargetHours: number;
  slaDueDate: string;
  slaStatus: 'on_track' | 'approaching_deadline' | 'overdue' | 'met';

  // State & Assessment
  status: TicketStatus;
  urgency: UrgencyLevel;
  riskSeverity: 'Low' | 'Moderate' | 'High' | 'Severe';
  sentiment?: string;

  // Root cause analysis & clustering
  clusterGroup?: string;
  rootCauseCategory?:
    'Process' | 'People' | 'Equipment/Tools' | 'Policy/Governance' | 'Environment';
  rootCauseSummary?: string;
  preventiveActionPlan?: string;

  // Resolution Details
  resolutionSummary?: string;
  resolvedAt?: string;
  closedAt?: string;

  // Evaluation
  evaluation?: SatisfactionEvaluation;

  // Media
  attachments: Attachment[];

  // Real-time timeline log
  timeline: TimelineLog[];

  // Meta
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  ticketId: string;
  trackingCode: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type:
    'status_update' | 'new_ticket' | 'direct_ceo_alert' | 'satisfaction_pending' | 'sla_warning';
  recipientRole?: UserRole;
  recipientEmail?: string;
}

export interface CategoryInfo {
  key: GrievanceCategory;
  nameTh: string;
  nameEn: string;
  descriptionTh: string;
  responsibleDept: string;
  badgeColor: string;
  iconName: string;
}

export interface GatekeeperOfficer {
  id: string;
  name: string;
  email: string;
  roleTitle: string;
  isLead: boolean;
  avatarUrl?: string;
  phone?: string;
}

export interface ExecutiveMember {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone?: string;
  roleType: 'CEO' | 'EVP' | 'GRC_Chair' | 'Audit_Committee' | 'Board_Member';
  isPrimaryWhistleblowerReceiver: boolean;
  canViewConfidentialIdentities: boolean;
  receiveAlertNotifications: boolean;
  assignedCommittees: string[];
  status: 'active' | 'inactive';
  updatedAt: string;
}

export interface HrAdminMember {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone?: string;
  roleLevel: 'super_admin' | 'hr_manager' | 'compliance_auditor';
  canManageRbac: boolean;
  canManageGatekeepers: boolean;
  canManageExecutives: boolean;
  receiveSystemAlerts: boolean;
  status: 'active' | 'inactive';
  updatedAt: string;
}

export interface DepartmentGatekeeperConfig {
  category: GrievanceCategory;
  departmentName: string;
  departmentCode: string;
  defaultSlaHours: number;
  leadOfficer: GatekeeperOfficer;
  officers: GatekeeperOfficer[];
  autoAssignMode: 'round_robin' | 'lead_manual' | 'workload_balanced';
  escalationEmail?: string;
  notificationWebhookUrl?: string;
  updatedAt: string;
}

export interface ExecutiveMetrics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  directCeoTickets: number;
  avgResolutionDays: number;
  slaComplianceRate: number; // percentage (e.g. 94.2)
  avgCsatScore: number; // 1-5 (e.g. 4.6)
  complaintCount: number;
  suggestionCount: number;
}

// Shape returned by POST /api/ai/analyze-complaint (both the Gemini-backed
// branch and the no-API-key static-heuristics fallback — see route.ts).
export interface AiTriageSuggestion {
  suggestedCategory: GrievanceCategory | string;
  urgencyScore: UrgencyLevel | string;
  sentiment: string;
  riskLevel: string;
  suggestedDepartment: string;
  keyKeywords: string[];
  summary: string;
  recommendedActions: string[];
  isDirectExecutiveWorthy?: boolean;
}

// Shape returned by POST /api/ai/cluster-insights (both the Gemini-backed
// branch and the no-API-key static fallback — see route.ts).
export interface AiRiskCluster {
  clusterName: string;
  category: GrievanceCategory | string;
  count: number;
  rootCause: string;
  preventiveAction: string;
  severity: string;
}

export interface AiClusterInsights {
  topRiskClusters: AiRiskCluster[];
  executiveSummary: string;
  strategicRecommendations: string[];
}
