// lib/get-user-permissions.ts — ugt-nextjs-auth-setup, 2026-09-02.
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';

/**
 * Permission keys for a user, derived from their app role (`user.appRole`, the upstream
 * employee / gatekeeper / executive / admin roles) — 2026-10-09: the separate Role/Permission
 * admin UI was retired in favour of the upstream RBAC page (decisions.md). Admin gets every key;
 * the other roles may upload/download attachments (per-ticket scope is still enforced by
 * canReadAttachment). No app role → no keys (deny by default).
 * ponytail: role → keys is fixed here; read RoleAccessConfigs from the DB once the
 * localStorage → Server Action rewiring lands, so the RBAC matrix also drives server checks.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { appRole: true } });
  return permissionsForAppRole(user?.appRole ?? null);
}

export function permissionsForAppRole(appRole: string | null): string[] {
  if (appRole === 'admin') return Object.values(PERMISSIONS);
  if (appRole === 'employee' || appRole === 'gatekeeper' || appRole === 'executive') {
    return [PERMISSIONS.FILES_CREATE, PERMISSIONS.FILES_READ];
  }
  return [];
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
