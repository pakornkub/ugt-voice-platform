import { describe, expect, it } from 'vitest';
import { REPORTS } from '@/lib/report-catalog';
import { buildResultCsv, buildResultGrid } from './sqlStudioData';

describe('preset report catalog', () => {
  it('ships the five upstream example reports, uniquely named, without SLA metrics', () => {
    expect(REPORTS).toHaveLength(5);
    expect(new Set(REPORTS.map((r) => r.id)).size).toBe(5);
    expect(new Set(REPORTS.map((r) => r.labelTh)).size).toBe(5);
    for (const report of REPORTS) {
      expect(report.columns.length).toBeGreaterThan(0);
      expect(new Set(report.columns).size).toBe(report.columns.length);
      expect(JSON.stringify(report)).not.toMatch(/SLA/i);
    }
  });
});

describe('buildResultGrid', () => {
  it('gives every column, row and cell a unique id, even for repeated column names', () => {
    const grid = buildResultGrid({
      columns: ['a', 'a'],
      rows: [
        [1, null],
        ['x', undefined],
      ],
    });
    expect(grid.columns.map((c) => c.label)).toEqual(['a', 'a']);
    expect(new Set(grid.columns.map((c) => c.id)).size).toBe(2);
    expect(grid.rows).toHaveLength(2);
    expect(grid.rows[0].cells.map((c) => c.value)).toEqual([1, null]);
    const cellIds = grid.rows.flatMap((r) => r.cells.map((c) => c.id));
    expect(new Set(cellIds).size).toBe(4);
    expect(new Set(grid.rows.map((r) => r.id)).size).toBe(2);
  });

  it('returns an empty grid for an empty result', () => {
    expect(buildResultGrid({ columns: [], rows: [] })).toEqual({ columns: [], rows: [] });
  });
});

describe('buildResultCsv', () => {
  it('writes a BOM, a quoted header and one quoted row per result row', () => {
    const csv = buildResultCsv({
      columns: ['หมวดหมู่', 'จำนวน'],
      rows: [
        ['HR', 3],
        ['say "hi"', null],
      ],
    });
    expect(csv).toBe('﻿"หมวดหมู่","จำนวน"\n"HR","3"\n"say ""hi""",""');
  });

  it('is just the header for an empty result', () => {
    expect(buildResultCsv({ columns: ['a'], rows: [] })).toBe('﻿"a"');
  });
});
