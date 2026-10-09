import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTr } from '../../context/useTr';
import type { ExportMetrics } from './types';

interface MetricTileProps {
  label: string;
  value: string;
  valueClassName: string;
}

const MetricTile: React.FC<Readonly<MetricTileProps>> = ({ label, value, valueClassName }) => (
  <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
    <span className="block text-[10px] font-medium text-slate-400">{label}</span>
    <span className={`text-lg font-black ${valueClassName}`}>{value}</span>
  </div>
);

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export const MetricsPreview: React.FC<Readonly<{ metrics: ExportMetrics }>> = ({ metrics }) => {
  const { tr } = useTr();
  return (
    <div className="rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 text-white">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold tracking-wider text-emerald-300 uppercase">
            {tr('Export Preview Stats', 'สรุปภาพรวมข้อมูลที่พร้อมส่งออก (Export Preview Stats)')}
          </span>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200">
          {tr(
            `${metrics.total} ${plural(metrics.total, 'record', 'records')}`,
            `${metrics.total} รายการ`
          )}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile
          label={tr('Resolution rate', 'อัตราแก้ไขสำเร็จ')}
          value={`${metrics.resolvedRate}%`}
          valueClassName="text-emerald-400"
        />
        <MetricTile
          label={tr('Direct to executives (CEO)', 'สายตรงผู้บริหาร (CEO)')}
          value={tr(
            `${metrics.directToCeoCount} ${plural(metrics.directToCeoCount, 'case', 'cases')}`,
            `${metrics.directToCeoCount} เคส`
          )}
          valueClassName="text-sky-400"
        />
        <MetricTile
          label={tr('Average resolution time', 'เวลาเฉลี่ยในการแก้ไข')}
          value={tr(`${metrics.avgResolutionHours} hrs`, `${metrics.avgResolutionHours} ชม.`)}
          valueClassName="text-amber-300"
        />
        <MetricTile
          label={tr('Satisfaction score (CSAT)', 'คะแนนความพึงพอใจ (CSAT)')}
          value={metrics.avgCsat > 0 ? `${metrics.avgCsat} / 5.0` : 'N/A'}
          valueClassName="text-purple-300"
        />
      </div>
    </div>
  );
};
