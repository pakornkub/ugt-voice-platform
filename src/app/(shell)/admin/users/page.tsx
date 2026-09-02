// app/(shell)/admin/users/page.tsx — ugt-nextjs-auth-setup (2026-09-02).
// Server guard + fetch; interactivity lives in UsersTable.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { syncPermissionsIfNeeded } from '@/lib/permissions-sync';
import { UsersTable } from '@/components/UsersTable';

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  await syncPermissionsIfNeeded();
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_READ)) redirect('/');
  const canUpdate = perms.includes(PERMISSIONS.USERS_UPDATE);

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        authType: true,
        appRole: true,
        roleId: true,
        userRole: { select: { name: true } },
      },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">จัดการผู้ใช้ (Users)</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          รายชื่อผู้ใช้ที่เคยเข้าสู่ระบบผ่าน SSO —
          กำหนดบทบาทการใช้งานและสิทธิ์ผู้ดูแลระบบได้จากหน้านี้ (ไม่มีหน้าสมัครสมาชิก —
          บัญชีจะปรากฏเองเมื่อเข้าสู่ระบบครั้งแรก)
        </p>
      </div>
      <UsersTable
        users={users.map((u) => ({ ...u, roleName: u.userRole?.name ?? null }))}
        roles={roles}
        currentUserId={session.user.id}
        canUpdate={canUpdate}
      />
    </div>
  );
}
