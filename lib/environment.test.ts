import { describe, expect, it, vi } from 'vitest';

const testEnv = vi.hoisted(() => ({ NEXT_PUBLIC_BASE_PATH: '' as string | undefined }));
vi.mock('@/lib/env', () => ({ env: testEnv }));

const { isDevEnvironment } = await import('./environment');

describe('isDevEnvironment', () => {
  it('is true only for a basePath ending in -dev', () => {
    testEnv.NEXT_PUBLIC_BASE_PATH = '/ugt-voice-platform-dev';
    expect(isDevEnvironment()).toBe(true);
    testEnv.NEXT_PUBLIC_BASE_PATH = '/ugt-voice-platform';
    expect(isDevEnvironment()).toBe(false);
    testEnv.NEXT_PUBLIC_BASE_PATH = undefined;
    expect(isDevEnvironment()).toBe(false);
  });
});
