import {
  AppTabId,
  ComplaintTicket,
  DepartmentGatekeeperConfig,
  GatekeeperOfficer,
  ExecutiveMember,
  HrAdminMember,
  GrievanceCategory,
  NotificationItem,
  RolePermissionConfig,
  SatisfactionEvaluation,
  TabDefinition,
  TicketStatus,
  UserRole,
} from '../types';
import {
  INITIAL_COMPLAINTS,
  INITIAL_NOTIFICATIONS,
  CATEGORY_DEFINITIONS,
  INITIAL_GATEKEEPER_CONFIGS,
} from '../mockData';
import { syncAllTicketsToSqlite } from './sqliteDb';
import { safeStorage } from './safeStorage';

const STORAGE_KEY_TICKETS = 'enterprise_grievance_tickets_v3';
const STORAGE_KEY_NOTIFS = 'enterprise_grievance_notifs_v3';
const STORAGE_KEY_GATEKEEPERS = 'enterprise_grievance_gatekeepers_v3';
const STORAGE_KEY_RBAC = 'enterprise_grievance_rbac_permissions_v3';
const STORAGE_KEY_ACTIVE_GK_DEPT = 'enterprise_grievance_active_gk_dept_v1';
const STORAGE_KEY_EXECUTIVES = 'enterprise_grievance_executives_v1';
const STORAGE_KEY_HR_ADMINS = 'enterprise_grievance_hr_admins_v1';

