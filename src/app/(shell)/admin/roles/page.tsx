// app/(shell)/admin/roles/page.tsx — ugt-nextjs-auth-setup (2026-09-02).
// Server guard + fetch; interactivity lives in RolesManager.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { syncPermissionsIfNeeded } from '@/lib/permissions-sync';
import { RolesManager } from '@/components/RolesManager';

export default async function AdminRolesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  await syncPermissionsIfNeeded();
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.ROLES_READ)) redirect('/');

  const [roles, allPermissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        permissions: { select: { permissionId: true } },
      },
    }),
    prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { label: 'asc' }] }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <RolesManager
        roles={roles.map(({ permissions, ...r }) => ({
          ...r,
          permissionIds: permissions.map((p) => p.permissionId),
        }))}
        allPermissions={allPermissions}
        canCreate={perms.includes(PERMISSIONS.ROLES_CREATE)}
        canUpdate={perms.includes(PERMISSIONS.ROLES_UPDATE)}
        canDelete={perms.includes(PERMISSIONS.ROLES_DELETE)}
      />
    </div>
  );
}
