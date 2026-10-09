// lib/email-identity.ts — one mailbox, two domains (owner decision 2026-10-09, decisions.md):
// Keycloak/SSO sends `name@ube.com`, the HR view holds `name@ube.co.th`. The app stores and shows
// the `@ube.com` spelling everywhere and treats both spellings as the same person when comparing.
// Pure and client-safe — used by Server Actions, the HR directory, auth and UI checks alike.

const PRIMARY_DOMAIN = '@ube.com';
const ALIAS_DOMAIN = '@ube.co.th';

/** Trimmed, lower-case, `@ube.co.th` → `@ube.com`. Empty for null/blank input. */
export function normalizeEmail(email: string | null | undefined): string {
  const e = (email ?? '').trim().toLowerCase();
  return e.endsWith(ALIAS_DOMAIN) ? e.slice(0, -ALIAS_DOMAIN.length) + PRIMARY_DOMAIN : e;
}

/** Same person, whichever of the two domains each side was written with. Blank never matches. */
export function sameEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeEmail(a);
  return left !== '' && left === normalizeEmail(b);
}

/**
 * Both spellings of an address, primary first — for lookups in data the app does not write
 * itself (the HR view) or rows written before normalisation.
 */
export function emailVariants(email: string | null | undefined): string[] {
  const primary = normalizeEmail(email);
  if (!primary) return [];
  if (!primary.endsWith(PRIMARY_DOMAIN)) return [primary];
  return [primary, primary.slice(0, -PRIMARY_DOMAIN.length) + ALIAS_DOMAIN];
}
