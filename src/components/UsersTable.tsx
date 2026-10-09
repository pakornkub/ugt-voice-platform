// components/UsersTable.tsx — /admin/users list (ugt-nextjs-auth-setup, 2026-09-02); read-only
// since 2026-10-09: the role comes from the people rosters (lib/roster-role.ts), so each row shows
// the role and the roster it came from. Hand-rolled <table>, matches this app's table pattern.
import { Crown, Shield, SlidersHorizontal, UserCheck } from 'lucide-react';
import type { RosterSource } from '@/lib/roster-role';
import type { GrievanceCategory, UserRole } from '@/types';

type UserRow = {
  id: string;
  name: string;
  email: string;
  authType: string;
  role: UserRole;
  source: RosterSource | null;
  officerCategories: GrievanceCategory[];
};

const APP_ROLE_LABELS: Record<UserRole, { label: string; icon: React.ReactNode }> = {
  employee: { label: 'พนักงานทั่วไป', icon: <UserCheck className="h-3 w-3 text-emerald-600" /> },
  gatekeeper: { label: 'Gatekeeper', icon: <Shield className="h-3 w-3 text-blue-600" /> },
  executive: { label: 'ผู้บริหาร', icon: <Crown className="h-3 w-3 text-purple-600" /> },
  admin: { label: 'HR Admin', icon: <SlidersHorizontal className="h-3 w-3 text-rose-600" /> },
};

const SOURCE_LABELS: Record<RosterSource, string> = {
  hr_admins: 'รายชื่อ HR Admin',
  executives: 'รายชื่อผู้บริหาร',
  gatekeepers: 'รายชื่อ Gatekeeper',
};

function sourceText(u: UserRow): string {
  if (!u.source) return 'ไม่อยู่ในรายชื่อใด';
  const categories = u.officerCategories.length > 0 ? ` (${u.officerCategories.join(', ')})` : '';
  return SOURCE_LABELS[u.source] + (u.source === 'gatekeepers' ? categories : '');
}

export function UsersTable({
  users,
  currentUserId,
}: Readonly<{
  users: UserRow[];
  currentUserId: string;
}>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              <th className="px-4 py-3">ชื่อ - อีเมล</th>
              <th className="px-3 py-3">วิธีเข้าสู่ระบบ</th>
              <th className="px-3 py-3">บทบาท</th>
              <th className="px-3 py-3">ที่มาของบทบาท</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="transition hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-900">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="ml-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                        คุณ
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">{u.email}</div>
                </td>
                <td className="px-3 py-3">
                  <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                    {u.authType}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    {APP_ROLE_LABELS[u.role].icon}
                    {APP_ROLE_LABELS[u.role].label}
                  </span>
                </td>
                <td className="px-3 py-3 text-[11px] text-slate-500">{sourceText(u)}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  ยังไม่มีผู้ใช้ในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
