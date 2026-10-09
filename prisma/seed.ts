// prisma/seed.ts — idempotent seed for UGT VoicePlatform.
// Run with: npx prisma db seed (wired via prisma.config.ts -> migrations.seed)
//
// Mirrors the demo data the app ships today so a freshly migrated database
// starts from the same state as the current localStorage build:
//   - Tickets / timeline / evaluations / gatekeeper configs & officers /
//     notifications come straight from src/mockData.ts.
//   - Executives / HR admins / role-access config are hand-mirrored from
//     src/services/api.ts's INITIAL_EXECUTIVES / INITIAL_HR_ADMINS /
//     INITIAL_ROLE_PERMISSIONS below (NOT imported from api.ts directly —
//     that file also pulls in the browser-only sql.js/localStorage layer via
//     src/services/sqliteDb.ts, which has no place in a Node seed script).
//     Keep these three lists in sync with api.ts until it is retired.
// Reuses the app's own Prisma singleton (mssql driver adapter + parsed
// DATABASE_URL) instead of `new PrismaClient()` — a bare client has no
// adapter and throws immediately (Prisma 7 requires one for every driver).
import { prisma } from '../lib/prisma';
import {
  INITIAL_COMPLAINTS,
  INITIAL_GATEKEEPER_CONFIGS,
  INITIAL_NOTIFICATIONS,
} from '../src/mockData';
import type {
  AppTabId,
  ExecutiveMember,
  GrievanceCategory,
  HrAdminMember,
  UserRole,
} from '../src/types';

// ── Executives — mirrors src/services/api.ts:INITIAL_EXECUTIVES ───────────
const EXECUTIVES: ExecutiveMember[] = [
  {
    id: 'exec-1',
    name: 'คุณประเสริฐ อัครเดชานนท์',
    position: 'ประธานเจ้าหน้าที่บริหาร (Chief Executive Officer - CEO)',
    department: 'สำนักประธานเจ้าหน้าที่บริหาร (Office of the CEO)',
    email: 'prasert.ceo@enterprise.co.th',
    phone: '02-998-1001',
    roleType: 'CEO',
    isPrimaryWhistleblowerReceiver: true,
    canViewConfidentialIdentities: true,
    receiveAlertNotifications: true,
    assignedCommittees: ['คณะกรรมการบริหารระดับสูง (ExCom)', 'คณะกรรมการจริยธรรมองค์กร'],
    status: 'active',
    updatedAt: '2026-08-28T08:00:00.000Z',
  },
  {
    id: 'exec-2',
    name: 'ดร.กานดา รัตนพาณิชย์',
    position:
      'รองกรรมการผู้จัดการใหญ่อาวุโส สายงานบรรษัทภิบาลและความยั่งยืน (Senior EVP Governance & GRC)',
    department: 'Corporate Governance & Risk Oversight Group',
    email: 'kanda.r@enterprise.co.th',
    phone: '02-998-1002',
    roleType: 'EVP',
    isPrimaryWhistleblowerReceiver: true,
    canViewConfidentialIdentities: true,
    receiveAlertNotifications: true,
    assignedCommittees: ['คณะกรรมการกำกับดูแลการทุจริตและจริยธรรม', 'คณะกรรมการบริหารความเสี่ยง'],
    status: 'active',
    updatedAt: '2026-08-28T08:00:00.000Z',
  },
  {
    id: 'exec-3',
    name: 'คุณธีรภัทร เอกวิริยะ',
    position: 'ประธานคณะกรรมการตรวจสอบและธรรมาภิบาล (Audit Committee Chair)',
    department: 'คณะกรรมการตรวจสอบอิสระ (Independent Audit Committee)',
    email: 'theeraphat.audit@enterprise.co.th',
    phone: '02-998-1003',
    roleType: 'Audit_Committee',
    isPrimaryWhistleblowerReceiver: true,
    canViewConfidentialIdentities: false,
    receiveAlertNotifications: true,
    assignedCommittees: ['คณะกรรมการตรวจสอบภายใน', 'คณะกรรมการสอบสวนทางวินัยร้ายแรง'],
    status: 'active',
    updatedAt: '2026-08-28T08:00:00.000Z',
  },
  {
    id: 'exec-4',
    name: 'คุณศิรินทร์ รัตนดิลก',
    position: 'ผู้ช่วยกรรมการผู้จัดการใหญ่ สายงานทรัพยากรบุคคล (Chief People Officer - CPO)',
    department: 'People & Culture Corporate Group',
    email: 'sirin.r@enterprise.co.th',
    phone: '02-998-1004',
    roleType: 'EVP',
    isPrimaryWhistleblowerReceiver: false,
    canViewConfidentialIdentities: false,
    receiveAlertNotifications: true,
    assignedCommittees: [
      'คณะกรรมการบริหารระดับสูง (ExCom)',
      'คณะกรรมการแรงงานสัมพันธ์และสวัสดิการ',
    ],
    status: 'active',
    updatedAt: '2026-08-28T08:00:00.000Z',
  },
];

