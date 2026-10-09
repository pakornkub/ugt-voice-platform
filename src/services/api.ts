import {
  ComplaintTicket,
  DepartmentGatekeeperConfig,
  ExecutiveMember,
  HrAdminMember,
  GrievanceCategory,
  NotificationItem,
  RolePermissionConfig,
  SatisfactionEvaluation,
  TabDefinition,
  TicketStatus,
  UserRole,
  UrgencyLevel,
  EmailNotificationSettings,
  EmailDispatchLog,
  RecentSearchItem,
  AnonymousChatMessage,
} from '../types';
import {
  INITIAL_COMPLAINTS,
  INITIAL_NOTIFICATIONS,
  CATEGORY_DEFINITIONS,
  INITIAL_GATEKEEPER_CONFIGS,
} from '../mockData';
import { syncAllTicketsToSqlite } from './sqliteDb';
import { analyzeWithClientHeuristics } from './categoryHeuristics';
import { safeStorage } from './safeStorage';
import { env } from '@/lib/env';
import {
  mapLoginEmailForTicket,
  getAllEmployees,
  getEmployeeById,
  getEmployeeByEmail,
  searchEmployees,
  getCurrentLoginEmployee,
  setCurrentLoginEmployee,
  EMPLOYEE_DATABASE,
} from './employeeDirectory';

// App is served under a basePath on ugtweb.ube.co.th (decisions.md 2026-10-09) —
// plain fetch('/api/...') and hand-built URLs don't get it added automatically.
const BASE_PATH = env.NEXT_PUBLIC_BASE_PATH;

// Collision-free local id. Upstream used `${Date.now()}-${random 0-999}`, which repeats when two
// items are created in the same millisecond — removing one recent search then removed both.
// crypto.randomUUID exists in every place this runs (HTTPS/localhost browsers, Node 22, jsdom).
const uniqueId = (prefix: string): string => `${prefix}-${globalThis.crypto.randomUUID()}`;

export {
  mapLoginEmailForTicket,
  getAllEmployees,
  getEmployeeById,
  getEmployeeByEmail,
  searchEmployees,
  getCurrentLoginEmployee,
  setCurrentLoginEmployee,
  EMPLOYEE_DATABASE,
};

const STORAGE_KEY_TICKETS = 'enterprise_grievance_tickets_v5';
const STORAGE_KEY_NOTIFS = 'enterprise_grievance_notifs_v3';
const STORAGE_KEY_GATEKEEPERS = 'enterprise_grievance_gatekeepers_v3';
const STORAGE_KEY_RBAC = 'enterprise_grievance_rbac_permissions_v3';
const STORAGE_KEY_ACTIVE_GK_DEPT = 'enterprise_grievance_active_gk_dept_v1';
const STORAGE_KEY_EXECUTIVES = 'enterprise_grievance_executives_v1';
const STORAGE_KEY_HR_ADMINS = 'enterprise_grievance_hr_admins_v1';
const STORAGE_KEY_EMAIL_SETTINGS = 'enterprise_grievance_email_settings_v1';
const STORAGE_KEY_EMAIL_LOGS = 'enterprise_grievance_email_logs_v1';
const STORAGE_KEY_RECENT_SEARCHES = 'enterprise_grievance_recent_searches_v1';

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
      'แดชบอร์ดสรุปผลเชิงวิเคราะห์ระดับผู้บริหาร (CEO/EVP) 6 หมวดหมู่, สาเหตุหลัก, CSAT และสายตรง',
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
      'Maintain รายชื่อคณะผู้บริหารระดับสูง (CEO/EVP Whistleblower Channel), ทีมงาน HR Admin และผู้รับผิดชอบ 6 ฝ่ายงาน',
    category: 'administration',
    iconName: 'Users',
    defaultRoles: ['admin'],
  },
  {
    id: 'rbac_management',
    nameTh: 'กำหนดสิทธิ์การเข้าถึง (RBAC)',
    nameEn: 'Role-Based Access Management',
    descriptionTh:
      'ศูนย์ควบคุมสิทธิ์ (HR Admin & ตัวแทนผู้บริหาร) กำหนดสิทธิ์การมองเห็นและขอบเขตหมวดหมู่คำร้องของแต่ละ Role',
    category: 'administration',
    iconName: 'SlidersHorizontal',
    defaultRoles: ['admin'],
  },
  {
    id: 'admin_users',
    nameTh: 'จัดการผู้ใช้ (SSO)',
    nameEn: 'User Management (SSO)',
    descriptionTh:
      'กำหนดบทบาทให้ผู้ใช้ที่เข้าสู่ระบบผ่าน SSO (พนักงาน / Gatekeeper / ผู้บริหาร / Admin)',
    category: 'administration',
    iconName: 'UserCog',
    defaultRoles: ['admin'],
  },
  {
    id: 'admin_audit_logs',
    nameTh: 'บันทึกการใช้งานระบบ',
    nameEn: 'System Audit Logs',
    descriptionTh: 'ประวัติการเข้าสู่ระบบและการเปลี่ยนแปลงสิทธิ์ของผู้ใช้ทั้งหมด',
    category: 'administration',
    iconName: 'ScrollText',
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
    canViewAnonymousSubmitterEmail: false,
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
    assignedDepartments: ['HR', 'Compliance', 'Ethics', 'Fraud', 'Harassment', 'Quality'],
    canViewDirectCeoTickets: false,
    canViewConfidentialIdentities: false,
    canViewAnonymousSubmitterEmail: false,
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
    canViewAnonymousSubmitterEmail: true,
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
};

