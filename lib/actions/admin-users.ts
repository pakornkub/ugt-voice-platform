'use server';

// lib/actions/admin-users.ts — role assignment for /admin/users
// (ugt-nextjs-auth-setup, 2026-09-02).
//
// ไม่มีหน้าสมัครสมาชิก และจะไม่มี — บัญชีเกิดเองตอน login ผ่าน Keycloak ครั้งแรก
// เท่านั้น (SSO only ในโปรเจคนี้) กำหนดสิทธิ์ให้หลังจากนั้นจากหน้านี้
//
// สองแอ็กชันคุมคนละระบบ (ดู docs/project-context/decisions.md):
//   assignUserRoleAction     → RBAC role ใหม่ (ผูกกับ resource:action permission
//                              ของ /admin/* — Role/Permission/RolePermission)
//   assignUserAppRoleAction  → UserRole เดิมของแอป (employee/gatekeeper/
//                              executive/admin — คุมการมองเห็นแท็บหลักผ่าน
//                              RoleAccessConfigs/Navbar เหมือนเดิมทุกประการ)
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import type { UserRole } from '@/types';

type ActionResult = { success: true } | { success: false; code: string };

const APP_ROLES: UserRole[] = ['employee', 'gatekeeper', 'executive', 'admin'];

/** Server Action guard pattern (org contract): session -> permission -> action -> audit log. */
export async function assignUserRoleAction(
  userId: string,
  roleId: string | null
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, code: 'UNAUTHORIZED' };

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_UPDATE)) {
    return { success: false, code: 'FORBIDDEN' };
  }

  // เปลี่ยนบทบาทของตัวเองห้าม — กันแอดมินล็อกตัวเองออกโดยไม่มีใครแก้คืน
  if (userId === session.user.id) {
    return { success: false, code: 'CANNOT_CHANGE_OWN_ROLE' };
  }
  await prisma.user.update({ where: { id: userId }, data: { roleId } });

  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: AUDIT_ACTIONS.USERS_ROLE_ASSIGN,
        detail: JSON.stringify({ targetId: userId, roleId }),
      },
    })
    .catch(() => {});

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Assign this app's own UserRole (employee/gatekeeper/executive/admin) —
 * this is what used to be the free role-switcher dropdown in Navbar; it now
 * comes only from here. No "cannot change own" restriction: unlike the RBAC
 * role above, this never grants admin-section permissions, so there is no
 * self-lockout risk in letting an admin also set their own tab visibility.
 */
export async function assignUserAppRoleAction(
  userId: string,
  appRole: UserRole | null
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, code: 'UNAUTHORIZED' };

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_UPDATE)) {
    return { success: false, code: 'FORBIDDEN' };
  }

  if (appRole !== null && !APP_ROLES.includes(appRole)) {
    return { success: false, code: 'INVALID_INPUT' };
  }

  await prisma.user.update({ where: { id: userId }, data: { appRole } });

  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: AUDIT_ACTIONS.USERS_APP_ROLE_ASSIGN,
        detail: JSON.stringify({ targetId: userId, appRole }),
      },
    })
    .catch(() => {});

  revalidatePath('/admin/users');
  return { success: true };
}