// ── HR Admins — mirrors src/services/api.ts:INITIAL_HR_ADMINS ─────────────
const HR_ADMINS: HrAdminMember[] = [
  {
    id: 'admin-1',
    name: 'คุณชิดชนก วงศ์ประเสริฐ',
    position:
      'ผู้อำนวยการฝ่ายทรัพยากรบุคคลและตัวแทนผู้บริหาร (HR Director & Executive Representative)',
    department: 'People & Organization Strategy Division',
    email: 'chidchanok.w@enterprise.co.th',
    phone: '02-998-2001',
    roleLevel: 'super_admin',
    canManageRbac: true,
    canManageGatekeepers: true,
    canManageExecutives: true,
    receiveSystemAlerts: true,
    status: 'active',
    updatedAt: '2026-08-28T08:00:00.000Z',
  },
  {
    id: 'admin-2',
    name: 'คุณเอกชัย ศิริสมบัติ',
    position:
      'ผู้จัดการฝ่ายแรงงานสัมพันธ์และข้อร้องเรียนพนักงาน (Employee Relations & Grievance Manager)',
    department: 'Employee Relations & Staff Engagement Unit',
    email: 'ekachai.s@enterprise.co.th',
    phone: '02-998-2002',
    roleLevel: 'hr_manager',
    canManageRbac: true,
    canManageGatekeepers: true,
    canManageExecutives: false,
    receiveSystemAlerts: true,
    status: 'active',
    updatedAt: '2026-08-28T08:00:00.000Z',
  },
  {
    id: 'admin-3',
    name: 'คุณธนกฤต เมธีธรรม',
    position: 'ผู้เชี่ยวชาญอาวุโสด้านการปฏิบัติตามกฎเกณฑ์ (Senior GRC & Compliance Specialist)',
    department: 'Corporate Governance & Internal Compliance Group',
    email: 'thanakrit.m@enterprise.co.th',
    phone: '02-998-2003',
    roleLevel: 'compliance_auditor',
    canManageRbac: false,
    canManageGatekeepers: true,
    canManageExecutives: false,
    receiveSystemAlerts: true,
    status: 'active',
    updatedAt: '2026-08-28T08:00:00.000Z',
  },
  {
    id: 'admin-4',
    name: 'คุณสุชาดา พิพัฒน์ธนากุล',
    position: 'ผู้ดูแลระบบสารสนเทศบุคคลและสิทธิ์การเข้าถึง (HRIS & System Access Administrator)',
    department: 'HR Digital Operations & Systems Unit',
    email: 'suchada.p@enterprise.co.th',
    phone: '02-998-2004',
    roleLevel: 'super_admin',
    canManageRbac: true,
    canManageGatekeepers: true,
    canManageExecutives: true,
    receiveSystemAlerts: true,
    status: 'active',
    updatedAt: '2026-08-28T08:00:00.000Z',
  },
];