// 2026-10-09: the SSO admin pages joined APP_TABS. Configs saved before that never listed them,
// so grant them to admin once (an admin may still untick them later in the RBAC matrix).
const SSO_ADMIN_TABS_MIGRATED_KEY = 'enterprise_grievance_sso_admin_tabs_v1';
function withSsoAdminTabs(
  config: Record<UserRole, RolePermissionConfig>
): Record<UserRole, RolePermissionConfig> {
  if (safeStorage.getItem(SSO_ADMIN_TABS_MIGRATED_KEY)) return config;
  const adminTabs = config.admin.allowedTabs;
  const missing = (['admin_users', 'admin_audit_logs'] as const).filter(
    (t) => !adminTabs.includes(t)
  );
  const next = { ...config, admin: { ...config.admin, allowedTabs: [...adminTabs, ...missing] } };
  safeStorage.setItem(STORAGE_KEY_RBAC, JSON.stringify(next));
  safeStorage.setItem(SSO_ADMIN_TABS_MIGRATED_KEY, '1');
  return next;
}

export function getStoredRolePermissions(): Record<UserRole, RolePermissionConfig> {
  try {
    const data = safeStorage.getItem(STORAGE_KEY_RBAC);
    if (data) {
      const parsed = JSON.parse(data);
      // Deep merge each role to ensure all permission flags are populated with defaults
      const merged: Record<UserRole, RolePermissionConfig> = { ...INITIAL_ROLE_PERMISSIONS };
      (Object.keys(INITIAL_ROLE_PERMISSIONS) as UserRole[]).forEach((roleKey) => {
        merged[roleKey] = {
          ...INITIAL_ROLE_PERMISSIONS[roleKey],
          ...(parsed[roleKey] || {}),
        };
      });
      return withSsoAdminTabs(merged);
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
  return 'HR';
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
      const parsed = JSON.parse(data);
      // Clean up legacy Environment if present
      if (parsed.Environment) {
        delete parsed.Environment;
      }
      // Ensure all current categories are populated
      const validCategories: GrievanceCategory[] = [
        'HR',
        'Compliance',
        'Ethics',
        'Fraud',
        'Harassment',
        'Quality',
      ];
      const result = {} as Record<GrievanceCategory, DepartmentGatekeeperConfig>;
      validCategories.forEach((cat) => {
        result[cat] = parsed[cat] || INITIAL_GATEKEEPER_CONFIGS[cat];
      });
      return result;
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

export const EVENT_EXECUTIVES_UPDATED = 'enterprise_executives_updated';

export function saveStoredExecutives(executives: ExecutiveMember[]) {
  try {
    safeStorage.setItem(STORAGE_KEY_EXECUTIVES, JSON.stringify(executives));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_EXECUTIVES_UPDATED, { detail: executives }));
    }
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
      const tickets: ComplaintTicket[] = JSON.parse(data);
      // Migrate legacy Environment category tickets if present
      let migrated = false;
      const sanitized = tickets.map((t) => {
        if ((t.category as string) === 'Environment') {
          migrated = true;
          return {
            ...t,
            category: 'Compliance' as GrievanceCategory,
            gatekeeperDepartment: 'Governance, Risk & Compliance Division',
          };
        }
        return t;
      });
      if (migrated) {
        safeStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(sanitized));
      }
      return sanitized;
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
export interface AICategorySuggestionResult {
  suggestedCategory: GrievanceCategory;
  confidence: number;
  reasoning: string;
  secondaryCategory?: GrievanceCategory;
  suggestedUrgency?: UrgencyLevel;
  keywords?: string[];
}

export async function suggestCategoryWithAI(params: {
  title: string;
  description: string;
}): Promise<AICategorySuggestionResult> {
  try {
    const res = await fetch(`${BASE_PATH}/api/ai/suggest-category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Category AI service error');
    return await res.json();
  } catch (err) {
    console.warn('suggestCategoryWithAI fallback', err);
    return analyzeWithClientHeuristics(params.title, params.description);
  }
}

export async function analyzeGrievanceWithAI(params: {
  title: string;
  description: string;
  category?: string;
}) {
  try {
    const res = await fetch(`${BASE_PATH}/api/ai/analyze-complaint`, {
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
        'รับเรื่องและส่งให้ Gatekeeper ประจำหน่วยงานตรวจสอบและประสานงานทันที',
        'ติดต่อสอบถามข้อเท็จจริงเพิ่มเติมจากพนักงาน (หากไม่ใช่เคสนิรนาม)',
        'จัดทำแผนแก้ไขและแนวทางป้องกันเชิงรุก',
      ],
      isDirectExecutiveWorthy: false,
    };
  }
}

// AI Executive Root Cause Clustering API Call
export async function getClusterInsightsWithAI(tickets: ComplaintTicket[]) {
  try {
    const res = await fetch(`${BASE_PATH}/api/ai/cluster-insights`, {
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
          clusterName: 'Quality Control & Operational Standards',
          category: 'Quality',
          count: 3,
          rootCause: 'ขั้นตอนการตรวจสอบคุณภาพปลายทางมีจุดคอขวดและขาดเกณฑ์ชี้วัดข้อบกพร่องที่ชัดเจน',
          preventiveAction: 'ปรับปรุง SOP Checklist การตรวจรับ และนำระบบ Digital Inspection มาใช้',
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
          clusterName: 'Regulatory Compliance & Document Policy',
          category: 'Compliance',
          count: 2,
          rootCause: 'การจัดเก็บและเปิดเผยเอกสารสัญญาคู่ค้ายังขาดแนวทางปฏิบัติตามมาตรฐาน PDPA',
          preventiveAction:
            'จัดทำ DPA Standard Template และจัดอบรมกระบวนการเปิดเผยข้อมูลส่วนบุคคลภายนอก',
          severity: 'High',
        },
      ],
      executiveSummary:
        'ภาพรวมขององค์กรมีการตอบสนองต่อข้อร้องเรียนอยู่ในเกณฑ์ดี มีอัตราการแก้ไขสำเร็จสูง มีจุดที่ต้องเฝ้าระวังเรื่องการจัดซื้อและมาตรฐานเอกสารสัญญา',
      strategicRecommendations: [
        'เร่งการปฏิรูปเครื่องมือตรวจสอบการดำเนินงานสำหรับ Hybrid Workplace',
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
    'id' | 'trackingCode' | 'createdAt' | 'updatedAt' | 'timeline' | 'status'
  >
): ComplaintTicket {
  const tickets = getStoredTickets();
  const notifs = getStoredNotifications();
  const year = new Date().getFullYear();
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const trackingCode = `TK-${year}-${randomCode}`;
  const now = new Date().toISOString();

  // Perform backend mapping from employee database
  const mapped = mapLoginEmailForTicket({
    submitterEmail: payload.submitterEmail,
    submitterEmployeeId: payload.submitterEmployeeId,
    loginEmail: payload.loginEmail,
    submitterName: payload.submitterName,
  });

  const isAnonymous = payload.confidentiality === 'anonymous';
  const finalLoginEmail = payload.loginEmail || mapped.loginEmail;

  const newTicket: ComplaintTicket = {
    ...payload,
    id: `tk-${Date.now()}`,
    trackingCode,
    status: 'submitted',
    loginEmail: finalLoginEmail,
    isAnonymousMapped: isAnonymous ? true : payload.isAnonymousMapped,
    submitterEmail: payload.submitterEmail || finalLoginEmail,
    createdAt: now,
    updatedAt: now,
    anonymousMessages: [],
    timeline: [
      {
        id: `tl-${Date.now()}`,
        timestamp: now,
        actor: isAnonymous
          ? 'พนักงานผู้ยื่นเรื่อง (ไม่ระบุตัวตน)'
          : payload.submitterName || 'พนักงานผู้ยื่นเรื่อง',
        actorRole: 'Employee',
        action: payload.isDirectToExecutive
          ? 'ยื่นเรื่องส่งตรงถึงผู้บริหารระดับสูง (CEO/EVP Whistleblower Channel)'
          : 'ยื่นเรื่องเข้าระบบสำเร็จ',
        status: 'submitted',
        notes: isAnonymous
          ? 'ยื่นเรื่องแบบไม่ระบุตัวตน (ระบบเชื่อมโยงอีเมลล็อกอินหลังบ้านจากฐานข้อมูลพนักงานเรียบร้อยแล้ว)'
          : payload.isDirectToExecutive
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
      message: `รหัสติดตามของคุณคือ ${newTicket.trackingCode} หน่วยงาน ${newTicket.gatekeeperDepartment} ได้รับเรื่องเข้าสู่ระบบเรียบร้อยแล้ว`,
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

  // Automated Email Notification to Gatekeeper (if enabled)
  try {
    dispatchEmailOnTicketSubmitted(newTicket);
  } catch (emailErr) {
    console.warn('Auto email dispatch error on ticket submit:', emailErr);
  }

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
    urgency?: UrgencyLevel;
    riskSeverity?: ComplaintTicket['riskSeverity'];
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

  // Automated Email Notification to Employee on Resolved (if enabled)
  if (newStatus === 'resolved') {
    try {
      dispatchEmailOnTicketResolved(
        updatedTicket,
        updates.resolutionSummary ||
          updates.actionNote ||
          'ดำเนินการตรวจสอบและแก้ไขปัญหาเรียบร้อยตามมาตรฐานการปฏิบัติงาน',
        updates.actorName || 'เจ้าหน้าที่ Gatekeeper'
      );
    } catch (emailErr) {
      console.warn('Auto email dispatch error on ticket resolve:', emailErr);
    }
  }

  return updatedTicket;
}

// Send anonymous 2-way chat message (Complainant <-> Gatekeeper/Executive)
export function sendAnonymousChatMessage(
  ticketId: string,
  messageText: string,
  senderRole: UserRole,
  senderDisplayName?: string
): ComplaintTicket | null {
  const tickets = getStoredTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return null;

  const current = tickets[index];
  const now = new Date().toISOString();
  const isStaff =
    senderRole === 'gatekeeper' || senderRole === 'executive' || senderRole === 'admin';

  let defaultName = '';
  if (senderRole === 'employee') {
    defaultName =
      current.confidentiality === 'anonymous' ||
      current.confidentiality === 'confidential_restricted'
        ? 'ผู้ยื่นเรื่อง (ไม่เปิดเผยตัวตน / Anonymous)'
        : current.submitterName || 'ผู้ยื่นเรื่อง (Employee)';
  } else if (senderRole === 'gatekeeper') {
    defaultName = current.assignedOfficerName
      ? `Gatekeeper (${current.assignedOfficerName})`
      : `Gatekeeper ประจำฝ่าย ${current.gatekeeperDepartment || current.category}`;
  } else if (senderRole === 'executive') {
    defaultName = 'คณะกรรมการตรวจสอบ / ผู้บริหารระดับสูง (Audit Committee)';
  } else {
    defaultName = 'เจ้าหน้าที่ผู้ดูแลระบบ (System Admin)';
  }

  const finalSenderName = senderDisplayName || defaultName;

  const newChatMsg: AnonymousChatMessage = {
    id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ticketId,
    senderRole,
    senderDisplayName: finalSenderName,
    message: messageText.trim(),
    timestamp: now,
    isStaff,
    isReadByEmployee: !isStaff,
    isReadByStaff: isStaff,
  };

  const timelineEntry = {
    id: `tl-chat-${Date.now()}`,
    timestamp: now,
    actor: finalSenderName,
    actorRole:
      senderRole === 'employee'
        ? 'Employee'
        : senderRole === 'executive'
          ? 'Executive'
          : 'Gatekeeper',
    action: isStaff
      ? 'เจ้าหน้าที่ส่งข้อความสอบถาม/ชี้แจงผ่านช่องทางนิรนาม'
      : 'ผู้ยื่นเรื่องตอบกลับผ่านช่องทางสื่อสารนิรนาม',
    status: current.status,
    notes: `[Anonymous Q&A] ${messageText.length > 80 ? messageText.substring(0, 80) + '...' : messageText}`,
  };

  const existingMsgs = current.anonymousMessages || [];
  const updatedTicket: ComplaintTicket = {
    ...current,
    updatedAt: now,
    anonymousMessages: [...existingMsgs, newChatMsg],
    timeline: [...current.timeline, timelineEntry],
  };

  tickets[index] = updatedTicket;
  saveStoredTickets(tickets);

  // Trigger Notification for the counterpart
  const notifs = getStoredNotifications();
  const notifItem: NotificationItem = {
    id: `notif-chat-${Date.now()}`,
    ticketId: current.id,
    trackingCode: current.trackingCode,
    title: isStaff
      ? `[ข้อความใหม่จากเจ้าหน้าที่] ${current.trackingCode}`
      : `[ข้อความใหม่จากผู้ร้องเรียน] ${current.trackingCode}`,
    message: `${finalSenderName}: ${messageText.substring(0, 75)}${messageText.length > 75 ? '...' : ''}`,
    timestamp: now,
    read: false,
    type: 'status_update',
    recipientRole: isStaff ? 'employee' : 'gatekeeper',
    recipientEmail: isStaff ? current.submitterEmail : undefined,
  };
  saveStoredNotifications([notifItem, ...notifs]);

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

export function getStatusBadgeText(status: TicketStatus, lang: 'th' | 'en' = 'th') {
  if (lang === 'en') {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'gatekeeper_triaged':
        return 'Triaged';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
    }
  }
  switch (status) {
    case 'submitted':
      return 'ยื่นเรื่องแล้ว (Submitted)';
    case 'gatekeeper_triaged':
      return 'รับเรื่องแล้ว (Triaged)';
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

export function getUrgencyBadgeText(urgency: UrgencyLevel, lang: 'th' | 'en' = 'th') {
  if (lang === 'en') {
    switch (urgency) {
      case 'Low':
        return '🟢 Low';
      case 'Medium':
        return '🟡 Medium';
      case 'High':
        return '🔴 High';
      case 'Critical':
        return '🔥 Critical';
    }
  }
  switch (urgency) {
    case 'Low':
      return '🟢 ปกติ / ทั่วไป (Low)';
    case 'Medium':
      return '🟡 ปานกลาง (Medium)';
    case 'High':
      return '🔴 เร่งด่วน (High)';
    case 'Critical':
      return '🔥 วิกฤติ / ฉุกเฉิน (Critical)';
  }
}

export function getUrgencyColor(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'Low':
      return 'bg-slate-50 text-slate-700 border-slate-200';
    case 'Medium':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'High':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'Critical':
      return 'bg-red-100 text-red-900 border-red-300 font-bold';
  }
}

export function getRiskSeverityBadgeText(
  risk: ComplaintTicket['riskSeverity'],
  lang: 'th' | 'en' = 'th'
) {
  if (lang === 'en') {
    switch (risk) {
      case 'Low':
        return 'Low Risk';
      case 'Moderate':
        return 'Moderate Risk';
      case 'High':
        return 'High Risk';
      case 'Severe':
        return 'Severe Risk';
    }
  }
  switch (risk) {
    case 'Low':
      return 'เสี่ยงต่ำ (Low)';
    case 'Moderate':
      return 'เสี่ยงปานกลาง (Moderate)';
    case 'High':
      return 'เสี่ยงสูง (High)';
    case 'Severe':
      return 'วิกฤติรุนแรง (Severe)';
  }
}

export function getRiskSeverityColor(risk: ComplaintTicket['riskSeverity']) {
  switch (risk) {
    case 'Low':
      return 'bg-slate-50 text-slate-600 border-slate-200';
    case 'Moderate':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'High':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'Severe':
      return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
  }
}

// =========================================================================
// EMAIL NOTIFICATION SYSTEM (Admin Settings, Dynamic Templates & Dispatch)
// =========================================================================

export const DEFAULT_EMAIL_SETTINGS: EmailNotificationSettings = {
  masterEnabled: true,
  onTicketSubmitted: {
    enabled: true,
    subject:
      '[VoicePlatform แจ้งเรื่องใหม่] {ticketId}: มีข้อร้องเรียนใหม่ ({categoryTh}) - {urgency}',
    body: `เรียน ทีมงาน Gatekeeper ประจำฝ่าย {categoryTh},

ระบบ VoicePlatform ขอแจ้งเตือนว่ามีผู้ยื่นเรื่องข้อร้องเรียน/ข้อเสนอแนะใหม่เข้าระบบ โดยมีรายละเอียดดังนี้:

- รหัสติดตาม (Tracking ID): {ticketId}
- หมวดหมู่ (Category): {categoryTh} ({category})
- หัวข้อเรื่อง (Title): {title}
- ระดับความเร่งด่วน (Urgency): {urgency}
- ผู้ยื่นเรื่อง (Submitter): {senderName} ({senderDept})
- วันที่และเวลาที่ยื่น (Submitted At): {submissionDate}

รายละเอียดข้อร้องเรียน:
"{description}"

กรุณาเข้าสู่ระบบเพื่อดำเนินการคัดกรอง (Triage), ตรวจสอบความถูกต้อง, มอบหมายเจ้าหน้าที่ผู้รับผิดชอบ และประสานงานแก้ไขปัญหาตามระเบียบนโยบายขององค์กรต่อไป

เข้าสู่ระบบจัดการเคส: {trackingUrl}

ขอแสดงความนับถือ,
ระบบรับเรื่องร้องเรียนและข้อเสนอแนะองค์กร VoicePlatform`,
  },
  onTicketResolved: {
    enabled: true,
    subject:
      '[VoicePlatform แจ้งผลการแก้ไข] เรื่อง {ticketId}: ดำเนินการแก้ไขเสร็จสิ้นเรียบร้อยแล้ว',
    body: `เรียน คุณ {recipientName},

ระบบ VoicePlatform ขอแจ้งให้ท่านทราบว่า ข้อร้องเรียน/ข้อเสนอแนะของท่านได้รับการตรวจสอบและดำเนินการแก้ไขเสร็จสิ้นเรียบร้อยแล้ว

ข้อมูลสรุปการดำเนินงาน:
- รหัสติดตาม (Tracking ID): {ticketId}
- หัวข้อเรื่อง (Title): {title}
- หมวดหมู่ (Category): {categoryTh}
- ผู้ดำเนินการปิดเคส: {resolvedBy}
- วันที่ดำเนินการเสร็จสิ้น: {resolvedDate}

สรุปผลการแก้ไขและการดำเนินงาน:
"{resolutionNotes}"

ท่านสามารถเข้าสู่ระบบเพื่อตรวจสอบรายละเอียดการดำเนินงานย้อนหลัง (Audit Timeline) และโปรดร่วมสละเวลา 1 นาทีในการทำแบบประเมินความพึงพอใจ (CSAT Rating) เพื่อเป็นข้อมูลในการปรับปรุงมาตรฐานการบริการขององค์กรต่อไป

ตรวจสอบผลการแก้ไขและทำแบบประเมิน: {trackingUrl}

ขอแสดงความนับถือ,
ทีมงาน VoicePlatform & แผนก {categoryTh}`,
  },
  updatedAt: new Date().toISOString(),
};

export function getStoredEmailNotificationSettings(): EmailNotificationSettings {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY_EMAIL_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_EMAIL_SETTINGS,
        ...parsed,
        onTicketSubmitted: {
          ...DEFAULT_EMAIL_SETTINGS.onTicketSubmitted,
          ...(parsed.onTicketSubmitted || {}),
        },
        onTicketResolved: {
          ...DEFAULT_EMAIL_SETTINGS.onTicketResolved,
          ...(parsed.onTicketResolved || {}),
        },
      };
    }
  } catch (err) {
    console.error('Failed to parse email notification settings', err);
  }
  return DEFAULT_EMAIL_SETTINGS;
}

export function saveStoredEmailNotificationSettings(settings: EmailNotificationSettings) {
  try {
    safeStorage.setItem(STORAGE_KEY_EMAIL_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save email notification settings', err);
  }
}

export function updateEmailNotificationSettings(
  settings: Partial<EmailNotificationSettings>
): EmailNotificationSettings {
  const current = getStoredEmailNotificationSettings();
  const updated: EmailNotificationSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  saveStoredEmailNotificationSettings(updated);
  return updated;
}

export function resetEmailNotificationSettings(): EmailNotificationSettings {
  const reset = {
    ...DEFAULT_EMAIL_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
  saveStoredEmailNotificationSettings(reset);
  return reset;
}

export function getStoredEmailDispatchLogs(): EmailDispatchLog[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY_EMAIL_LOGS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse email dispatch logs', err);
  }
  return [];
}

export function addEmailDispatchLog(log: EmailDispatchLog) {
  try {
    const current = getStoredEmailDispatchLogs();
    const updated = [log, ...current].slice(0, 100);
    safeStorage.setItem(STORAGE_KEY_EMAIL_LOGS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to store email dispatch log', err);
  }
}

export function clearEmailDispatchLogs() {
  try {
    safeStorage.removeItem(STORAGE_KEY_EMAIL_LOGS);
  } catch (err) {
    console.error('Failed to clear email dispatch logs', err);
  }
}

export function interpolateEmailTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    // split/join, not String.replace — a "$&" in user text must not act as a pattern
    result = result.split(`{${key}}`).join(val ?? '-');
  }
  return result;
}

export function dispatchEmailOnTicketSubmitted(ticket: ComplaintTicket): EmailDispatchLog | null {
  const settings = getStoredEmailNotificationSettings();
  const catConfig = CATEGORY_DEFINITIONS[ticket.category];
  const gkConfigs = getStoredGatekeeperConfigs();
  const targetGk = gkConfigs[ticket.category];

  const recipientEmail =
    targetGk?.leadOfficer?.email ||
    targetGk?.escalationEmail ||
    `${ticket.category.toLowerCase()}-gatekeeper@enterprise.co.th`;
  const recipientName =
    targetGk?.leadOfficer?.name || `Gatekeeper ประจำฝ่าย ${catConfig?.nameTh || ticket.category}`;

  const vars: Record<string, string> = {
    ticketId: ticket.trackingCode || ticket.id,
    title: ticket.title || '-',
    category: ticket.category,
    categoryTh: catConfig?.nameTh || ticket.category,
    senderName:
      ticket.confidentiality === 'anonymous'
        ? 'ผู้ยื่นเรื่องนิรนาม (Anonymous)'
        : ticket.submitterName || 'พนักงานผู้ยื่นเรื่อง',
    senderDept:
      ticket.confidentiality === 'anonymous'
        ? 'ไม่เปิดเผยสังกัด'
        : ticket.submitterDepartment || 'ทั่วไป',
    senderEmail: ticket.submitterEmail || '-',
    recipientName,
    urgency: ticket.urgency,
    description: ticket.description || '-',
    submissionDate: new Date(ticket.createdAt).toLocaleString('th-TH'),
    trackingUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}${BASE_PATH}/#tracking=${ticket.trackingCode}`,
  };

  const isEnabled = settings.masterEnabled && settings.onTicketSubmitted.enabled;
  const subject = interpolateEmailTemplate(settings.onTicketSubmitted.subject, vars);
  const body = interpolateEmailTemplate(settings.onTicketSubmitted.body, vars);

  const log: EmailDispatchLog = {
    id: uniqueId('elog'),
    timestamp: new Date().toISOString(),
    trigger: 'ticket_submitted',
    ticketId: ticket.id,
    trackingCode: ticket.trackingCode,
    recipientEmail,
    recipientName,
    recipientRole: 'gatekeeper',
    subject,
    body,
    status: isEnabled ? 'sent' : 'disabled',
    deliveryChannel: 'SMTP / Enterprise Mail Gateway (Simulated)',
  };

  addEmailDispatchLog(log);
  return log;
}

export function dispatchEmailOnTicketResolved(
  ticket: ComplaintTicket,
  resolutionNotes: string,
  resolvedBy: string
): EmailDispatchLog | null {
  const settings = getStoredEmailNotificationSettings();
  const catConfig = CATEGORY_DEFINITIONS[ticket.category];

  const recipientEmail =
    ticket.submitterEmail ||
    (ticket.confidentiality === 'anonymous'
      ? 'anonymous-submitter@voiceplatform.internal'
      : 'employee@enterprise.co.th');
  const recipientName =
    ticket.confidentiality === 'anonymous'
      ? 'ผู้ยื่นเรื่อง (Anonymous Submitter)'
      : ticket.submitterName || 'พนักงานผู้ยื่นเรื่อง';

  const vars: Record<string, string> = {
    ticketId: ticket.trackingCode || ticket.id,
    title: ticket.title || '-',
    category: ticket.category,
    categoryTh: catConfig?.nameTh || ticket.category,
    recipientName,
    resolvedBy: resolvedBy || 'เจ้าหน้าที่ผู้รับผิดชอบ',
    resolvedDate: new Date().toLocaleString('th-TH'),
    resolutionNotes: resolutionNotes || 'ดำเนินการแก้ไขและปรับปรุงตามขั้นตอนเรียบร้อยแล้ว',
    trackingUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}${BASE_PATH}/#tracking=${ticket.trackingCode}`,
  };

  const isEnabled = settings.masterEnabled && settings.onTicketResolved.enabled;
  const subject = interpolateEmailTemplate(settings.onTicketResolved.subject, vars);
  const body = interpolateEmailTemplate(settings.onTicketResolved.body, vars);

  const log: EmailDispatchLog = {
    id: uniqueId('elog'),
    timestamp: new Date().toISOString(),
    trigger: 'ticket_resolved',
    ticketId: ticket.id,
    trackingCode: ticket.trackingCode,
    recipientEmail,
    recipientName,
    recipientRole: 'employee',
    subject,
    body,
    status: isEnabled ? 'sent' : 'disabled',
    deliveryChannel: 'SMTP / Enterprise Mail Gateway (Simulated)',
  };

  addEmailDispatchLog(log);
  return log;
}

export function sendTestEmailNotification(
  triggerType: 'ticket_submitted' | 'ticket_resolved',
  targetEmail?: string
): EmailDispatchLog {
  const settings = getStoredEmailNotificationSettings();
  const testVars: Record<string, string> = {
    ticketId: 'TK-2026-TEST',
    title: 'ตัวอย่าง: ติดขัดขั้นตอนการส่งเอกสารและระบบเบิกจ่าย',
    category: 'HR',
    categoryTh: 'ทรัพยากรบุคคลและแรงงานสัมพันธ์',
    senderName: 'สมศักดิ์ มั่นคง',
    senderDept: 'ฝ่ายปฏิบัติการคลังสินค้า',
    senderEmail: 'somsak.m@enterprise.co.th',
    recipientName:
      triggerType === 'ticket_submitted'
        ? 'คุณวิภาวรรณ สดใส (Lead Gatekeeper)'
        : 'สมศักดิ์ มั่นคง (พนักงาน)',
    urgency: 'Urgent',
    description:
      'ทดสอบส่งข้อความแจ้งเตือนทางระบบอีเมลอัตโนมัติ เพื่อตรวจสอบความถูกต้องของ Subject และ Body Template',
    submissionDate: new Date().toLocaleString('th-TH'),
    resolvedBy: 'คุณนพดล เกียรติสกุล (HR Gatekeeper)',
    resolvedDate: new Date().toLocaleString('th-TH'),
    resolutionNotes:
      'ได้ปรับปรุงแบบฟอร์มเบิกจ่ายออนไลน์และเพิ่มช่องทางยืนยันเอกสารผ่านระบบอัตโนมัติแล้ว',
    trackingUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}${BASE_PATH}/#tracking=TK-2026-TEST`,
  };

  const template =
    triggerType === 'ticket_submitted' ? settings.onTicketSubmitted : settings.onTicketResolved;
  const subject = interpolateEmailTemplate(template.subject, testVars);
  const body = interpolateEmailTemplate(template.body, testVars);

  const log: EmailDispatchLog = {
    id: uniqueId('elog'),
    timestamp: new Date().toISOString(),
    trigger: 'test_dispatch',
    ticketId: 'TK-2026-TEST',
    trackingCode: 'TK-2026-TEST',
    recipientEmail:
      targetEmail ||
      (triggerType === 'ticket_submitted'
        ? 'hr-gatekeeper@enterprise.co.th'
        : 'employee.test@enterprise.co.th'),
    recipientName: testVars.recipientName,
    recipientRole: 'test',
    subject: `[TEST SIMULATION] ${subject}`,
    body,
    status: 'sent',
    deliveryChannel: 'SMTP / Enterprise Mail Gateway (Simulated)',
  };

  addEmailDispatchLog(log);
  return log;
}