export const INITIAL_EXECUTIVES: ExecutiveMember[] = [
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

export const INITIAL_HR_ADMINS: HrAdminMember[] = [
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

export const APP_TABS: TabDefinition[] = [
  {
    id: 'submit',
    nameTh: 'ยื่นข้อร้องเรียน',
    nameEn: 'Submit Grievance',
    descriptionTh: 'ฟอร์มส่งข้อร้องเรียน/ข้อเสนอแนะ พร้อมระบบ AI ช่วยคัดกรองและประเมินความเสี่ยง',
    category: 'core',
    iconName: 'FileText',
    defaultRoles: ['employee', 'admin'],
  },
  {
    id: 'my_tickets',
    nameTh: 'ติดตามสถานะ & คำร้องของฉัน',
    nameEn: 'My Submissions & Tracking',
    descriptionTh: 'ตรวจสอบสถานะคำร้อง ดู Timeline การดำเนินงาน และประเมินความพึงพอใจ CSAT',
    category: 'core',
    iconName: 'ListChecks',
    defaultRoles: ['employee', 'gatekeeper', 'admin'],
  },
  {
    id: 'workflow',
    nameTh: 'คู่มือและเกณฑ์มาตรฐาน',
    nameEn: 'Manual & Governance Guidelines',
    descriptionTh: 'ผังขั้นตอนการทำงาน (Workflow), เกณฑ์ความปลอดภัย PDPA และนโยบายคุ้มครองพนักงาน',
    category: 'core',
    iconName: 'GitBranch',
    defaultRoles: ['employee', 'gatekeeper', 'executive', 'admin'],
  },
  {
    id: 'gatekeeper',
    nameTh: 'ศูนย์รับเรื่องและคัดกรอง (Gatekeeper Inbox)',
    nameEn: 'Gatekeeper Triage Inbox',
    descriptionTh: 'กล่องรับเรื่องและมอบหมายงานเฉพาะหน่วยงานที่รับผิดชอบ บันทึกสืบสวนและแผนแก้ไข',
    category: 'operations',
    iconName: 'Shield',
    defaultRoles: ['gatekeeper', 'admin'],
  },
  {
    id: 'executive',
    nameTh: 'Dashboard',
    nameEn: 'Executive Dashboard & Whistleblower',
    descriptionTh:
      'แดชบอร์ดสรุปผลเชิงวิเคราะห์ระดับผู้บริหาร (CEO/EVP) ตัวชี้วัด SLA, CSAT และสายตรง',
    category: 'executive',
    iconName: 'Crown',
    defaultRoles: ['executive', 'admin'],
  },
  {
    id: 'clustering',
    nameTh: 'วิเคราะห์สาเหตุ CAPA',
    nameEn: 'Root Cause & CAPA Clustering',
    descriptionTh:
      'การจัดกลุ่มปัญหาซ้ำซ้อน วิเคราะห์สาเหตุเชิงลึก (Root Cause) และมาตรการป้องกันเชิงรุก',
    category: 'executive',
    iconName: 'Layers',
    defaultRoles: ['executive', 'admin'],
  },
  {
    id: 'admin_gatekeeper',
    nameTh: 'จัดการผู้บริหาร, Admin & Gatekeeper',
    nameEn: 'Personnel & Governance Directory',
    descriptionTh:
      'Maintain รายชื่อคณะผู้บริหารระดับสูง (CEO/EVP Whistleblower Channel), ทีมงาน HR Admin และผู้รับผิดชอบ 9 ฝ่ายงาน',
    category: 'administration',
    iconName: 'Users',
    defaultRoles: ['admin'],
  },
  {
    id: 'rbac_management',
    nameTh: 'กำหนดสิทธิ์การเข้าถึง (RBAC)',
    nameEn: 'Role-Based Access Management',
    descriptionTh:
      'ศูนย์ควบคุมสิทธิ์ (HR Admin & ตัวแทนผู้บริหาร) กำหนดสิทธิ์การมองเห็นและขอบเขตหน่วยงานของแต่ละ Role',
    category: 'administration',
    iconName: 'SlidersHorizontal',
    defaultRoles: ['admin'],
  },
];

export const INITIAL_ROLE_PERMISSIONS: Record<UserRole, RolePermissionConfig> = {
  employee: {
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
    canEditRootCauseAndCapa: false,
    canManageGatekeeperOfficers: false,
    canManageRolePermissions: false,
  },
  gatekeeper: {
    role: 'gatekeeper',
    roleTitleTh: 'ผู้ประสานงานหน่วยงาน (Gatekeeper)',
    roleTitleEn: 'Department Gatekeeper',
    descriptionTh:
      'เจ้าหน้าที่ผู้รับผิดชอบประจำหน่วยงาน คัดกรอง สืบสวน และส่งต่อแก้ไขตามสายงานที่เกี่ยวข้อง',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    allowedTabs: ['gatekeeper', 'my_tickets', 'workflow'],
    canViewAllDepartments: true,
    assignedDepartments: [
      'IT',
      'HR',
      'Safety',
      'Compliance',
      'Ethics',
      'Harassment',
      'Fraud',
      'Quality',
      'Environment',
    ],
    canViewDirectCeoTickets: false,
    canViewConfidentialIdentities: false,
    canEditRootCauseAndCapa: true,
    canManageGatekeeperOfficers: false,
    canManageRolePermissions: false,
  },
  executive: {
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
    canEditRootCauseAndCapa: true,
    canManageGatekeeperOfficers: false,
    canManageRolePermissions: false,
  },
  admin: {
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
    ],
    canViewAllDepartments: true,
    assignedDepartments: [],
    canViewDirectCeoTickets: true,
    canViewConfidentialIdentities: true,
    canEditRootCauseAndCapa: true,
    canManageGatekeeperOfficers: true,
    canManageRolePermissions: true,
  },
};

export function getStoredRolePermissions(): Record<UserRole, RolePermissionConfig> {
  try {
    const data = safeStorage.getItem(STORAGE_KEY_RBAC);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure all current roles exist
      return {
        ...INITIAL_ROLE_PERMISSIONS,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to load RBAC permissions from localStorage', e);
  }
  safeStorage.setItem(STORAGE_KEY_RBAC, JSON.stringify(INITIAL_ROLE_PERMISSIONS));
  return INITIAL_ROLE_PERMISSIONS;
}

export function saveStoredRolePermissions(permissions: Record<UserRole, RolePermissionConfig>) {
  try {
    safeStorage.setItem(STORAGE_KEY_RBAC, JSON.stringify(permissions));
  } catch (e) {
    console.error('Failed to save RBAC permissions', e);
  }
}

export function updateRolePermissionConfig(
  role: UserRole,
  updatedConfig: Partial<RolePermissionConfig>
): Record<UserRole, RolePermissionConfig> {
  const current = getStoredRolePermissions();
  const target = current[role] || INITIAL_ROLE_PERMISSIONS[role];

  const merged: RolePermissionConfig = {
    ...target,
    ...updatedConfig,
  };

  const updated = {
    ...current,
    [role]: merged,
  };

  saveStoredRolePermissions(updated);
  return updated;
}

export function resetRolePermissionsToDefault(): Record<UserRole, RolePermissionConfig> {
  saveStoredRolePermissions(INITIAL_ROLE_PERMISSIONS);
  return INITIAL_ROLE_PERMISSIONS;
}

export function getActiveGatekeeperDepartment(): GrievanceCategory {
  try {
    const data = safeStorage.getItem(STORAGE_KEY_ACTIVE_GK_DEPT);
    if (data && CATEGORY_DEFINITIONS[data as GrievanceCategory]) {
      return data as GrievanceCategory;
    }
  } catch (e) {
    console.error('Failed to load active GK department', e);
  }
  return 'IT';
}

export function setActiveGatekeeperDepartment(cat: GrievanceCategory) {
  try {
    safeStorage.setItem(STORAGE_KEY_ACTIVE_GK_DEPT, cat);
  } catch (e) {
    console.error('Failed to set active GK department', e);
  }
}

export function getStoredGatekeeperConfigs(): Record<
  GrievanceCategory,
  DepartmentGatekeeperConfig
> {
  try {
    const data = safeStorage.getItem(STORAGE_KEY_GATEKEEPERS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load gatekeeper configs from localStorage', e);
  }
  safeStorage.setItem(STORAGE_KEY_GATEKEEPERS, JSON.stringify(INITIAL_GATEKEEPER_CONFIGS));
  return INITIAL_GATEKEEPER_CONFIGS;
}

export function saveStoredGatekeeperConfigs(
  configs: Record<GrievanceCategory, DepartmentGatekeeperConfig>
) {
  try {
    safeStorage.setItem(STORAGE_KEY_GATEKEEPERS, JSON.stringify(configs));
  } catch (e) {
    console.error('Failed to save gatekeeper configs', e);
  }
}

export function updateDepartmentGatekeeperConfig(
  category: GrievanceCategory,
  updatedConfig: Partial<DepartmentGatekeeperConfig>
): Record<GrievanceCategory, DepartmentGatekeeperConfig> {
  const current = getStoredGatekeeperConfigs();
  const target = current[category] || INITIAL_GATEKEEPER_CONFIGS[category];

  const merged: DepartmentGatekeeperConfig = {
    ...target,
    ...updatedConfig,
    updatedAt: new Date().toISOString(),
  };

  const updated = {
    ...current,
    [category]: merged,
  };

  saveStoredGatekeeperConfigs(updated);
  return updated;
}

export function resetGatekeeperConfigsToDefault(): Record<
  GrievanceCategory,
  DepartmentGatekeeperConfig
> {
  saveStoredGatekeeperConfigs(INITIAL_GATEKEEPER_CONFIGS);
  return INITIAL_GATEKEEPER_CONFIGS;
}

// Executive Members Storage & CRUD
export function getStoredExecutives(): ExecutiveMember[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEY_EXECUTIVES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load executives from localStorage', e);
  }
  safeStorage.setItem(STORAGE_KEY_EXECUTIVES, JSON.stringify(INITIAL_EXECUTIVES));
  return INITIAL_EXECUTIVES;
}

export function saveStoredExecutives(executives: ExecutiveMember[]) {
  try {
    safeStorage.setItem(STORAGE_KEY_EXECUTIVES, JSON.stringify(executives));
  } catch (e) {
    console.error('Failed to save executives', e);
  }
}

export function addExecutiveMember(
  newExec: Omit<ExecutiveMember, 'id' | 'updatedAt'>
): ExecutiveMember[] {
  const current = getStoredExecutives();
  const created: ExecutiveMember = {
    ...newExec,
    id: `exec-${Date.now()}`,
    updatedAt: new Date().toISOString(),
  };
  const updated = [created, ...current];
  saveStoredExecutives(updated);
  return updated;
}

export function updateExecutiveMember(
  id: string,
  updates: Partial<ExecutiveMember>
): ExecutiveMember[] {
  const current = getStoredExecutives();
  const updated = current.map((item) =>
    item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
  );
  saveStoredExecutives(updated);
  return updated;
}

export function deleteExecutiveMember(id: string): ExecutiveMember[] {
  const current = getStoredExecutives();
  const updated = current.filter((item) => item.id !== id);
  saveStoredExecutives(updated);
  return updated;
}

export function resetExecutivesToDefault(): ExecutiveMember[] {
  saveStoredExecutives(INITIAL_EXECUTIVES);
  return INITIAL_EXECUTIVES;
}

// HR Admin Members Storage & CRUD
export function getStoredHrAdmins(): HrAdminMember[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEY_HR_ADMINS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load HR admins from localStorage', e);
  }
  safeStorage.setItem(STORAGE_KEY_HR_ADMINS, JSON.stringify(INITIAL_HR_ADMINS));
  return INITIAL_HR_ADMINS;
}

export function saveStoredHrAdmins(admins: HrAdminMember[]) {
  try {
    safeStorage.setItem(STORAGE_KEY_HR_ADMINS, JSON.stringify(admins));
  } catch (e) {
    console.error('Failed to save HR admins', e);
  }
}

export function addHrAdminMember(
  newAdmin: Omit<HrAdminMember, 'id' | 'updatedAt'>
): HrAdminMember[] {
  const current = getStoredHrAdmins();
  const created: HrAdminMember = {
    ...newAdmin,
    id: `admin-${Date.now()}`,
    updatedAt: new Date().toISOString(),
  };
  const updated = [created, ...current];
  saveStoredHrAdmins(updated);
  return updated;
}

export function updateHrAdminMember(id: string, updates: Partial<HrAdminMember>): HrAdminMember[] {
  const current = getStoredHrAdmins();
  const updated = current.map((item) =>
    item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
  );
  saveStoredHrAdmins(updated);
  return updated;
}

export function deleteHrAdminMember(id: string): HrAdminMember[] {
  const current = getStoredHrAdmins();
  const updated = current.filter((item) => item.id !== id);
  saveStoredHrAdmins(updated);
  return updated;
}

export function resetHrAdminsToDefault(): HrAdminMember[] {
  saveStoredHrAdmins(INITIAL_HR_ADMINS);
  return INITIAL_HR_ADMINS;
}

export function getStoredTickets(): ComplaintTicket[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEY_TICKETS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load tickets from localStorage', e);
  }
  safeStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(INITIAL_COMPLAINTS));
  return INITIAL_COMPLAINTS;
}

