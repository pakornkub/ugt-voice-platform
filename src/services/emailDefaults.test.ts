import { describe, expect, it } from 'vitest';
import { DEFAULT_EMAIL_SETTINGS, interpolateEmailTemplate } from './emailDefaults';

describe('interpolateEmailTemplate', () => {
  it('interpolates single-brace tokens and treats $ in values literally', () => {
    expect(interpolateEmailTemplate('{a}-{a}-{b}', { a: '$&', b: 'B' })).toBe('$&-$&-B');
  });

  it('leaves unknown tokens untouched', () => {
    expect(interpolateEmailTemplate('{a} {zzz}', { a: 'x' })).toBe('x {zzz}');
  });
});

describe('DEFAULT_EMAIL_SETTINGS', () => {
  it('ships both triggers enabled with the master switch on', () => {
    expect(DEFAULT_EMAIL_SETTINGS.masterEnabled).toBe(true);
    expect(DEFAULT_EMAIL_SETTINGS.onTicketSubmitted).toMatchObject({ enabled: true });
    expect(DEFAULT_EMAIL_SETTINGS.onTicketResolved.body).toContain('{trackingUrl}');
  });
});