// ============================================================================
// RECENT TRACKING SEARCHES MANAGEMENT
// ============================================================================

export function getRecentSearches(): RecentSearchItem[] {
  if (typeof window === 'undefined') return [];
  const stored = safeStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse recent searches:', e);
    return [];
  }
}

export function saveRecentSearches(items: RecentSearchItem[]): void {
  if (typeof window === 'undefined') return;
  safeStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(items));
}

export function addRecentSearch(query: string, ticket?: ComplaintTicket | null): RecentSearchItem {
  const current = getRecentSearches();
  const trimmed = query.trim();

  // Remove existing entry with the same query or tracking code to prevent duplicate clutter
  const filtered = current.filter(
    (item) =>
      item.query.toLowerCase() !== trimmed.toLowerCase() &&
      (!ticket || item.trackingCode?.toLowerCase() !== ticket.trackingCode.toLowerCase())
  );

  const newItem: RecentSearchItem = {
    id: uniqueId('search'),
    query: trimmed,
    timestamp: new Date().toISOString(),
    ticketId: ticket?.id,
    trackingCode:
      ticket?.trackingCode ||
      (trimmed.toUpperCase().startsWith('TK-') ? trimmed.toUpperCase() : undefined),
    title: ticket?.title,
    category: ticket?.category,
    urgency: ticket?.urgency,
    status: ticket?.status,
    found: !!ticket,
    submitterName: ticket?.submitterName,
  };

  // Keep up to 30 recent searches
  const updated = [newItem, ...filtered].slice(0, 30);
  saveRecentSearches(updated);
  return newItem;
}

export function removeRecentSearch(id: string): RecentSearchItem[] {
  const current = getRecentSearches();
  const updated = current.filter((item) => item.id !== id);
  saveRecentSearches(updated);
  return updated;
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  safeStorage.removeItem(STORAGE_KEY_RECENT_SEARCHES);
}