export const getTickets = getStoredTickets;

export function getTicketByTrackingCode(trackingCode: string): ComplaintTicket | undefined {
  const tickets = getStoredTickets();
  return tickets.find((t) => t.trackingCode.toLowerCase() === trackingCode.trim().toLowerCase());
}

export function saveStoredTickets(tickets: ComplaintTicket[]) {
  try {
    safeStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
    // Asynchronously synchronize SQLite relational database in browser
    syncAllTicketsToSqlite(tickets).catch((err) => {
      console.warn('SQLite sync warning:', err);
    });
  } catch (e) {
    console.error('Failed to save tickets', e);
  }
}

export function getStoredNotifications(): NotificationItem[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEY_NOTIFS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load notifications from localStorage', e);
  }
  safeStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(INITIAL_NOTIFICATIONS));
  return INITIAL_NOTIFICATIONS;
}

export function saveStoredNotifications(notifs: NotificationItem[]) {
  try {
    safeStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifs));
  } catch (e) {
    console.error('Failed to save notifications', e);
  }
}

export const getNotifications = getStoredNotifications;

export function markNotificationAsRead(id: string): NotificationItem[] {
  const notifs = getStoredNotifications();
  const updated = notifs.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveStoredNotifications(updated);
  return updated;
}