// ── Role access config — mirrors src/services/api.ts:INITIAL_ROLE_PERMISSIONS
const ROLE_ACCESS_CONFIGS: Array<{
  role: UserRole;
  roleTitleTh: string;
  roleTitleEn: string;
  descriptionTh: string;
  badgeColor: string;
  allowedTabs: AppTabId[];
  canViewAllDepartments: boolean;
  assignedDepartments: GrievanceCategory[];
  canViewDirectCeoTickets: boolean;
  canViewConfidentialIdentities: boolean;
  canViewAnonymousSubmitterEmail: boolean;
  canEditRootCauseAndCapa: boolean;
  canManageGatekeeperOfficers: boolean;
  canManageRolePermissions: boolean;
}> = [
  {
    role: 'employee',
    roleTitleTh: 'พนักงานทั่วไป (General Employee)',
    roleTitleEn: 'General Employee',
    descriptionTh:
      'ผู้ใช้งานทั่วไป สามารถยื่นข้อร้องเรียน/ข้อเสนอแนะ ติดตามสถานะคำร้องของตนเอง และศึกษาคู่มือเกณฑ์มาตรฐาน',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    allowedTabs: ['submit', 'my_tickets', 'workflow'],
    canViewAllDepartments: false,
    assignedDepartments: [],
    canViewDirectCeoTickets: false,
    canViewConfidentialIdentities: false,
    canViewAnonymousSubmitterEmail: false,
    canEditRootCauseAndCapa: false,
    canManageGatekeeperOfficers: false,
    canManageRolePermissions: false,
  },
  {
    role: 'gatekeeper',
    roleTitleTh: 'ผู้ประสานงานหน่วยงาน (Gatekeeper)',
    roleTitleEn: 'Department Gatekeeper',
    descriptionTh:
      'เจ้าหน้าที่ผู้รับผิดชอบประจำหน่วยงาน คัดกรอง สืบสวน และส่งต่อแก้ไขตามสายงานที่เกี่ยวข้อง',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    allowedTabs: ['gatekeeper', 'my_tickets', 'workflow'],
    canViewAllDepartments: true,
    assignedDepartments: ['HR', 'Compliance', 'Ethics', 'Fraud', 'Harassment', 'Quality'],
    canViewDirectCeoTickets: false,
    canViewConfidentialIdentities: false,
    canViewAnonymousSubmitterEmail: false,
    canEditRootCauseAndCapa: true,
    canManageGatekeeperOfficers: false,
    canManageRolePermissions: false,
  },
  {
    role: 'executive',
    roleTitleTh: 'ผู้บริหารระดับสูง (CEO / EVP / GRC)',
    roleTitleEn: 'Executive & Governance Board',
    descriptionTh:
      'ผู้บริหารและคณะกรรมการกำกับดูแล เข้าถึงแดชบอร์ดภาพรวม กล่องข้อร้องเรียนสายตรง Whistleblower และการวิเคราะห์ CAPA',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    allowedTabs: ['executive', 'clustering', 'workflow'],
    canViewAllDepartments: true,
    assignedDepartments: [],
    canViewDirectCeoTickets: true,
    canViewConfidentialIdentities: false,
    canViewAnonymousSubmitterEmail: true,
    canEditRootCauseAndCapa: true,
    canManageGatekeeperOfficers: false,
    canManageRolePermissions: false,
  },
  {
    role: 'admin',
    roleTitleTh: 'HR Administrator & ตัวแทนผู้บริหาร',
    roleTitleEn: 'HR Admin & Executive Representative',
    descriptionTh:
      'ผู้ดูแลระบบสูงสุดและตัวแทนฝ่ายบริหาร มีสิทธิ์เข้าถึงทุกฟังก์ชัน กำหนดสิทธิ์ RBAC และจัดสรรผู้รับผิดชอบหน่วยงาน',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    allowedTabs: [
      'submit',
      'my_tickets',
      'workflow',
      'gatekeeper',
      'executive',
      'clustering',
      'admin_gatekeeper',
      'rbac_management',
      'admin_users',
      'admin_audit_logs',
    ],
    canViewAllDepartments: true,
    assignedDepartments: [],
    canViewDirectCeoTickets: true,
    canViewConfidentialIdentities: true,
    canViewAnonymousSubmitterEmail: true,
    canEditRootCauseAndCapa: true,
    canManageGatekeeperOfficers: true,
    canManageRolePermissions: true,
  },
];

async function seedGatekeeperConfigs() {
  for (const category of Object.keys(INITIAL_GATEKEEPER_CONFIGS) as GrievanceCategory[]) {
    const cfg = INITIAL_GATEKEEPER_CONFIGS[category];
    const configData = {
      departmentName: cfg.departmentName,
      departmentCode: cfg.departmentCode,
      autoAssignMode: cfg.autoAssignMode,
      escalationEmail: cfg.escalationEmail ?? null,
      notificationWebhookUrl: cfg.notificationWebhookUrl ?? null,
    };
    await prisma.departmentGatekeeperConfig.upsert({
      where: { category },
      create: { category, ...configData },
      update: configData,
    });

    // Mock data lists the lead officer twice (once as `leadOfficer`, once
    // again inside `officers`) — de-dupe by id.
    const seen = new Set<string>();
    for (const officer of cfg.officers) {
      if (seen.has(officer.id)) continue;
      seen.add(officer.id);
      const officerData = {
        category,
        name: officer.name,
        roleTitle: officer.roleTitle,
        email: officer.email,
        phone: officer.phone ?? null,
        isLead: officer.isLead,
        avatarUrl: officer.avatarUrl ?? null,
      };
      await prisma.gatekeeperOfficer.upsert({
        where: { id: officer.id },
        create: { id: officer.id, ...officerData },
        update: officerData,
      });
    }
  }
}

