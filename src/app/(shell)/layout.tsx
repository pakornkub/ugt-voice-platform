import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserPermissions, isAdminInitialized } from '@/lib/get-user-permissions';
import { ssoLogoutAction } from '@/lib/actions/auth';
import { getRoleAccessConfigs } from '@/lib/actions/role-access';
import { getDepartmentGatekeeperConfigs } from '@/lib/actions/gatekeeper';
import { listVisibleNotifications, listVisibleTickets } from '@/lib/ticket-access';
import type { UserRole } from '@/types';
import Shell from './shell';

// Session-dependent data on every request (and some admin screens still read localStorage
// during render until the rewiring finishes) — never prerender.
export const dynamic = 'force-dynamic';

const APP_ROLES: UserRole[] = ['employee', 'gatekeeper', 'executive', 'admin'];

// ugt-nextjs-auth-setup (2026-09-02): session + first-admin gate for every
// route under this shell. Real access control replaces the old free
// role-switcher dropdown — see docs/project-context/decisions.md.
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  // First person ever to log in is sent to bootstrap the admin system —
  // otherwise they land in a blank, permission-less app with no clue where
  // to go (see ugt-nextjs-auth-setup skill §5.5).
  if (!(await isAdminInitialized())) redirect('/admin/setup');

  const [user, permissions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, appRole: true, userRole: { select: { name: true } } },
    }),
    getUserPermissions(session.user.id),
  ]);

  const appRole =
    user?.appRole && APP_ROLES.includes(user.appRole as UserRole)
      ? (user.appRole as UserRole)
      : null;

  // Not yet assigned an app-level role by an admin (SSO rows appear on first
  // login with no role — nothing to show until someone from /admin/users
  // assigns one). Renders outside <Shell> on purpose: allowedTabs has no
  // meaning for a null role, so there is nothing safe to show in Navbar/tabs.
  if (!appRole) {
    const canManageUsers = permissions.includes('users:update');
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center font-sans text-slate-900 antialiased">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm shadow-indigo-200">
          <span className="text-lg font-black">UGT</span>
        </div>
        <h1 className="text-lg font-bold text-slate-900">รอผู้ดูแลระบบกำหนดสิทธิ์การใช้งาน</h1>
        <p className="max-w-md text-sm text-slate-500">
          บัญชี <strong className="font-semibold text-slate-700">{user?.email}</strong>{' '}
          เข้าสู่ระบบสำเร็จแล้ว แต่ยังไม่ได้รับมอบหมายบทบาทการใช้งาน (พนักงาน / Gatekeeper /
          ผู้บริหาร / Admin) กรุณาติดต่อผู้ดูแลระบบเพื่อกำหนดสิทธิ์ให้จากหน้า
          &quot;จัดการผู้ใช้&quot;
        </p>
        <div className="flex items-center gap-2">
          {canManageUsers && (
            <Link
              href="/admin/users"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              ไปที่หน้าจัดการผู้ใช้
            </Link>
          )}
          <form action={ssoLogoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Everything the shell's pages read, scoped to this user on the server (lib/ticket-scope.ts).
  // Mutations call Server Actions and then router.refresh(), which re-runs this.
  const [rolePermissions, gatekeeperConfigs] = await Promise.all([
    getRoleAccessConfigs(),
    getDepartmentGatekeeperConfigs(),
  ]);
  const tickets = await listVisibleTickets({
    userId: session.user.id,
    email: user?.email ?? session.user.email,
    role: appRole,
    config: rolePermissions[appRole],
  });
  const notifications = await listVisibleNotifications(tickets.map((t) => t.id));

  return (
    <Shell
      data={{ tickets, notifications, rolePermissions, gatekeeperConfigs }}
      identity={{
        name: user?.name ?? session.user.name,
        email: user?.email ?? session.user.email,
        appRole,
        roleName: user?.userRole?.name ?? null,
        permissions,
      }}
    >
      {children}
    </Shell>
  );
}