export function markAllNotificationsAsRead(): NotificationItem[] {
  const notifs = getStoredNotifications();
  const updated = notifs.map((n) => ({ ...n, read: true }));
  saveStoredNotifications(updated);
  return updated;
}

// AI Smart Triage Assistant API Call
export async function analyzeGrievanceWithAI(params: {
  title: string;
  description: string;
  category?: string;
}) {
  try {
    const res = await fetch('/api/ai/analyze-complaint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('AI service error');
    return await res.json();
  } catch (err) {
    console.warn('AI offline or fallback mode', err);
    const cat = params.category || 'HR';
    const dept =
      CATEGORY_DEFINITIONS[cat as keyof typeof CATEGORY_DEFINITIONS]?.responsibleDept ||
      'People & Culture Department';
    return {
      suggestedCategory: cat,
      urgencyScore: 'Medium',
      sentiment: 'Concerned',
      riskLevel: 'Moderate',
      suggestedDepartment: dept,
      keyKeywords: ['Employee Relations', 'Standard Workflow'],
      summary: params.title || 'ข้อร้องเรียนจากพนักงาน',
      recommendedActions: [
        'รับเรื่องและส่งให้ Gatekeeper ประจำหน่วยงานตรวจสอบภายใน 24 ชม.',
        'ติดต่อสอบถามข้อเท็จจริงเพิ่มเติมจากพนักงาน (หากไม่ใช่เคสนิรนาม)',
        'จัดทำแผนแก้ไขและกำหนด SLA ชัดเจน',
      ],
      isDirectExecutiveWorthy: false,
    };
  }
}

// AI Executive Root Cause Clustering API Call
export async function getClusterInsightsWithAI(tickets: ComplaintTicket[]) {
  try {
    const res = await fetch('/api/ai/cluster-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaints: tickets }),
    });
    if (!res.ok) throw new Error('Cluster AI service error');
    return await res.json();
  } catch (err) {
    console.warn('AI Cluster Insights fallback', err);
    return {
      topRiskClusters: [
        {
          clusterName: 'IT Infrastructure & Network Latency',
          category: 'IT',
          count: 3,
          rootCause: 'Hardware อายุการใช้งานสูงและ Wi-Fi Load Balancing เกินพิกัดช่วงใช้งานหนาแน่น',
          preventiveAction: 'อัปเกรด Cisco Core AP เป็น Wi-Fi 6 และเพิ่มกระจายช่องสัญญาณ',
          severity: 'Medium',
        },
        {
          clusterName: 'Workplace Psychological Safety & Ethics',
          category: 'Harassment',
          count: 2,
          rootCause: 'ช่องว่างการสื่อสารของหัวหน้างานระดับกลางและขาดการอบรม Respectful Workplace',
          preventiveAction:
            'จัดหลักสูตร Mandatory Respectful Leadership และเปิดสายด่วนรับฟังความปลอดภัยทางใจ',
          severity: 'High',
        },
        {
          clusterName: 'Factory & Warehouse EHS Compliance',
          category: 'Safety',
          count: 2,
          rootCause:
            'ผู้รับเหมาภายนอกวางของกีดขวางจุดหนีไฟเนื่องจากพื้นที่พักของชั่วคราวไม่เพียงพอ',
          preventiveAction: 'ตีเส้น Safety Yellow Zone และสุ่มตรวจโดย EHS Officer ประจำกะ',
          severity: 'High',
        },
      ],
      executiveSummary:
        'ภาพรวมขององค์กรมีการตอบสนองต่อข้อร้องเรียนอยู่ในเกณฑ์ดี SLA Compliance อยู่ที่ 94.2% มีจุดที่ต้องเฝ้าระวังเรื่องการจัดซื้อและสภาพแวดล้อมความปลอดภัยในโกดังสินค้า',
      strategicRecommendations: [
        'เร่งการปฏิรูปเครื่องมือไอทีสำหรับ Hybrid Workplace',
        'เพิ่มมาตรการตรวจสอบความโปร่งใสของฝ่ายจัดซื้อด้วยระบบตรวจเช็คอัตโนมัติ',
        'ยกระดับโปรแกรมดูแลสุขภาพจิตและสวัสดิการแบบยืดหยุ่น (Flex-Benefits)',
      ],
    };
  }
}

