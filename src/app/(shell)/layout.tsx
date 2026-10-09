import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { isAdminInitialized, permissionsFor } from '@/lib/get-user-permissions';
import { ssoLogoutAction } from '@/lib/actions/auth';
import { getRoleAccessConfigs } from '@/lib/actions/role-access';
import { getDepartmentGatekeeperConfigs } from '@/lib/actions/gatekeeper';
import { listVisibleNotifications, listVisibleTickets, resolveViewer } from '@/lib/ticket-access';
import { findEmployeeByLogin } from '@/lib/directory';
import Shell from './shell';

// Session-dependent data on every request (and some admin screens still read localStorage
// during render until the rewiring finishes) — never prerender.
export const dynamic = 'force-dynamic';

// ugt-nextjs-auth-setup (2026-09-02): session + first-admin gate for every
// route under this shell. Real access control replaces the old free
// role-switcher dropdown — see docs/project-context/decisions.md.
export default async function ShellLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  // First person ever to log in is sent to bootstrap the admin system —
  // otherwise they land in a blank, permission-less app with no clue where
  // to go (see ugt-nextjs-auth-setup skill §5.5).
  if (!(await isAdminInitialized())) redirect('/admin/setup');

  // Role + ticket scope come from resolveViewer only (slice 2 swaps it to the people rosters).
  // The user row is read once, inside resolveViewer; permission keys follow its role.
  const viewer = await resolveViewer(session);
  const permissions = viewer ? permissionsFor(viewer.role, viewer.config?.allowedTabs ?? []) : [];
  const appRole = viewer?.role ?? null;

  // Every signed-in person has a role since 2026-10-09 (rosters, else employee), so this only
  // happens when the session's user row is gone. Renders outside <Shell>: nothing safe to show.
  if (!viewer || !appRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center font-sans text-slate-900 antialiased">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm shadow-indigo-200">
          <span className="text-lg font-black">UGT</span>
        </div>
        <h1 className="text-lg font-bold text-slate-900">ไม่พบบัญชีผู้ใช้งานในระบบ</h1>
        <p className="max-w-md text-sm text-slate-500">
          บัญชี <strong className="font-semibold text-slate-700">{session.user.email}</strong>{' '}
          ไม่พบข้อมูลบัญชีนี้ในระบบ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่อีกครั้ง หากยังพบปัญหา
          กรุณาติดต่อผู้ดูแลระบบ
        </p>
        <div className="flex items-center gap-2">
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
  const [rolePermissions, gatekeeperConfigs, employee] = await Promise.all([
    getRoleAccessConfigs(),
    getDepartmentGatekeeperConfigs(),
    // HR-view profile prefills the submit form; the view is a linked server — never fail the page.
    findEmployeeByLogin(viewer.email).catch(() => null),
  ]);
  const tickets = await listVisibleTickets(viewer);
  const notifications = await listVisibleNotifications(
    viewer,
    tickets.map((t) => t.id)
  );
  const { gatekeeperCategories } = viewer;

  return (
    <Shell
      data={{ tickets, notifications, rolePermissions, gatekeeperConfigs, gatekeeperCategories }}
      identity={{
        name: viewer.name,
        email: viewer.email,
        appRole,
        roleName: viewer.rbacRoleName,
        employee,
        permissions,
      }}
    >
      {children}
    </Shell>
  );
}
