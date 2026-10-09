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
