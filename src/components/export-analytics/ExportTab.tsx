import React from 'react';
import { CheckCircle2, Download } from 'lucide-react';
import { useTr } from '../../context/useTr';
import { DatasetSelector } from './DatasetSelector';
import { FilterPanel } from './FilterPanel';
import { FormatSelector } from './FormatSelector';
import { MetricsPreview } from './MetricsPreview';
import type { ExportDatasetType, ExportFileFormat, ExportFilters, ExportMetrics } from './types';

const FORMAT_HINTS: Record<ExportFileFormat, { th: string; en: string }> = {
  csv: {
    th: '📊 ไฟล์ Excel CSV แบบ UTF-8 with BOM รองรับภาษาไทย',
    en: '📊 Excel CSV file, UTF-8 with BOM (Thai-safe)',
  },
  json: { th: '📄 ไฟล์ JSON Structured Document', en: '📄 Structured JSON document' },
};

interface ExportTabProps {
  selectedFormat: ExportFileFormat;
  onFormatChange: (format: ExportFileFormat) => void;
  datasetType: ExportDatasetType;
  onDatasetChange: (dataset: ExportDatasetType) => void;
  filters: ExportFilters;
  onFilterChange: (key: keyof ExportFilters, value: string) => void;
  metrics: ExportMetrics;
  exportSuccess: boolean;
  onDownload: () => void;
}

export const ExportTab: React.FC<Readonly<ExportTabProps>> = ({
  selectedFormat,
  onFormatChange,
  datasetType,
  onDatasetChange,
  filters,
  onFilterChange,
  metrics,
  exportSuccess,
  onDownload,
}) => {
  const { tr, lang } = useTr();
  return (
    <>
      <FormatSelector selected={selectedFormat} onSelect={onFormatChange} />
      <DatasetSelector selected={datasetType} onSelect={onDatasetChange} />
      <FilterPanel filters={filters} onChange={onFilterChange} />
      <MetricsPreview metrics={metrics} />

      <div className="flex flex-col items-center justify-between gap-4 pt-2 sm:flex-row">
        <div className="text-xs text-slate-500">{FORMAT_HINTS[selectedFormat][lang]}</div>

        <button
          type="button"
          id="btn-trigger-download"
          onClick={onDownload}
          disabled={metrics.total === 0}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold shadow-md transition sm:w-auto ${
            metrics.total === 0
              ? 'cursor-not-allowed bg-slate-200 text-slate-400'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-98'
          }`}
        >
          <Download className="h-4 w-4" />
          <span>
            {tr(
              `Download file (${metrics.total} ${metrics.total === 1 ? 'record' : 'records'})`,
              `ดาวน์โหลดไฟล์ (${metrics.total} รายการ)`
            )}
          </span>
        </button>
      </div>

      {exportSuccess && (
        <div className="animate-in fade-in flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <span className="font-bold">{tr('Download complete!', 'ดาวน์โหลดสำเร็จ!')}</span>{' '}
            {tr(
              'The file is ready to open in Excel or any data analysis tool.',
              'ไฟล์พร้อมเปิดใช้งานใน Excel หรือเครื่องมือวิเคราะห์ข้อมูลได้ทันที'
            )}
          </div>
        </div>
      )}
    </>
  );
};