// Create new ticket with auto-generated tracking code & notifications
export function submitTicket(
  payload: Omit<
    ComplaintTicket,
    | 'id'
    | 'trackingCode'
    | 'createdAt'
    | 'updatedAt'
    | 'timeline'
    | 'status'
    | 'slaDueDate'
    | 'slaStatus'
  >
): ComplaintTicket {
  const tickets = getStoredTickets();
  const notifs = getStoredNotifications();
  const year = new Date().getFullYear();
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const trackingCode = `TK-${year}-${randomCode}`;
  const now = new Date().toISOString();

  const newTicket: ComplaintTicket = {
    ...payload,
    id: `tk-${Date.now()}`,
    trackingCode,
    status: 'submitted',
    slaDueDate: new Date(Date.now() + payload.slaTargetHours * 60 * 60 * 1000).toISOString(),
    slaStatus: 'on_track',
    createdAt: now,
    updatedAt: now,
    timeline: [
      {
        id: `tl-${Date.now()}`,
        timestamp: now,
        actor: payload.submitterName || 'พนักงานผู้ยื่นเรื่อง',
        actorRole: 'Employee',
        action: payload.isDirectToExecutive
          ? 'ยื่นเรื่องส่งตรงถึงผู้บริหารระดับสูง (CEO/EVP Whistleblower Channel)'
          : 'ยื่นเรื่องเข้าระบบสำเร็จ',
        status: 'submitted',
        notes: payload.isDirectToExecutive
          ? 'ติดแท็กสำคัญพิเศษ: ส่งตรงถึงโต๊ะทำงานผู้บริหารระดับสูง'
          : 'ระบบได้รับเรื่องและเข้าสู่คิวคัดกรองของ Gatekeeper',
      },
    ],
  };

  const updatedTickets = [newTicket, ...tickets];
  saveStoredTickets(updatedTickets);

  // Send notifications
  const newNotifs: NotificationItem[] = [
    {
      id: `notif-${Date.now()}-1`,
      ticketId: newTicket.id,
      trackingCode: newTicket.trackingCode,
      title: `ยื่นเรื่องสำเร็จ: ${newTicket.title.substring(0, 40)}...`,
      message: `รหัสติดตามของคุณคือ ${newTicket.trackingCode} หน่วยงาน ${newTicket.gatekeeperDepartment} จะคัดกรองภายใน SLA ${newTicket.slaTargetHours} ชม.`,
      timestamp: now,
      read: false,
      type: 'new_ticket',
      recipientRole: 'employee',
      recipientEmail: newTicket.submitterEmail,
    },
  ];

  if (newTicket.isDirectToExecutive) {
    newNotifs.push({
      id: `notif-${Date.now()}-2`,
      ticketId: newTicket.id,
      trackingCode: newTicket.trackingCode,
      title: `[CEO/EVP Alert] ข้อร้องเรียนสำคัญส่งตรงถึงผู้บริหาร`,
      message: `เรื่อง: ${newTicket.title} (หมวดหมู่: ${newTicket.category}, ความเร่งด่วน: ${newTicket.urgency})`,
      timestamp: now,
      read: false,
      type: 'direct_ceo_alert',
      recipientRole: 'executive',
    });
  }

  const updatedNotifs = [...newNotifs, ...notifs];
  saveStoredNotifications(updatedNotifs);

  return newTicket;
}

