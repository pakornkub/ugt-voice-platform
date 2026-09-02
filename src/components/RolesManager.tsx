'use client';

// components/RolesManager.tsx — client half of /admin/roles
// (ugt-nextjs-auth-setup, 2026-09-02). Hand-rolled table + centered overlay
// modal (matches TrackingTimelineModal.tsx's pattern) with a grouped
// permission checklist — no shadcn Sheet/DataTable/ConfirmActionDialog.
// Delete confirms via window.confirm(), matching this app's existing
// convention (see RoleBasedAccessManagement.tsx's handleDeleteExec).
import { useState } from 'react';
import { Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { groupState, toggleGroup } from '@/lib/permission-group-select';
import { createRoleAction, deleteRoleAction, updateRoleAction } from '@/lib/actions/admin-roles';

type PermissionOption = { id: string; key: string; label: string; group: string };
type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionIds: string[];
};

function RoleFormModal({
  role,
  allPermissions,
  onClose,
  onSaved,
}: Readonly<{
  role: RoleRow | null;
  allPermissions: PermissionOption[];
  onClose: () => void;
  onSaved: (message: string) => void;
}>) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selected, setSelected] = useState<string[]>(role?.permissionIds ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = new Map<string, PermissionOption[]>();
  for (const perm of allPermissions) {
    const bucket = groups.get(perm.group) ?? [];
    bucket.push(perm);
    groups.set(perm.group, bucket);
  }

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('กรุณากรอกชื่อบทบาท');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const input = { name, description, permissionIds: selected };
    const result = role ? await updateRoleAction(role.id, input) : await createRoleAction(input);
    setIsSubmitting(false);
    if (!result.success) {
      setError(`บันทึกไม่สำเร็จ: ${result.code}`);
      return;
    }
    onSaved(role ? `แก้ไขบทบาท "${name}" เรียบร้อยแล้ว` : `สร้างบทบาท "${name}" เรียบร้อยแล้ว`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-xs sm:p-6">
      <div className="animate-in fade-in zoom-in-95 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            {role ? 'แก้ไขบทบาท' : 'สร้างบทบาทใหม่'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-700">
              ชื่อบทบาท <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น HR Coordinator"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-700">คำอธิบาย</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">สิทธิ์การใช้งาน</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 tabular-nums">
                {selected.length} / {allPermissions.length}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {[...groups.entries()].map(([group, perms], index) => {
                const groupIds = perms.map((p) => p.id);
                const state = groupState(groupIds, selected);
                const selectedInGroup = groupIds.reduce(
                  (n, id) => (selected.includes(id) ? n + 1 : n),
                  0
                );
                return (
                  <div key={group} className={index > 0 ? 'border-t border-slate-200' : ''}>
                    <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-2">
                      <input
                        type="checkbox"
                        id={`group-${group}`}
                        checked={state === 'all'}
                        ref={(el) => {
                          if (el) el.indeterminate = state === 'some';
                        }}
                        onChange={() => setSelected(toggleGroup(groupIds, selected))}
                        className="h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label
                        htmlFor={`group-${group}`}
                        className="flex-1 cursor-pointer text-xs font-bold text-slate-800 capitalize"
                      >
                        {group}
                      </label>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {selectedInGroup} / {groupIds.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 px-3 py-2.5 pl-8">
                      {perms.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex cursor-pointer items-center justify-between gap-2 text-xs text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected.includes(perm.id)}
                              onChange={(e) => toggleOne(perm.id, e.target.checked)}
                              className="h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            {perm.label}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{perm.key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-70"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RolesManager({
  roles,
  allPermissions,
  canCreate,
  canUpdate,
  canDelete,
}: Readonly<{
  roles: RoleRow[];
  allPermissions: PermissionOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}>) {
  const [modalTarget, setModalTarget] = useState<'create' | RoleRow | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDelete = async (role: RoleRow) => {
    if (
      !confirm(
        `ยืนยันการลบบทบาท "${role.name}"? ผู้ใช้ที่มีบทบาทนี้จะกลายเป็น "ไม่มีสิทธิ์ผู้ดูแลระบบ"`
      )
    ) {
      return;
    }
    const result = await deleteRoleAction(role.id);
    if (!result.success) {
      alert(`ลบไม่สำเร็จ: ${result.code}`);
      return;
    }
    showToast(`ลบบทบาท "${role.name}" เรียบร้อยแล้ว`);
  };

  return (
    <div className="space-y-4">
      {toastMessage && (
        <div className="animate-in fade-in fixed top-20 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">บทบาทและสิทธิ์ (Roles)</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            บทบาทสำหรับหน้าผู้ดูแลระบบ (จัดการผู้ใช้ / บทบาท / บันทึกการใช้งาน) —
            แยกจากบทบาทหลักของแอป (พนักงาน / Gatekeeper / ผู้บริหาร / Admin) ที่กำหนดในหน้า
            &quot;จัดการผู้ใช้&quot;
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setModalTarget('create')}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>สร้างบทบาทใหม่</span>
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <th className="px-4 py-3">บทบาท</th>
                <th className="px-3 py-3">คำอธิบาย</th>
                <th className="px-3 py-3 text-right">จำนวนสิทธิ์</th>
                {(canUpdate || canDelete) && <th className="px-3 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((role) => (
                <tr key={role.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900">{role.name}</span>
                    {role.isSystem && (
                      <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        System
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-500">{role.description || '-'}</td>
                  <td className="px-3 py-3 text-right text-slate-700 tabular-nums">
                    {role.permissionIds.length}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <button
                            type="button"
                            disabled={role.isSystem}
                            title={role.isSystem ? 'บทบาทระบบแก้ไขไม่ได้' : 'แก้ไข'}
                            onClick={() => setModalTarget(role)}
                            className="rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            disabled={role.isSystem}
                            title={role.isSystem ? 'บทบาทระบบลบไม่ได้' : 'ลบ'}
                            onClick={() => handleDelete(role)}
                            className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    ยังไม่มีบทบาทในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalTarget !== null && (
        <RoleFormModal
          role={modalTarget === 'create' ? null : modalTarget}
          allPermissions={allPermissions}
          onClose={() => setModalTarget(null)}
          onSaved={(message) => {
            setModalTarget(null);
            showToast(message);
          }}
        />
      )}
    </div>
  );
}
