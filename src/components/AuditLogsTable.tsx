'use client';

// components/AuditLogsTable.tsx — client half of /admin/audit-logs
// (ugt-nextjs-auth-setup, 2026-09-02). Server-side filter/sort/page — every
// control pushes q/from/to/action/page into the URL, page.tsx re-queries.
// Hand-rolled table + plain <input type="date">/<select> — no DataTable/
// DateRangePicker kit. Dates formatted inline with toLocaleString (DESIGN.md
// §5 — no central lib/format.ts in this project).
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const ALL_ACTIONS = '__all__';

type AuditLogRow = {
  id: number;
  createdAt: string;
  userName: string;
  action: string;
  detail: string | null;
};

function prettyDetail(detail: string | null): string {
  if (!detail) return '';
  try {
    return JSON.stringify(JSON.parse(detail), null, 2);
  } catch {
    return detail;
  }
}

export function AuditLogsTable({
  rows,
  page,
  pageSize,
  totalItems,
  actionOptions,
  filters,
}: Readonly<{
  rows: AuditLogRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  actionOptions: string[];
  filters: { q: string; from: string; to: string; action: string };
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // เปลี่ยนตัวกรอง = เงื่อนไขใหม่ → กลับหน้า 1 เสมอ (ไม่ตั้ง page ใน URL ให้ page.tsx default เอง)
  function applyFilters(next: Partial<typeof filters>) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...next };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function goToPage(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    params.set('page', String(target));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-[11px] font-bold text-slate-600">
            ค้นหาชื่อ/อีเมลผู้ใช้
          </label>
          <input
            type="text"
            defaultValue={filters.q}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters({ q: e.currentTarget.value });
            }}
            onBlur={(e) => applyFilters({ q: e.currentTarget.value })}
            placeholder="พิมพ์แล้วกด Enter..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-600">จากวันที่</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => applyFilters({ from: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-600">ถึงวันที่</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => applyFilters({ to: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-600">Action</label>
          <select
            value={filters.action || ALL_ACTIONS}
            onChange={(e) =>
              applyFilters({ action: e.target.value === ALL_ACTIONS ? '' : e.target.value })
            }
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value={ALL_ACTIONS}>ทั้งหมด</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        {(filters.q || filters.from || filters.to || filters.action) && (
          <button
            type="button"
            onClick={() => applyFilters({ q: '', from: '', to: '', action: '' })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <th className="px-4 py-3">เวลา</th>
                <th className="px-3 py-3">ผู้ใช้</th>
                <th className="px-3 py-3">Action</th>
                <th className="px-3 py-3">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">
                    {new Date(row.createdAt).toLocaleString('th-TH', {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{row.userName}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-slate-600">{row.action}</td>
                  <td className="px-3 py-3">
                    {row.detail ? (
                      <button
                        type="button"
                        onClick={() => setOpenDetail(row.detail)}
                        className="block max-w-md cursor-pointer truncate text-left font-mono text-[11px] text-indigo-600 underline-offset-2 hover:underline"
                      >
                        {row.detail}
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    ไม่พบบันทึกการใช้งานตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
          <span>
            ทั้งหมด <strong className="text-slate-700">{totalItems.toLocaleString('th-TH')}</strong>{' '}
            รายการ
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="tabular-nums">
              หน้า {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail dialog */}
      {openDetail !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-xs sm:p-6"
          role="presentation"
          onClick={() => setOpenDetail(null)}
        >
          <div
            className="animate-in fade-in zoom-in-95 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            role="presentation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-bold text-slate-900">รายละเอียด</h2>
              <button
                type="button"
                onClick={() => setOpenDetail(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <pre className="max-h-96 overflow-auto p-4 font-mono text-[11px] break-all whitespace-pre-wrap text-slate-700">
              {prettyDetail(openDetail)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
