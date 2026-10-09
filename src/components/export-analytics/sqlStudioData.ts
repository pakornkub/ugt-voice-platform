import type { Language } from '@/context/LanguageContext';
import {
  NOT_SPECIFIED,
  NOT_SPECIFIED_EN,
  REPORT_ERROR_MESSAGES,
  REPORTS,
} from '@/lib/report-catalog';
import { escapeCsv } from './exportData';
import type { SqlResult } from './types';

export interface ResultGridCell {
  id: string;
  value: unknown;
}

export interface ResultGridRow {
  id: string;
  cells: ResultGridCell[];
}

export interface ResultGridColumn {
  id: string;
  label: string;
}

export interface ResultGrid {
  columns: ResultGridColumn[];
  rows: ResultGridRow[];
}

/**
 * Attach stable positional ids to report columns/rows/cells so the table can render with real
 * keys (result sets have no natural identifiers; columns may repeat).
 */
export function buildResultGrid(result: Pick<SqlResult, 'columns' | 'rows'>): ResultGrid {
  return {
    columns: result.columns.map((label, c) => ({ id: `col-${c}`, label })),
    rows: result.rows.map((row, r) => ({
      id: `row-${r}`,
      cells: row.map((value, c) => ({ id: `cell-${r}-${c}`, value })),
    })),
  };
}

/** The report result as an Excel-friendly CSV (UTF-8 BOM, every cell quoted). */
export function buildResultCsv(result: Pick<SqlResult, 'columns' | 'rows'>): string {
  const header = result.columns.map((column) => escapeCsv(column)).join(',');
  const rows = result.rows.map((row) => row.map((cell) => escapeCsv(cell)).join(','));
  return '﻿' + [header, ...rows].join('\n');
}

/**
 * The result as the UI shows it, in the UI language. The server returns Thai headers and Thai
 * "not specified" cells (the Server Action takes no language); English swaps both here, and a
 * failure code becomes its message. Thai passes the rows through untouched.
 */
export function localizeResult(result: SqlResult, lang: Language): SqlResult {
  const error = result.errorCode ? REPORT_ERROR_MESSAGES[result.errorCode][lang] : result.error;
  if (lang === 'th') return { ...result, error };
  const columnsEn = REPORTS.find((report) => report.id === result.reportId)?.columnsEn;
  return {
    ...result,
    error,
    columns: columnsEn?.length === result.columns.length ? [...columnsEn] : result.columns,
    rows: result.rows.map((row) =>
      row.map((cell) => (cell === NOT_SPECIFIED ? NOT_SPECIFIED_EN : cell))
    ),
  };
}