async function seedTickets() {
  for (const ticket of INITIAL_COMPLAINTS) {
    const ticketData = {
      trackingCode: ticket.trackingCode,
      type: ticket.type,
      category: ticket.category,
      title: ticket.title,
      description: ticket.description,
      locationOrUnit: ticket.locationOrUnit ?? null,
      isDirectToExecutive: ticket.isDirectToExecutive,
      confidentiality: ticket.confidentiality,
      submitterName: ticket.submitterName ?? null,
      submitterEmployeeId: ticket.submitterEmployeeId ?? null,
      submitterDepartment: ticket.submitterDepartment ?? null,
      submitterEmail: ticket.submitterEmail ?? null,
      submitterPhone: ticket.submitterPhone ?? null,
      loginEmail: ticket.loginEmail ?? null,
      isAnonymousMapped: ticket.isAnonymousMapped ?? false,
      gatekeeperDepartment: ticket.gatekeeperDepartment,
      assignedOfficerName: ticket.assignedOfficerName ?? null,
      assignedOfficerEmail: ticket.assignedOfficerEmail ?? null,
      status: ticket.status,
      urgency: ticket.urgency,
      riskSeverity: ticket.riskSeverity,
      sentiment: ticket.sentiment ?? null,
      clusterGroup: ticket.clusterGroup ?? null,
      rootCauseCategory: ticket.rootCauseCategory ?? null,
      rootCauseSummary: ticket.rootCauseSummary ?? null,
      preventiveActionPlan: ticket.preventiveActionPlan ?? null,
      resolutionSummary: ticket.resolutionSummary ?? null,
      resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt) : null,
      closedAt: ticket.closedAt ? new Date(ticket.closedAt) : null,
      // Real Attachments table (ugt-nextjs-upload-setup, 2026-09-02) replaces
      // the former AttachmentsJson bridging column — see decisions.md. Not
      // seeded here on purpose: src/mockData.ts's Attachment[] entries are
      // simulator output (Math.random()-generated names/sizes, no real bytes
      // anywhere) — inserting an Attachments row pointing at a storageKey with
      // nothing on the volume would make its download 404/ENOENT instead of
      // simply not existing, which is worse than leaving no seed rows.
      createdAt: new Date(ticket.createdAt),
      updatedAt: new Date(ticket.updatedAt),
    };
    await prisma.ticket.upsert({
      where: { id: ticket.id },
      create: { id: ticket.id, ...ticketData },
      update: ticketData,
    });

    for (const log of ticket.timeline) {
      const logData = {
        ticketId: ticket.id,
        status: log.status,
        action: log.action,
        actor: log.actor,
        actorRole: log.actorRole,
        notes: log.notes ?? null,
        attachmentName: log.attachmentName ?? null,
        isAutomated: log.isAutomated ?? false,
        createdAt: new Date(log.timestamp),
      };
      await prisma.ticketTimelineLog.upsert({
        where: { id: log.id },
        create: { id: log.id, ...logData },
        update: logData,
      });
    }

    for (const msg of ticket.anonymousMessages ?? []) {
      const msgData = {
        ticketId: ticket.id,
        senderRole: msg.senderRole,
        senderDisplayName: msg.senderDisplayName,
        message: msg.message,
        isStaff: msg.isStaff,
        isReadByEmployee: msg.isReadByEmployee ?? false,
        isReadByStaff: msg.isReadByStaff ?? false,
        createdAt: new Date(msg.timestamp),
      };
      await prisma.ticketAnonymousMessage.upsert({
        where: { id: msg.id },
        create: { id: msg.id, ...msgData },
        update: msgData,
      });
    }

    if (ticket.evaluation) {
      const ev = ticket.evaluation;
      const evalData = {
        overallScore: ev.overallScore,
        speedRating: ev.speedRating,
        resolutionQualityRating: ev.resolutionQualityRating,
        serviceMannerRating: ev.serviceMannerRating,
        clarityRating: ev.clarityRating,
        isResolvedPermanently: ev.isResolvedPermanently,
        feedbackComment: ev.feedbackComment ?? null,
        improvementSuggestions: ev.improvementSuggestions ?? null,
        createdAt: new Date(ev.evaluatedAt),
      };
      await prisma.ticketEvaluation.upsert({
        where: { ticketId: ticket.id },
        create: { id: ev.id, ticketId: ticket.id, ...evalData },
        update: evalData,
      });
    }
  }
}

