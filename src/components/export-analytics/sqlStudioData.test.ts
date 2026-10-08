import { describe, expect, it } from 'vitest';
import { DEFAULT_SQL, PRESET_QUERIES, buildResultGrid } from './sqlStudioData';

describe('SQL studio constants', () => {
  it('ships five uniquely titled preset queries that read from the tickets tables', () => {
    expect(PRESET_QUERIES).toHaveLength(5);
    expect(new Set(PRESET_QUERIES.map((p) => p.title)).size).toBe(5);
    for (const preset of PRESET_QUERIES) {
      expect(preset.sql).toMatch(/FROM tickets/);
      expect(preset.sql.trimEnd().endsWith(';')).toBe(true);
    }
  });

  it('has a default query and no SLA metrics anywhere', () => {
    expect(DEFAULT_SQL).toMatch(/^-- /);
    expect(DEFAULT_SQL).toContain('GROUP BY category');
    const everything = [DEFAULT_SQL, ...PRESET_QUERIES.map((p) => p.sql + p.title)].join('\n');
    expect(everything).not.toMatch(/SLA/i);
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
