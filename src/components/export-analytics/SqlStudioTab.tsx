import React from 'react';
import { Download, Play, Sparkles, Table, Terminal, Upload } from 'lucide-react';
import { PRESET_QUERIES } from './sqlStudioData';
import { SqlResultPanel } from './SqlResultPanel';
import type { SqlResult } from './types';

interface SqlStudioTabProps {
  sqlQuery: string;
  onSqlQueryChange: (sql: string) => void;
  sqlResult: SqlResult | null;
  isExecuting: boolean;
  importStatus: string | null;
  onRun: () => void;
  onSelectPreset: (sql: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveSqlite: () => void;
}

export const SqlStudioTab: React.FC<Readonly<SqlStudioTabProps>> = ({
  sqlQuery,
  onSqlQueryChange,
  sqlResult,
  isExecuting,
  importStatus,
  onRun,
  onSelectPreset,
  onFileUpload,
  onSaveSqlite,
}) => (
  <div className="space-y-5">
    {/* Top Controls & Import/Export */}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-white">
      <div className="flex items-center gap-2">
        <Terminal className="h-5 w-5 text-emerald-400" />
        <div>
          <h3 className="text-sm font-bold">SQLite Interactive Query Console</h3>
          <p className="text-xs text-slate-400">
            รันคำสั่ง SQL Query บนฐานข้อมูลในเบราว์เซอร์ได้ทันที
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="sqlite-import-input"
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-700"
        >
          <Upload className="h-3.5 w-3.5 text-sky-400" />
          <span>นำเข้า .sqlite</span>
          <input
            id="sqlite-import-input"
            type="file"
            accept=".sqlite,.db"
            onChange={onFileUpload}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={onSaveSqlite}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
        >
          <Download className="h-3.5 w-3.5" />
          <span>บันทึก .sqlite</span>
        </button>
      </div>
    </div>

    {importStatus && (
      <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
        <Sparkles className="h-4 w-4 shrink-0 text-indigo-600" />
        <span>{importStatus}</span>
      </div>
    )}

    {/* Preset SQL queries quick buttons */}
    <div role="group" aria-labelledby="sql-presets-heading">
      <p
        id="sql-presets-heading"
        className="mb-2 block text-xs font-bold tracking-wider text-slate-700 uppercase"
      >
        คำสั่ง SQL สำเร็จรูปสำหรับการวิเคราะห์ (Preset Queries)
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PRESET_QUERIES.map((pq) => (
          <button
            key={pq.title}
            type="button"
            onClick={() => onSelectPreset(pq.sql)}
            className="group rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-emerald-800">
              <span>{pq.title}</span>
              <Play className="h-3 w-3 text-slate-400 group-hover:text-emerald-600" />
            </div>
          </button>
        ))}
      </div>
    </div>

    {/* SQL Code Input Editor */}
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label
          htmlFor="sql-query-input"
          className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase"
        >
          <Table className="h-3.5 w-3.5 text-slate-500" />
          <span>SQL Editor</span>
        </label>
        <button
          type="button"
          onClick={onRun}
          disabled={isExecuting}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-98"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{isExecuting ? 'กำลังรัน Query...' : 'รัน SQL (Execute)'}</span>
        </button>
      </div>
      <div className="relative">
        <textarea
          id="sql-query-input"
          rows={6}
          value={sqlQuery}
          onChange={(e) => onSqlQueryChange(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3.5 font-mono text-xs leading-relaxed text-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          placeholder="SELECT * FROM tickets LIMIT 10;"
        />
      </div>
    </div>

    <SqlResultPanel result={sqlResult} />
  </div>
);