// Update ticket status / Gatekeeper workflow
export function updateTicketWorkflow(
  ticketId: string,
  updates: {
    status?: TicketStatus;
    assignedOfficerName?: string;
    assignedOfficerEmail?: string;
    gatekeeperDepartment?: string;
    resolutionSummary?: string;
    actionNote?: string;
    actorName: string;
    actorRole: string;
    attachmentName?: string;
    rootCauseCategory?: ComplaintTicket['rootCauseCategory'];
    preventiveActionPlan?: string;
    clusterGroup?: string;
  }
): ComplaintTicket | null {
  const tickets = getStoredTickets();
  const notifs = getStoredNotifications();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return null;

  const current = tickets[index];
  const now = new Date().toISOString();
  const newStatus = updates.status || current.status;

  const newLog = {
    id: `tl-${Date.now()}`,
    timestamp: now,
    actor: updates.actorName,
    actorRole: updates.actorRole,
    action: getActionLabelForStatus(newStatus, updates.actionNote),
    status: newStatus,
    notes: updates.actionNote,
    attachmentName: updates.attachmentName,
  };

  const updatedTicket: ComplaintTicket = {
    ...current,
    ...updates,
    status: newStatus,
    updatedAt: now,
    resolvedAt: newStatus === 'resolved' ? now : current.resolvedAt,
    closedAt: newStatus === 'closed' ? now : current.closedAt,
    timeline: [...current.timeline, newLog],
  };

  tickets[index] = updatedTicket;
  saveStoredTickets(tickets);

  // Trigger automated notification for employee
  let notifType: NotificationItem['type'] = 'status_update';
  let notifTitle = `อัปเดตความคืบหน้า (${updatedTicket.trackingCode})`;
  let notifMsg = `เรื่องของคุณมีการเปลี่ยนสถานะเป็น "${getStatusBadgeText(newStatus)}" โดย ${updates.actorName}`;

  if (newStatus === 'resolved') {
    notifType = 'satisfaction_pending';
    notifTitle = `แก้ไขเสร็จสิ้น: รหัส ${updatedTicket.trackingCode}`;
    notifMsg = `หน่วยงานได้ดำเนินการแก้ไขปัญหาเรียบร้อยแล้ว กรุณาให้คะแนนประเมินความพึงพอใจเพื่อพัฒนาองค์กร`;
  }

  const notification: NotificationItem = {
    id: `notif-${Date.now()}`,
    ticketId: updatedTicket.id,
    trackingCode: updatedTicket.trackingCode,
    title: notifTitle,
    message: notifMsg,
    timestamp: now,
    read: false,
    type: notifType,
    recipientRole: 'employee',
    recipientEmail: updatedTicket.submitterEmail,
  };

  saveStoredNotifications([notification, ...notifs]);
  return updatedTicket;
}

