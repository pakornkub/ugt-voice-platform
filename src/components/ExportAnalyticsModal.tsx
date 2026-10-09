'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Download, X, Lightbulb, Database as DatabaseIcon, Terminal } from 'lucide-react';
import { runReport } from '@/lib/actions/reports';
import { REPORT_ERROR_MESSAGES, REPORTS, type ReportId } from '@/lib/report-catalog';
import { ComplaintTicket } from '../types';
import { dateStamp, downloadBlob } from './export-analytics/download';
import {
  buildCsvContent,
  buildExportRecords,
  buildJsonPayload,
  computeMetrics,
  filterTickets,
} from './export-analytics/exportData';
import { ExportTab } from './export-analytics/ExportTab';
import { GuideTab } from './export-analytics/GuideTab';
import { buildResultCsv } from './export-analytics/sqlStudioData';
import { SqlStudioTab } from './export-analytics/SqlStudioTab';
import { TabButton } from './export-analytics/TabButton';
import type {
  ExportDatasetType,
  ExportFileFormat,
  ExportFilters,
  ExportTabId,
  SqlResult,
} from './export-analytics/types';

export type { ExportDatasetType, ExportFileFormat } from './export-analytics/types';

interface ExportAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: ComplaintTicket[];
}

const EXPORT_ERROR_MESSAGE = 'เกิดข้อผิดพลาดในการส่งออกไฟล์ กรุณาลองใหม่อีกครั้ง';

const INITIAL_FILTERS: ExportFilters = { department: 'ALL', status: 'ALL', timeRange: 'ALL' };

const failedResult = (error: string): SqlResult => ({
  columns: [],
  rows: [],
  executionTimeMs: 0,
  error,
});

export const ExportAnalyticsModal: React.FC<Readonly<ExportAnalyticsModalProps>> = ({
  isOpen,
  onClose,
  tickets = [],
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFileFormat>('csv');
  const [datasetType, setDatasetType] = useState<ExportDatasetType>('comprehensive');
  const [filters, setFilters] = useState<ExportFilters>(INITIAL_FILTERS);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ExportTabId>('export');

  // SQL Studio State — preset reports run on the server (lib/actions/reports.ts)
  const [selectedReportId, setSelectedReportId] = useState<ReportId>(REPORTS[0].id);
  const [sqlResult, setSqlResult] = useState<SqlResult | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const latestRun = useRef(0); // a slow earlier run must not overwrite a newer pick

  // Filtered tickets + analytics preview based on selections
  const filteredTickets = useMemo(() => filterTickets(tickets, filters), [tickets, filters]);
  const metrics = useMemo(() => computeMetrics(filteredTickets), [filteredTickets]);

  if (!isOpen) return null;

  const updateFilter = (key: keyof ExportFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const runSelectedReport = async (reportId: ReportId) => {
    latestRun.current += 1;
    const runId = latestRun.current;
    setIsExecutingSql(true);
    let next: SqlResult;
    try {
      const res = await runReport(reportId);
      next = res.ok
        ? { columns: res.columns, rows: res.rows, executionTimeMs: res.executionTimeMs }
        : failedResult(REPORT_ERROR_MESSAGES[res.error]);
    } catch (err) {
      console.error('Report failed:', err);
      next = failedResult(REPORT_ERROR_MESSAGES.FAILED);
    }
    if (runId !== latestRun.current) return;
    setSqlResult(next);
    setIsExecutingSql(false);
  };

  const exportJson = () => {
    const payload = buildJsonPayload(buildExportRecords(filteredTickets), {
      datasetType,
      filters,
      metrics,
      exportedAt: new Date().toISOString(),
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `grievance_data_${datasetType}_${dateStamp()}.json`);
  };

  const exportCsv = () => {
    const csvContent = buildCsvContent(buildExportRecords(filteredTickets));
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `grievance_bi_analytics_${datasetType}_${dateStamp()}.csv`);
  };

  const handleDownload = () => {
    try {
      if (selectedFormat === 'json') {
        exportJson();
      } else {
        exportCsv();
      }
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Export failed:', err);
      globalThis.alert(EXPORT_ERROR_MESSAGE); // same blocking alert as upstream
    }
  };

  const exportReportCsv = () => {
    if (!sqlResult) return;
    const blob = new Blob([buildResultCsv(sqlResult)], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `sql_report_${selectedReportId}_${dateStamp()}.csv`);
  };

  const openSqlStudio = () => {
    setActiveTab('sql_studio');
    if (!sqlResult) runSelectedReport(selectedReportId);
  };

  const selectReport = (reportId: ReportId) => {
    setSelectedReportId(reportId);
    runSelectedReport(reportId);
  };

  return (
    <div
      id="modal-export-analytics"
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs duration-200"
    >
      <div className="animate-in zoom-in-95 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl duration-200">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-emerald-300 shadow-inner backdrop-blur-md">
              <DatabaseIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  ศูนย์ข้อมูล & ส่งออกข้อมูลวิเคราะห์ (BI Data Hub)
                </h2>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                  SQL Server
                </span>
              </div>
              <p className="mt-0.5 text-xs text-emerald-100/80">
                ข้อมูลทั้งหมดจัดเก็บในฐานข้อมูลเชิงสัมพันธ์ SQL Server สามารถรันรายงานสำเร็จรูป
                หรือดาวน์โหลดไฟล์ CSV / JSON ไปเปิดได้ทันที
              </p>
            </div>
          </div>
          <button
            id="btn-close-export-modal"
            type="button"
            aria-label="ปิด"
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-6 pt-3">
          <TabButton
            id="tab-export-config"
            active={activeTab === 'export'}
            icon={<Download className="h-3.5 w-3.5" />}
            label="ดาวน์โหลดข้อมูล (Excel CSV, JSON)"
            onClick={() => setActiveTab('export')}
          />
          <TabButton
            id="tab-sql-studio"
            active={activeTab === 'sql_studio'}
            icon={<Terminal className="h-3.5 w-3.5 text-indigo-600" />}
            label="SQL Query Studio (รายงานสำเร็จรูป)"
            onClick={openSqlStudio}
          />
          <TabButton
            id="tab-export-guide"
            active={activeTab === 'guide'}
            icon={<Lightbulb className="h-3.5 w-3.5 text-amber-600" />}
            label="คู่มือมิติข้อมูลสำหรับปรับปรุงองค์กร"
            onClick={() => setActiveTab('guide')}
          />
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {activeTab === 'export' && (
            <ExportTab
              selectedFormat={selectedFormat}
              onFormatChange={setSelectedFormat}
              datasetType={datasetType}
              onDatasetChange={setDatasetType}
              filters={filters}
              onFilterChange={updateFilter}
              metrics={metrics}
              exportSuccess={exportSuccess}
              onDownload={handleDownload}
            />
          )}
          {activeTab === 'sql_studio' && (
            <SqlStudioTab
              selectedReportId={selectedReportId}
              sqlResult={sqlResult}
              isExecuting={isExecutingSql}
              onRun={() => runSelectedReport(selectedReportId)}
              onSelectReport={selectReport}
              onExportCsv={exportReportCsv}
            />
          )}
          {activeTab === 'guide' && <GuideTab />}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-100 px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>เชื่อมต่อฐานข้อมูล SQL Server | Schema v3.0 Relational Model</span>
          </div>
          <button
            id="btn-export-modal-footer-close"
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
