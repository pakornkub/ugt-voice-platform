import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: { BETTER_AUTH_SECRET: 'x'.repeat(32), NODE_ENV: 'test', NEXT_PUBLIC_BASE_PATH: '' },
}));
vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));

const {
  accessKeyMatches,
  formatAccessKey,
  generateAccessKey,
  hashAccessKey,
  hrMatchStatusFor,
  takeRateLimit,
} = await import('./public-access');

describe('tracking secret', () => {
  it('is XXXX-XXXX from an alphabet without look-alike characters', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateAccessKey()).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
    }
  });

  it('accepts the secret however it was typed back', () => {
    expect(formatAccessKey(' k7qm 4xpa ')).toBe('K7QM-4XPA');
    expect(formatAccessKey('k7qm-4xpa')).toBe('K7QM-4XPA');
    const stored = hashAccessKey('K7QM-4XPA');
    expect(accessKeyMatches('k7qm4xpa', stored)).toBe(true);
  });

  it('stores only a keyed hash, and a wrong or missing secret never matches', () => {
    const stored = hashAccessKey('K7QM-4XPA');
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).not.toContain('K7QM');
    expect(accessKeyMatches('K7QM-4XPB', stored)).toBe(false);
    expect(accessKeyMatches('K7QM-4XPA', null)).toBe(false);
    expect(accessKeyMatches('K7QM-4XPA', '')).toBe(false);
  });
});

describe('takeRateLimit', () => {
  it('allows `limit` calls per window per bucket, then frees up as the window slides', () => {
    const t0 = 1_000_000;
    expect(takeRateLimit('t:a', 2, 1000, t0)).toBe(true);
    expect(takeRateLimit('t:a', 2, 1000, t0 + 10)).toBe(true);
    expect(takeRateLimit('t:a', 2, 1000, t0 + 20)).toBe(false);
    expect(takeRateLimit('t:b', 2, 1000, t0 + 20)).toBe(true); // other IP unaffected
    expect(takeRateLimit('t:a', 2, 1000, t0 + 1001)).toBe(true);
  });
});

describe('hrMatchStatusFor', () => {
  const employee = {
    employeeId: '650123',
    nameTh: 'นายสมชาย ใจดี',
    nameEn: 'Mr. Somchai Jaidee',
    loginEmail: '',
    department: '',
    position: '',
    phone: '',
    status: 'active' as const,
  };

  it('matches loosely on either name (title prefix, spacing, case)', () => {
    expect(hrMatchStatusFor(employee, 'สมชาย ใจดี')).toBe('matched');
    expect(hrMatchStatusFor(employee, 'สมชายใจดี')).toBe('matched');
    expect(hrMatchStatusFor(employee, 'somchai jaidee')).toBe('matched');
  });

  it('flags a different name and an unknown employee id', () => {
    expect(hrMatchStatusFor(employee, 'สมหญิง รักดี')).toBe('mismatch');
    expect(hrMatchStatusFor(employee, 'ก')).toBe('mismatch');
    expect(hrMatchStatusFor(null, 'สมชาย ใจดี')).toBe('not_found');
  });
});
