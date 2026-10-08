import React, { useMemo } from 'react';
import { buildResultGrid } from './sqlStudioData';
import type { SqlResult } from './types';

const ResultTable: React.FC<Readonly<{ result: SqlResult }>> = ({ result }) => {
  const grid = useMemo(() => buildResultGrid(result), [result]);
  return (
    <div className="max-h-72 overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
          <tr>
            {grid.columns.map((col) => (
              <th key={col.id} className="px-3.5 py-2 whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
          {grid.rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              {row.cells.map((cell) => (
                <td key={cell.id} className="px-3.5 py-2 whitespace-nowrap text-slate-800">
                  {cell.value === null || cell.value === undefined ? (
                    <span className="text-slate-400 italic">NULL</span>
                  ) : (
                    String(cell.value)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ResultBody: React.FC<Readonly<{ result: SqlResult | null }>> = ({ result }) => {
  if (result?.error) {
    return (
      <div className="bg-rose-50 p-4 font-mono text-xs text-rose-800">
        <span className="font-bold">SQL Error:</span> {result.error}
      </div>
    );
  }
  if (result && result.rows.length > 0) return <ResultTable result={result} />;
  return (
    <div className="p-8 text-center text-xs text-slate-400">
      ไม่มีข้อมูล หรือยังไม่ได้รันคำสั่ง SQL
    </div>
  );
};

export const SqlResultPanel: React.FC<Readonly<{ result: SqlResult | null }>> = ({ result }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2.5 text-xs">
      <div className="flex items-center gap-2 font-bold text-slate-700">
        <span>ผลลัพธ์การสืบค้น (Query Result)</span>
        {result && !result.error && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">
            {result.rows.length} แถว
          </span>
        )}
      </div>
      {result && (
        <span className="text-[11px] text-slate-500">
          เวลาประมวลผล: {result.executionTimeMs} ms
        </span>
      )}
    </div>
    <ResultBody result={result} />
  </div>
);