async function seedNotifications() {
  for (const n of INITIAL_NOTIFICATIONS) {
    const notifData = {
      ticketId: n.ticketId ?? null,
      trackingCode: n.trackingCode ?? null,
      title: n.title,
      message: n.message,
      type: n.type,
      recipientRole: n.recipientRole ?? null,
      recipientEmail: n.recipientEmail ?? null,
      isRead: n.read,
      createdAt: new Date(n.timestamp),
    };
    await prisma.notification.upsert({
      where: { id: n.id },
      create: { id: n.id, ...notifData },
      update: notifData,
    });
  }
}

async function seedExecutives() {
  for (const exec of EXECUTIVES) {
    const data = {
      name: exec.name,
      position: exec.position,
      department: exec.department,
      email: exec.email,
      phone: exec.phone ?? null,
      roleType: exec.roleType,
      isPrimaryWhistleblowerReceiver: exec.isPrimaryWhistleblowerReceiver,
      canViewConfidentialIdentities: exec.canViewConfidentialIdentities,
      receiveAlertNotifications: exec.receiveAlertNotifications,
      assignedCommitteesJson: JSON.stringify(exec.assignedCommittees ?? []),
      status: exec.status,
      updatedAt: new Date(exec.updatedAt),
    };
    await prisma.executiveMember.upsert({
      where: { id: exec.id },
      create: { id: exec.id, ...data },
      update: data,
    });
  }
}

async function seedHrAdmins() {
  for (const admin of HR_ADMINS) {
    const data = {
      name: admin.name,
      position: admin.position,
      department: admin.department,
      email: admin.email,
      phone: admin.phone ?? null,
      roleLevel: admin.roleLevel,
      canManageRbac: admin.canManageRbac,
      canManageGatekeepers: admin.canManageGatekeepers,
      canManageExecutives: admin.canManageExecutives,
      receiveSystemAlerts: admin.receiveSystemAlerts,
      status: admin.status,
      updatedAt: new Date(admin.updatedAt),
    };
    await prisma.hrAdminMember.upsert({
      where: { id: admin.id },
      create: { id: admin.id, ...data },
      update: data,
    });
  }
}

async function seedRoleAccessConfigs() {
  for (const cfg of ROLE_ACCESS_CONFIGS) {
    const data = {
      roleTitleTh: cfg.roleTitleTh,
      roleTitleEn: cfg.roleTitleEn,
      descriptionTh: cfg.descriptionTh,
      badgeColor: cfg.badgeColor,
      allowedTabsJson: JSON.stringify(cfg.allowedTabs),
      canViewAllDepartments: cfg.canViewAllDepartments,
      assignedDepartmentsJson: JSON.stringify(cfg.assignedDepartments ?? []),
      canViewDirectCeoTickets: cfg.canViewDirectCeoTickets,
      canViewConfidentialIdentities: cfg.canViewConfidentialIdentities,
      canViewAnonymousSubmitterEmail: cfg.canViewAnonymousSubmitterEmail,
      canEditRootCauseAndCapa: cfg.canEditRootCauseAndCapa,
      canManageGatekeeperOfficers: cfg.canManageGatekeeperOfficers,
      canManageRolePermissions: cfg.canManageRolePermissions,
    };
    await prisma.roleAccessConfig.upsert({
      where: { role: cfg.role },
      create: { role: cfg.role, ...data },
      update: data,
    });
  }
}

async function main() {
  console.log('Seeding UGT VoicePlatform...');
  await seedGatekeeperConfigs();
  await seedTickets();
  await seedNotifications();
  await seedExecutives();
  await seedHrAdmins();
  await seedRoleAccessConfigs();
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