// Submit CSAT Satisfaction Evaluation
export function submitEvaluation(
  ticketId: string,
  evaluationData: Omit<SatisfactionEvaluation, 'id' | 'ticketId' | 'evaluatedAt'>
): ComplaintTicket | null {
  const tickets = getStoredTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return null;

  const current = tickets[index];
  const now = new Date().toISOString();
  const evalObj: SatisfactionEvaluation = {
    ...evaluationData,
    id: `eval-${Date.now()}`,
    ticketId,
    evaluatedAt: now,
  };

  const newLog = {
    id: `tl-${Date.now()}`,
    timestamp: now,
    actor:
      current.confidentiality === 'anonymous'
        ? 'พนักงานผู้แจ้ง'
        : current.submitterName || 'พนักงาน',
    actorRole: 'Employee',
    action: `ประเมินความพึงพอใจ ${evaluationData.overallScore} ดาว และปิดเรื่อง (Closed)`,
    status: 'closed' as TicketStatus,
    notes: evaluationData.feedbackComment || 'ส่งผลประเมินความพึงพอใจเสร็จสิ้น',
  };

  const updatedTicket: ComplaintTicket = {
    ...current,
    status: 'closed',
    evaluation: evalObj,
    closedAt: now,
    updatedAt: now,
    timeline: [...current.timeline, newLog],
  };

  tickets[index] = updatedTicket;
  saveStoredTickets(tickets);
  return updatedTicket;
}

function getActionLabelForStatus(status: TicketStatus, note?: string) {
  switch (status) {
    case 'submitted':
      return 'ยื่นเรื่องเข้าระบบ';
    case 'gatekeeper_triaged':
      return 'Gatekeeper รับเรื่องและคัดกรองผู้รับผิดชอบ';
    case 'in_progress':
      return 'อยู่ระหว่างลงพื้นที่และดำเนินการแก้ไข';
    case 'resolved':
      return 'ดำเนินการแก้ไขแล้วเสร็จ พร้อมส่งมอบงาน';
    case 'closed':
      return 'ปิดเรื่องและประเมินผลความพึงพอใจ';
    default:
      return note || 'อัปเดตข้อมูล';
  }
}

export function getStatusBadgeText(status: TicketStatus) {
  switch (status) {
    case 'submitted':
      return 'ยื่นเรื่องแล้ว (Submitted)';
    case 'gatekeeper_triaged':
      return 'หน่วยงานรับเรื่อง (Triaged)';
    case 'in_progress':
      return 'กำลังแก้ไข (In Progress)';
    case 'resolved':
      return 'แก้ไขเสร็จสิ้น (Resolved)';
    case 'closed':
      return 'ปิดเรื่องสมบูรณ์ (Closed)';
  }
}

export function getStatusColor(status: TicketStatus) {
  switch (status) {
    case 'submitted':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'gatekeeper_triaged':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'in_progress':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'closed':
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}
