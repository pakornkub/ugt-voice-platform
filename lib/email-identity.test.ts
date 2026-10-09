import { describe, expect, it } from 'vitest';
import { emailVariants, normalizeEmail, sameEmail } from './email-identity';

describe('email identity (@ube.co.th ≡ @ube.com)', () => {
  it('stores the @ube.com spelling, trimmed and lower-case', () => {
    expect(normalizeEmail(' Pakornwo@UBE.co.th ')).toBe('pakornwo@ube.com');
    expect(normalizeEmail('pakornwo@ube.com')).toBe('pakornwo@ube.com');
    expect(normalizeEmail('someone@gmail.com')).toBe('someone@gmail.com');
    expect(normalizeEmail('x@notube.co.th.example')).toBe('x@notube.co.th.example');
    expect(normalizeEmail(null)).toBe('');
  });

  it('treats the two domains as the same person, and nothing else', () => {
    expect(sameEmail('pakornwo@ube.co.th', 'PAKORNWO@ube.com')).toBe(true);
    expect(sameEmail('pakornwo@ube.com', 'pakornwo@gmail.com')).toBe(false);
    expect(sameEmail('', '')).toBe(false);
    expect(sameEmail(undefined, 'a@ube.com')).toBe(false);
  });

  it('lists both spellings for lookups, primary first', () => {
    expect(emailVariants('pakornwo@ube.co.th')).toEqual(['pakornwo@ube.com', 'pakornwo@ube.co.th']);
    expect(emailVariants('a@gmail.com')).toEqual(['a@gmail.com']);
    expect(emailVariants(' ')).toEqual([]);
  });
});
