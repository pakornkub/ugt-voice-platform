import { describe, expect, it } from 'vitest';
import { formatFileSize } from './format-file-size';

describe('formatFileSize', () => {
  it('uses bytes below 1 KB', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('uses one decimal below 10 and none from 10 up', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1.4 * 1024 * 1024)).toBe('1.4 MB');
    expect(formatFileSize(25 * 1024 * 1024)).toBe('25 MB');
  });

  it('stops at GB', () => {
    expect(formatFileSize(3 * 1024 ** 3)).toBe('3.0 GB');
    expect(formatFileSize(2048 * 1024 ** 3)).toBe('2048 GB');
  });
});
