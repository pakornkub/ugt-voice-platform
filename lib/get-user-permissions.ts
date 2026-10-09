// lib/get-user-permissions.ts — ugt-nextjs-auth-setup, 2026-09-02.
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { resolveViewer } from '@/lib/ticket-access';
import type { AppTabId, UserRole } from '@/types';

/**
 * Permission keys for a user — one permission system (decisions.md 2026-10-09): the role comes
 * from the people rosters and what it may open from the RBAC matrix in the DB, both via
 * resolveViewer (lib/ticket-access.ts). See permissionsFor for the mapping. No user → no keys.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return [];
  const viewer = await resolveViewer({ user: { id: userId, email: user.email } });
  return viewer ? permissionsFor(viewer.role, viewer.config?.allowedTabs ?? []) : [];
}

/** Keys guarded by an RBAC tab — the matrix decides them, not the role. */
const TAB_KEYS: ReadonlyArray<[AppTabId, string]> = [
  ['admin_users', PERMISSIONS.USERS_READ],
  ['admin_audit_logs', PERMISSIONS.AUDIT_LOGS_READ],
];
const TAB_GUARDED = new Set<string>([...TAB_KEYS.map(([, key]) => key), PERMISSIONS.USERS_UPDATE]);

/**
 * Everyone may upload/download attachments (per-ticket scope is still enforced by
 * canReadAttachment); users / audit-log pages follow the RBAC tabs; admin also gets the remaining
 * system keys (dev mode, setup roles). USERS_UPDATE is never granted — /admin/users is read-only
 * since roles come from the rosters.
 */
export function permissionsFor(role: UserRole, allowedTabs: readonly AppTabId[]): string[] {
  const keys = new Set<string>([PERMISSIONS.FILES_CREATE, PERMISSIONS.FILES_READ]);
  for (const [tab, key] of TAB_KEYS) if (allowedTabs.includes(tab)) keys.add(key);
  if (role === 'admin') {
    for (const key of Object.values(PERMISSIONS)) if (!TAB_GUARDED.has(key)) keys.add(key);
  }
  return [...keys];
}

// จำผลบวกไว้ระดับ process — ระบบที่ bootstrap แล้วไม่ย้อนกลับเป็น "ยังไม่ตั้ง"
// (ยกเว้นล้าง DB ซึ่งมากับ restart อยู่แล้ว) จึงไม่ต้อง query ซ้ำทุก request
let adminInitialized = false;

/**
 * Check whether the admin system has been initialised (at least one system
 * role exists). Used by /admin/setup to redirect away when already set up,
 * and by the protected shell layout to send everyone to /admin/setup until
 * the first admin exists.
 */
export async function isAdminInitialized(): Promise<boolean> {
  if (adminInitialized) return true;
  const count = await prisma.role.count({ where: { isSystem: true } });
  adminInitialized = count > 0;
  return adminInitialized;
}
