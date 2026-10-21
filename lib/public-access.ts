// lib/public-access.ts — the no-login portal (/report, /track; owner 2026-10-21). A submitter
// without an account reaches exactly ONE ticket: its tracking code + the secret shown once on the
// success screen. The secret is stored only as an HMAC (keyed with BETTER_AUTH_SECRET, so a DB copy
// alone cannot brute-force the short secret); after a correct code + secret the pair rides in an
// httpOnly cookie, so the tracking screen, chat, CSAT and /api/files work without passing it around.
// Rotating BETTER_AUTH_SECRET invalidates every secret (and every SSO session) — by design.
import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { env } from '@/lib/env';
import type { EmployeeRecord, HrMatchStatus } from '@/types';

// No 0/O, 1/I/L — read off a phone screen and typed back.
const KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const KEY_LENGTH = 8;
// Same name in src/proxy.ts (it cannot import this server-only module) — keep in sync.
export const PUBLIC_TICKET_COOKIE = 'vc_track';
const COOKIE_MAX_AGE_SECONDS = 2 * 60 * 60;

/** A fresh secret, e.g. `K7QM-4XPA` (~40 bits; the rate limit below covers online guessing). */
export function generateAccessKey(): string {
  let key = '';
  for (let i = 0; i < KEY_LENGTH; i += 1) key += KEY_ALPHABET[randomInt(KEY_ALPHABET.length)];
  return formatAccessKey(key);
}

/** Whatever the person typed (lower case, spaces, missing dash) → the canonical `XXXX-XXXX`. */
export function formatAccessKey(input: string): string {
  const raw = input.toUpperCase().replaceAll(/[^A-Z0-9]/g, '');
  return raw.length === KEY_LENGTH ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

export function hashAccessKey(key: string): string {
  return createHmac('sha256', env.BETTER_AUTH_SECRET).update(formatAccessKey(key)).digest('hex');
}

export function accessKeyMatches(key: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  const given = Buffer.from(hashAccessKey(key));
  const stored = Buffer.from(storedHash);
  return given.length === stored.length && timingSafeEqual(given, stored);
}

// ─── Cookie: "this browser may open ticket X" ──────────────────────────────────

export async function rememberPublicTicket(ticketId: string, key: string): Promise<void> {
  (await cookies()).set(PUBLIC_TICKET_COOKIE, `${ticketId}.${formatAccessKey(key)}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: env.NEXT_PUBLIC_BASE_PATH || '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

// Cleared with maxAge 0 + the same flags, never cookies().delete() (it drops Secure — see
// .claude/rules/ugt-nextjs-auth.md).
export async function forgetPublicTicket(): Promise<void> {
  (await cookies()).set(PUBLIC_TICKET_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: env.NEXT_PUBLIC_BASE_PATH || '/',
    maxAge: 0,
  });
}

/** The cookie's ticket id + secret, unverified (the caller checks the secret against the row). */
export async function readPublicTicketCookie(): Promise<{ ticketId: string; key: string } | null> {
  const value = (await cookies()).get(PUBLIC_TICKET_COOKIE)?.value;
  const dot = value?.indexOf('.') ?? -1;
  if (!value || dot < 1) return null;
  return { ticketId: value.slice(0, dot), key: value.slice(dot + 1) };
}

// ─── Rate limit ────────────────────────────────────────────────────────────────

const buckets = new Map<string, number[]>();

/**
 * true = allowed (and counted). Sliding window per bucket key.
 * ponytail: in-memory, one container — counts reset on redeploy and aren't shared between
 * replicas; move to the RateLimit table if the app ever runs more than one container.
 */
export function takeRateLimit(
  bucket: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): boolean {
  // ponytail: whole map dropped at 10k keys — crude memory cap; prune per key if it ever matters.
  if (buckets.size > 10_000) buckets.clear();
  const recent = (buckets.get(bucket) ?? []).filter((at) => now - at < windowMs);
  const allowed = recent.length < limit;
  if (allowed) recent.push(now);
  buckets.set(bucket, recent);
  return allowed;
}

/**
 * Caller IP behind the one TLS-terminating proxy: the LAST X-Forwarded-For hop is the one that proxy
 * appended; earlier hops are whatever the client sent, so a limit keyed on them is bypassable.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const lastHop = h.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  return lastHop || h.get('x-real-ip') || 'unknown';
}

export const SUBMIT_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };
export const LOOKUP_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

// ─── HR check of what an identified submitter typed ────────────────────────────

// Title prefixes the HR view carries and people usually leave out. Stripped BEFORE spaces/dots go,
// so the English ones keep their boundary ("Mr Somchai" is not "Mrs omchai"); Thai titles are
// written attached to the name.
const NAME_PREFIX = /^(?:นางสาว|นาง|นาย|น\.ส\.|(?:mrs|mr|ms|miss)(?:\.|\s)+)/;
const compact = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(NAME_PREFIX, '')
    .replaceAll(/[\s.]+/g, '');

/**
 * The HR record of the typed employee id against the typed name: the whole name must match (title
 * prefix, spaces, dots and case ignored) — a fragment like "สม" must not earn a green tick.
 * A staff hint, not proof of identity.
 */
export function hrMatchStatusFor(
  employee: EmployeeRecord | null,
  typedName: string
): HrMatchStatus {
  if (!employee) return 'not_found';
  const typed = compact(typedName);
  const names = [employee.nameTh, employee.nameEn].map(compact).filter(Boolean);
  return typed && names.includes(typed) ? 'matched' : 'mismatch';
}
