import type { ReportErrorCode, ReportId } from '@/lib/report-catalog';

export type ExportDatasetType =
  'comprehensive' | 'operational_ops' | 'root_cause_capa' | 'csat_quality';
export type ExportFileFormat = 'csv' | 'json';
export type ExportTabId = 'export' | 'sql_studio' | 'guide';

export interface ExportFilters {
  department: string;
  status: string;
  timeRange: string;
}

export interface ExportMetrics {
  total: number;
  resolvedRate: number;
  avgResolutionHours: number;
  avgCsat: number;
  directToCeoCount: number;
}

export interface SqlResult {
  columns: string[];
  rows: unknown[][];
  executionTimeMs: number;
  /** Which report produced the rows — lets the client pick the headers for the UI language. */
  reportId?: ReportId;
  /** Server refusal / failure code; the panel text comes from it so it follows the language. */
  errorCode?: ReportErrorCode;
  error?: string;
}
