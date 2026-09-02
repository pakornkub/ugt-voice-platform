'use server';

// lib/actions/admin-setup.ts — first-admin bootstrap Server Action
// (ugt-nextjs-auth-setup, 2026-09-02).
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { generateId } from 'better-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncPermissionsIfNeeded } from '@/lib/permissions-sync';
import { isAdminInitialized } from '@/lib/get-user-permissions';

type PermissionIdRow = { id: string };

/**
 * Initialise the admin system:
 * 1. Seed all permission rows
 * 2. Create the "Administrator" RBAC role with every permission
 * 3. Assign the current user to that role, AND set their app-level role
 *    (this app's own employee/gatekeeper/executive/admin used to gate the
 *    main tabs — see docs/project-context/decisions.md) to 'admin', so the
 *    very first person to log in lands in a fully-working app immediately
 *    instead of a second manual step
 *
 * Idempotent: returns an error if a system role already exists.
 */
export async function initializeAdminAction(): Promise<{
  code: string;
} | void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { code: 'UNAUTHORIZED' };

  const alreadyDone = await isAdminInitialized();
  if (alreadyDone) return { code: 'ALREADY_INITIALIZED' };

  // 1. Seed permissions — upsert เสมอ ห้าม createMany เปล่า: isAdminInitialized
  // เช็คแค่ role ระบบ ไม่ได้เช็คตาราง Permission — bootstrap รอบก่อนที่พังกลางคัน
  // จะทิ้งแถวไว้ แล้ว retry ชน unique key ค้างอยู่หน้า setup ตลอด
  await syncPermissionsIfNeeded();

  const permissions: PermissionIdRow[] = await prisma.permission.findMany({ select: { id: true } });

  const adminRole = await prisma.role.create({
    data: {
      id: generateId(24),
      name: 'Administrator',
      description: 'สิทธิ์เต็มระบบ (จัดการผู้ใช้ บทบาท และบันทึกการใช้งาน)',
      isSystem: true, // system roles cannot be deleted via the admin UI
      permissions: {
        create: permissions.map((p) => ({
          permission: { connect: { id: p.id } },
        })),
      },
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { roleId: adminRole.id, appRole: 'admin' },
  });

  redirect('/admin/users');
}
