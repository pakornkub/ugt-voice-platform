import { describe, expect, it } from 'vitest';
import { formatValue } from './formatValue';

describe('formatValue', () => {
  it('is empty for null and undefined', () => {
    expect(formatValue(null)).toBe('');
    expect(formatValue(undefined)).toBe('');
  });

  it('keeps strings and prints numbers, booleans and bigints', () => {
    expect(formatValue('text')).toBe('text');
    expect(formatValue(12.5)).toBe('12.5');
    expect(formatValue(false)).toBe('false');
    expect(formatValue(10n)).toBe('10');
  });

  it('writes dates as ISO and other objects as JSON, never [object Object]', () => {
    expect(formatValue(new Date('2026-10-09T00:00:00Z'))).toBe('2026-10-09T00:00:00.000Z');
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
    expect(formatValue([1, 2])).toBe('[1,2]');
    expect(formatValue(() => 1)).toBe('');
  });
});
