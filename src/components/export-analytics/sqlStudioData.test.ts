import { describe, expect, it } from 'vitest';
import {
  NOT_SPECIFIED,
  NOT_SPECIFIED_EN,
  REPORT_ERROR_MESSAGES,
  REPORTS,
} from '@/lib/report-catalog';
import { buildResultCsv, buildResultGrid, localizeResult } from './sqlStudioData';

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

describe('preset report catalog, English', () => {
  it('has an English description and one English header per Thai header', () => {
    for (const report of REPORTS) {
      expect(report.descriptionEn).toBeTruthy();
      expect(report.columnsEn).toHaveLength(report.columns.length);
      expect(new Set(report.columnsEn).size).toBe(report.columnsEn.length);
      expect(`${report.descriptionEn}${report.columnsEn.join('')}`).not.toMatch(/[฀-๿]/);
    }
  });

  it('has an English message for every failure code', () => {
    for (const message of Object.values(REPORT_ERROR_MESSAGES)) {
      expect(message.th).toMatch(/[฀-๿]/);
      expect(message.en).not.toMatch(/[฀-๿]/);
    }
  });
});

describe('localizeResult', () => {
  const rca = {
    reportId: 'root_cause_breakdown' as const,
    columns: [...REPORTS[3].columns],
    rows: [
      [NOT_SPECIFIED, 3, 'HR'],
      ['Process', 1, 'Quality'],
    ],
    executionTimeMs: 2,
  };

  it('hands the Thai result back as the server sent it', () => {
    expect(localizeResult(rca, 'th')).toEqual(rca);
  });

  it('swaps in the English headers and the "not specified" cell', () => {
    const shown = localizeResult(rca, 'en');
    expect(shown.columns).toEqual(REPORTS[3].columnsEn);
    expect(shown.rows).toEqual([
      [NOT_SPECIFIED_EN, 3, 'HR'],
      ['Process', 1, 'Quality'],
    ]);
    expect(shown.executionTimeMs).toBe(2);
    expect(rca.columns).toEqual(REPORTS[3].columns);
  });

  it('keeps the columns when the report is unknown or the column count differs', () => {
    expect(localizeResult({ ...rca, reportId: undefined }, 'en').columns).toEqual(rca.columns);
    expect(localizeResult({ ...rca, columns: ['a'] }, 'en').columns).toEqual(['a']);
  });

  it('turns a failure code into the message of the language', () => {
    const failed = { columns: [], rows: [], executionTimeMs: 0, errorCode: 'FORBIDDEN' as const };
    expect(localizeResult(failed, 'th').error).toBe(REPORT_ERROR_MESSAGES.FORBIDDEN.th);
    expect(localizeResult(failed, 'en').error).toBe(REPORT_ERROR_MESSAGES.FORBIDDEN.en);
    expect(localizeResult(rca, 'en').error).toBeUndefined();
  });
});

describe('preset report catalog, English', () => {
  it('has an English description and one English header per Thai header', () => {
    for (const report of REPORTS) {
      expect(report.descriptionEn).toBeTruthy();
      expect(report.columnsEn).toHaveLength(report.columns.length);
      expect(new Set(report.columnsEn).size).toBe(report.columnsEn.length);
      expect(`${report.descriptionEn}${report.columnsEn.join('')}`).not.toMatch(/[฀-๿]/);
    }
  });

  it('has an English message for every failure code', () => {
    for (const message of Object.values(REPORT_ERROR_MESSAGES)) {
      expect(message.th).toMatch(/[฀-๿]/);
      expect(message.en).not.toMatch(/[฀-๿]/);
    }
  });
});

describe('localizeResult', () => {
  const rca = {
    reportId: 'root_cause_breakdown' as const,
    columns: [...REPORTS[3].columns],
    rows: [
      [NOT_SPECIFIED, 3, 'HR'],
      ['Process', 1, 'Quality'],
    ],
    executionTimeMs: 2,
  };

  it('hands the Thai result back as the server sent it', () => {
    expect(localizeResult(rca, 'th')).toEqual(rca);
  });

  it('swaps in the English headers and the "not specified" cell', () => {
    const shown = localizeResult(rca, 'en');
    expect(shown.columns).toEqual(REPORTS[3].columnsEn);
    expect(shown.rows).toEqual([
      [NOT_SPECIFIED_EN, 3, 'HR'],
      ['Process', 1, 'Quality'],
    ]);
    expect(shown.executionTimeMs).toBe(2);
    expect(rca.columns).toEqual(REPORTS[3].columns);
  });

  it('keeps the columns when the report is unknown or the column count differs', () => {
    expect(localizeResult({ ...rca, reportId: undefined }, 'en').columns).toEqual(rca.columns);
    expect(localizeResult({ ...rca, columns: ['a'] }, 'en').columns).toEqual(['a']);
  });

  it('turns a failure code into the message of the language', () => {
    const failed = { columns: [], rows: [], executionTimeMs: 0, errorCode: 'FORBIDDEN' as const };
    expect(localizeResult(failed, 'th').error).toBe(REPORT_ERROR_MESSAGES.FORBIDDEN.th);
    expect(localizeResult(failed, 'en').error).toBe(REPORT_ERROR_MESSAGES.FORBIDDEN.en);
    expect(localizeResult(rca, 'en').error).toBeUndefined();
  });
});
