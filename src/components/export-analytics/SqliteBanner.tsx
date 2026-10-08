import React from 'react';
import { Database as DatabaseIcon } from 'lucide-react';

const SQLITE_TABLES = [
  'tickets',
  'ticket_timeline',
  'ticket_evaluations',
  'gatekeeper_officers',
  'executive_members',
] as const;

export const SqliteBanner: React.FC = () => (
  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 p-4">
    <div className="rounded-lg bg-emerald-600 p-2 text-white shadow-xs">
      <DatabaseIcon className="h-5 w-5" />
    </div>
    <div className="flex-1 space-y-1 text-xs">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-bold text-slate-900">
          ฐานข้อมูล SQLite ภายในเบราว์เซอร์ (Client-Side SQLite Engine)
        </h4>
        <span className="rounded border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          Active
        </span>
      </div>
      <p className="leading-relaxed text-slate-600">
        ระบบได้แปลงโครงสร้างข้อมูลเป็นตาราง Relational Tables (ได้แก่{' '}
        {SQLITE_TABLES.map((table, i) => (
          <React.Fragment key={table}>
            {i > 0 && ', '}
            <code className="rounded border bg-white px-1 py-0.5 text-slate-700">{table}</code>
          </React.Fragment>
        ))}
        ) พร้อม Indexing เรียบร้อยแล้ว
      </p>
    </div>
  </div>
);
