'use client';

// components/UsersTable.tsx — client half of /admin/users (ugt-nextjs-auth-setup,
// 2026-09-02). Hand-rolled <table>, matches this app's existing table pattern
// (see AdminGatekeeperManagement.tsx, GatekeeperInbox.tsx) — no DataTable kit.
import { useTransition } from 'react';
import { Crown, Shield, SlidersHorizontal, UserCheck } from 'lucide-react';
import { assignUserAppRoleAction } from '@/lib/actions/admin-users';
import type { UserRole } from '@/types';

type UserRow = {
  id: string;
  name: string;
  email: string;
  authType: string;
  appRole: string | null;
};

const APP_ROLE_LABELS: Record<UserRole, { label: string; icon: React.ReactNode }> = {
  employee: { label: 'พนักงานทั่วไป', icon: <UserCheck className="h-3 w-3 text-emerald-600" /> },
  gatekeeper: { label: 'Gatekeeper', icon: <Shield className="h-3 w-3 text-blue-600" /> },
  executive: { label: 'ผู้บริหาร', icon: <Crown className="h-3 w-3 text-purple-600" /> },
  admin: { label: 'HR Admin', icon: <SlidersHorizontal className="h-3 w-3 text-rose-600" /> },
};

const NO_ROLE = '__none__';

export function UsersTable({
  users,
  currentUserId,
  canUpdate,
}: Readonly<{
  users: UserRow[];
  currentUserId: string;
  canUpdate: boolean;
}>) {
  const [isPending, startTransition] = useTransition();

  function handleAppRoleChange(userId: string, value: string) {
    startTransition(async () => {
      const result = await assignUserAppRoleAction(
        userId,
        value === NO_ROLE ? null : (value as UserRole)
      );
      if (!result.success) alert(`เปลี่ยนบทบาทไม่สำเร็จ: ${result.code}`);
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              <th className="px-4 py-3">ชื่อ - อีเมล</th>
              <th className="px-3 py-3">วิธีเข้าสู่ระบบ</th>
              <th className="px-3 py-3">บทบาท (แท็บที่เห็นตั้งค่าในหน้า RBAC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">
                      {u.name}
                      {isSelf && (
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
                    <select
                      value={u.appRole ?? NO_ROLE}
                      disabled={!canUpdate || isPending || isSelf}
                      title={isSelf ? 'ไม่สามารถเปลี่ยนบทบาทของตัวเองได้' : undefined}
                      onChange={(e) => handleAppRoleChange(u.id, e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
                    >
                      <option value={NO_ROLE}>— ยังไม่กำหนด —</option>
                      {(Object.keys(APP_ROLE_LABELS) as UserRole[]).map((r) => (
                        <option key={r} value={r}>
                          {APP_ROLE_LABELS[r].label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
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
