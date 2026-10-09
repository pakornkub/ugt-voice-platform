// app/(shell)/admin/users/page.tsx — ugt-nextjs-auth-setup (2026-09-02); read-only since
// 2026-10-09 (decisions.md "App role comes from the people rosters"): roles are granted on the
// Gatekeeper-management page rosters, this page only shows who has which role and why.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { rosterRolesByEmail } from '@/lib/roster-role';
import { UsersTable } from '@/components/UsersTable';

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_READ)) redirect('/');

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, authType: true },
  });
  const roles = await rosterRolesByEmail(users.map((u) => u.email));
  const rows = users.map((u) => {
    const membership = roles.get(u.email.trim().toLowerCase());
    return {
      ...u,
      role: membership?.role ?? 'employee',
      source: membership?.source ?? null,
      officerCategories: membership?.officerCategories ?? [],
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">จัดการผู้ใช้ (Users)</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          รายชื่อผู้ใช้ที่เคยเข้าสู่ระบบผ่าน SSO และบทบาทที่ได้รับ — บทบาทมาจากรายชื่อในหน้า
          &quot;จัดการผู้บริหาร &amp; Gatekeeper&quot; (HR Admin / ผู้บริหาร / Gatekeeper)
          ใครไม่อยู่ในรายชื่อใดเป็นพนักงานทั่วไป ส่วนแท็บที่แต่ละบทบาทเห็นตั้งค่าในหน้า RBAC
        </p>
      </div>
      <UsersTable users={rows} currentUserId={session.user.id} />
    </div>
  );
}
