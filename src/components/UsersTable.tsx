// components/UsersTable.tsx — /admin/users list (ugt-nextjs-auth-setup, 2026-09-02); read-only
// since 2026-10-09: the role comes from the people rosters (lib/roster-role.ts), so each row shows
// the role and the roster it came from. Hand-rolled <table>, matches this app's table pattern.
// Client component only for the TH/EN copy: the page (a Server Component) cannot see the language,
// so the page heading lives here too.
'use client';

import { Crown, Shield, SlidersHorizontal, UserCheck } from 'lucide-react';
import { useTr } from '@/context/useTr';
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

interface Bilingual {
  th: string;
  en: string;
}

const APP_ROLE_LABELS: Record<UserRole, { label: Bilingual; icon: React.ReactNode }> = {
  employee: {
    label: { th: 'พนักงานทั่วไป', en: 'General Employee' },
    icon: <UserCheck className="h-3 w-3 text-emerald-600" />,
  },
  gatekeeper: {
    label: { th: 'Gatekeeper', en: 'Gatekeeper' },
    icon: <Shield className="h-3 w-3 text-blue-600" />,
  },
  executive: {
    label: { th: 'ผู้บริหาร', en: 'Executive' },
    icon: <Crown className="h-3 w-3 text-purple-600" />,
  },
  admin: {
    label: { th: 'HR Admin', en: 'HR Admin' },
    icon: <SlidersHorizontal className="h-3 w-3 text-rose-600" />,
  },
};

const SOURCE_LABELS: Record<RosterSource, Bilingual> = {
  hr_admins: { th: 'รายชื่อ HR Admin', en: 'HR Admin roster' },
  executives: { th: 'รายชื่อผู้บริหาร', en: 'Executive roster' },
  gatekeepers: { th: 'รายชื่อ Gatekeeper', en: 'Gatekeeper roster' },
};

function sourceText(u: UserRow, lang: 'th' | 'en'): string {
  if (!u.source) return lang === 'en' ? 'Not on any roster' : 'ไม่อยู่ในรายชื่อใด';
  const categories = u.officerCategories.length > 0 ? ` (${u.officerCategories.join(', ')})` : '';
  return SOURCE_LABELS[u.source][lang] + (u.source === 'gatekeepers' ? categories : '');
}

export function UsersTable({
  users,
  currentUserId,
}: Readonly<{
  users: UserRow[];
  currentUserId: string;
}>) {
  const { tr, lang } = useTr();
  return (
    <>
      <div>
        <h1 className="text-lg font-bold text-slate-900">{tr('Users', 'จัดการผู้ใช้ (Users)')}</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {tr(
            'Users who have signed in through SSO and the roles they hold. Roles come from the rosters on the "Personnel & Gatekeepers" page (HR Admin / Executive / Gatekeeper); anyone not on a roster is a general employee. The tabs each role can see are set on the RBAC page.',
            'รายชื่อผู้ใช้ที่เคยเข้าสู่ระบบผ่าน SSO และบทบาทที่ได้รับ — บทบาทมาจากรายชื่อในหน้า "จัดการผู้บริหาร & Gatekeeper" (HR Admin / ผู้บริหาร / Gatekeeper) ใครไม่อยู่ในรายชื่อใดเป็นพนักงานทั่วไป ส่วนแท็บที่แต่ละบทบาทเห็นตั้งค่าในหน้า RBAC'
          )}
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <th className="px-4 py-3">{tr('Name - Email', 'ชื่อ - อีเมล')}</th>
                <th className="px-3 py-3">{tr('Sign-in method', 'วิธีเข้าสู่ระบบ')}</th>
                <th className="px-3 py-3">{tr('Role', 'บทบาท')}</th>
                <th className="px-3 py-3">{tr('Role source', 'ที่มาของบทบาท')}</th>
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
                          {tr('You', 'คุณ')}
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
                      {APP_ROLE_LABELS[u.role].label[lang]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">{sourceText(u, lang)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    {tr('No users in the system yet', 'ยังไม่มีผู้ใช้ในระบบ')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
