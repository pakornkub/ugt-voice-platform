'use server';

// lib/actions/admin-users.ts — role assignment for /admin/users
// (ugt-nextjs-auth-setup, 2026-09-02).
//
// ไม่มีหน้าสมัครสมาชิก และจะไม่มี — บัญชีเกิดเองตอน login ผ่าน Keycloak ครั้งแรก
// เท่านั้น (SSO only ในโปรเจคนี้) กำหนดสิทธิ์ให้หลังจากนั้นจากหน้านี้
//
// บทบาทเดียวที่กำหนดได้คือ appRole (employee/gatekeeper/executive/admin) — สิทธิ์ทั้งหมดอิง
// role นี้ (lib/get-user-permissions.ts) และแท็บที่เห็นตั้งค่าในหน้า RBAC ต้นฉบับ (2026-10-09)
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

/**
 * Assign the app role (employee/gatekeeper/executive/admin) — the only role in the system since
 * 2026-10-09; it now also decides admin rights, so changing your own is refused to keep an admin
 * from locking themselves out. Guard order (org contract): session -> permission -> action -> audit.
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

  if (userId === session.user.id) {
    return { success: false, code: 'CANNOT_CHANGE_OWN_ROLE' };
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
