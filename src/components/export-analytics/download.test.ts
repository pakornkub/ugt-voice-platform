import { afterEach, describe, expect, it, vi } from 'vitest';
import { dateStamp, downloadBlob } from './download';

describe('downloadBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('clicks a temporary link with the filename, then cleans up', () => {
    const createObjectURL = vi.fn(() => 'blob:fake-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    let clicked: { href: string; download: string; inDom: boolean } | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicked = {
        href: this.href,
        download: this.download,
        inDom: document.body.contains(this),
      };
    });

    const blob = new Blob(['hello'], { type: 'text/plain' });
    downloadBlob(blob, 'hello.txt');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toEqual({ href: 'blob:fake-url', download: 'hello.txt', inDom: true });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});

describe('dateStamp', () => {
  it('formats today as YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T15:30:00Z'));
    expect(dateStamp()).toBe('2026-10-09');
    vi.useRealTimers();
  });
});
