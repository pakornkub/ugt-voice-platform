// lib/get-user-permissions.ts — ugt-nextjs-auth-setup, 2026-09-02.
import { prisma } from '@/lib/prisma';

/**
 * Load all permission keys for a user from their assigned RBAC role.
 * Returns an empty array if the user has no role.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userRole: {
        select: {
          permissions: {
            select: {
              permission: { select: { key: true } },
            },
          },
        },
      },
    },
  });

  return user?.userRole?.permissions.map((rp) => rp.permission.key) ?? [];
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
