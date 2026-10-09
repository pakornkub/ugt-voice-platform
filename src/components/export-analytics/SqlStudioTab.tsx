import React from 'react';
import { Play, Table, Terminal } from 'lucide-react';
import { REPORTS, type ReportId } from '@/lib/report-catalog';
import { SqlResultPanel } from './SqlResultPanel';
import type { SqlResult } from './types';

interface SqlStudioTabProps {
  selectedReportId: ReportId;
  sqlResult: SqlResult | null;
  isExecuting: boolean;
  onRun: () => void;
  onSelectReport: (reportId: ReportId) => void;
  onExportCsv: () => void;
}

const CARD_BASE = 'group rounded-lg border p-2.5 text-left transition';
const CARD_SELECTED = 'border-emerald-400 bg-emerald-50';
const CARD_IDLE = 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50';

export const SqlStudioTab: React.FC<Readonly<SqlStudioTabProps>> = ({
  selectedReportId,
  sqlResult,
  isExecuting,
  onRun,
  onSelectReport,
  onExportCsv,
}) => {
  const selected = REPORTS.find((report) => report.id === selectedReportId);
  return (
    <div className="space-y-5">
      {/* Top banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-white">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold">SQL Query Studio</h3>
            <p className="text-xs text-slate-400">
              เลือกรายงานสำเร็จรูปเพื่อรันบนฐานข้อมูลได้ทันที
            </p>
          </div>
        </div>
      </div>

      {/* Preset reports quick buttons */}
      <fieldset className="min-w-0">
        <legend
          id="sql-presets-heading"
          className="mb-2 block p-0 text-xs font-bold tracking-wider text-slate-700 uppercase"
        >
          รายงานสำเร็จรูปสำหรับการวิเคราะห์ (Preset Reports)
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((report, index) => (
            <button
              key={report.id}
              type="button"
              aria-pressed={report.id === selectedReportId}
              onClick={() => onSelectReport(report.id)}
              className={`${CARD_BASE} ${report.id === selectedReportId ? CARD_SELECTED : CARD_IDLE}`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                <span>{`${index + 1}. ${report.labelTh} (${report.labelEn})`}</span>
                <Play className="h-3 w-3 text-slate-400 group-hover:text-emerald-600" />
              </div>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Selected report + run */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase">
            <Table className="h-3.5 w-3.5 text-slate-500" />
            <span>รายงานที่เลือก (Report)</span>
          </span>
          <button
            type="button"
            onClick={onRun}
            disabled={isExecuting}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-98"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{isExecuting ? 'กำลังรันรายงาน...' : 'รันรายงาน (Run)'}</span>
          </button>
        </div>
        <div className="space-y-1 rounded-xl border border-slate-700 bg-slate-900 p-3.5 text-xs leading-relaxed text-emerald-300">
          {selected && <p className="font-bold">{selected.description}</p>}
          <p className="text-slate-400">
            รายงานสำเร็จรูปจากฐานข้อมูลจริง (SQL Server) — เฉพาะเรื่องที่คุณมีสิทธิ์เห็น
          </p>
        </div>
      </div>

      <SqlResultPanel result={sqlResult} onExportCsv={onExportCsv} />
    </div>
  );
};
