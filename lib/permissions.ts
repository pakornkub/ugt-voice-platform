/**
 * Permission keys — single source of truth for all RBAC permission constants
 * (ugt-nextjs-auth-setup, 2026-09-02). Naming: resource:action.
 *
 * This governs the NEW admin section (/admin/users, /admin/roles,
 * /admin/audit-logs) only — it is a separate system from this app's own
 * `UserRole` (employee/gatekeeper/executive/admin) tab-visibility model in
 * `RoleAccessConfigs`/`Navbar`, which is unchanged by this chunk. See
 * docs/project-context/decisions.md for why the two are kept separate.
 *
 * Trimmed from the skill's default set: no users:create / users:reset-password
 * (no local account creation in an SSO-only install — those keys would be
 * checkboxes with no consumer, which rbac.md's own pitfall list warns against).
 */
export const PERMISSIONS = {
  // User management
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',

  // Role management
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',

  // Audit logs
  AUDIT_LOGS_READ: 'audit-logs:read',

  // EXTENSION POINT: add project-domain permissions here (resource:action)
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * All permission definitions used to seed the database. group = domain/module
 * the permission belongs to (used to group the checklist on /admin/roles).
 */
export const ALL_PERMISSIONS: Array<{
  key: PermissionKey;
  label: string;
  group: string;
}> = [
  { key: PERMISSIONS.USERS_READ, label: 'ดูรายชื่อผู้ใช้', group: 'users' },
  { key: PERMISSIONS.USERS_UPDATE, label: 'แก้ไขบทบาทผู้ใช้', group: 'users' },

  { key: PERMISSIONS.ROLES_READ, label: 'ดูบทบาทและสิทธิ์', group: 'roles' },
  { key: PERMISSIONS.ROLES_CREATE, label: 'สร้างบทบาทใหม่', group: 'roles' },
  { key: PERMISSIONS.ROLES_UPDATE, label: 'แก้ไขบทบาท', group: 'roles' },
  { key: PERMISSIONS.ROLES_DELETE, label: 'ลบบทบาท', group: 'roles' },

  { key: PERMISSIONS.AUDIT_LOGS_READ, label: 'ดูบันทึกการใช้งาน', group: 'audit-logs' },

  // EXTENSION POINT: add seed entries for project-domain permissions here
];

/** Check whether a user holds a specific permission. */
export function hasPermission(userPermissions: string[], key: PermissionKey): boolean {
  return userPermissions.includes(key);
}
