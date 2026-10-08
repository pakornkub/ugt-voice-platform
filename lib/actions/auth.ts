'use server';

// lib/actions/auth.ts — logout Server Actions (ugt-nextjs-auth-setup, 2026-09-02).
// SSO only in this project — no ldapLoginAction/localLoginAction (login itself
// happens entirely through authClient.signIn.social in components/LoginForm.tsx).
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AUDIT_ACTIONS, type AuditAction } from '@/lib/audit-actions';
import { env } from '@/lib/env';

// ─── Cookie naming ───────────────────────────────────────────────────────────
// Derive cookie prefix from NEXT_PUBLIC_BASE_PATH — MUST stay in sync with
// lib/auth.ts (advanced.cookiePrefix) and src/proxy.ts (getSessionCookie call).
const APP_COOKIE_PREFIX = (env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\//, '') || 'better-auth';
// Better Auth uses the __Secure- prefix when BETTER_AUTH_URL starts with
// https:// — this MUST match what Better Auth computes internally.
const SESSION_COOKIE_NAME = (env.BETTER_AUTH_URL ?? '').startsWith('https://')
  ? `__Secure-${APP_COOKIE_PREFIX}.session_token`
  : `${APP_COOKIE_PREFIX}.session_token`;
const SECURE_COOKIE = SESSION_COOKIE_NAME.startsWith('__Secure-');

async function getRequestMeta(): Promise<{ ip: string; userAgent: string }> {
  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown';
  const userAgent = headersList.get('user-agent') ?? 'unknown';
  return { ip, userAgent };
}

// Non-blocking — never throw; audit failure must not interrupt auth flow.
async function logAuthEvent(
  action: AuditAction,
  userId: string,
  detail: Record<string, unknown>
): Promise<void> {
  await prisma.activityLog
    .create({ data: { userId, action, detail: JSON.stringify(detail) } })
    .catch(() => {});
}

// ─── Cookie clearing ──────────────────────────────────────────────────────────
// MUST use cookieStore.set() with maxAge:0 instead of cookieStore.delete() —
// cookies().delete() omits the Secure flag, and the browser silently ignores
// the deletion of a __Secure- prefixed cookie without it (production-only bug).

async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  const clearAttrs = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: SECURE_COOKIE,
    maxAge: 0,
    path: '/',
  };

  cookieStore.set(SESSION_COOKIE_NAME, '', clearAttrs);

  const sessionDataCookie = SECURE_COOKIE
    ? `__Secure-${APP_COOKIE_PREFIX}.session_data`
    : `${APP_COOKIE_PREFIX}.session_data`;
  cookieStore.set(sessionDataCookie, '', clearAttrs);
}

// Delete the DB session for the current cookie and return its userId (or null).
async function deleteDbSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const signedToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!signedToken) return null;

  // Cookie value is `rawToken.base64sig` — strip the HMAC signature to get
  // the raw token stored in DB.
  const rawToken = signedToken.substring(0, signedToken.lastIndexOf('.'));
  if (!rawToken) return null;

  const sessionRecord = await prisma.session
    .findFirst({ where: { token: rawToken }, select: { userId: true } })
    .catch(() => null);
  await prisma.session.deleteMany({ where: { token: rawToken } }).catch(() => {});
  return sessionRecord?.userId ?? null;
}

// ─── SSO Logout (Keycloak) ───────────────────────────────────────────────────
// Clears the local session then invalidates the Keycloak SSO session via
// backchannel logout (server-side POST) — the browser never gets redirected
// through Keycloak.

export async function ssoLogoutAction(): Promise<void> {
  const userId = await deleteDbSession();
  if (userId) {
    const { ip, userAgent } = await getRequestMeta();
    await logAuthEvent(AUDIT_ACTIONS.LOGOUT_SSO, userId, { ip, userAgent });
  }

  // Non-fatal: if Keycloak is unreachable or the token already expired, still
  // clear the local session and redirect to /login.
  if (userId && env.KEYCLOAK_ISSUER && env.KEYCLOAK_CLIENT_ID && env.KEYCLOAK_CLIENT_SECRET) {
    const keycloakAccount = await prisma.account
      .findFirst({
        where: { userId, providerId: 'keycloak' },
        select: { refreshToken: true },
      })
      .catch(() => null);

    if (keycloakAccount?.refreshToken) {
      const logoutUrl = `${env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`;
      const body = new URLSearchParams({
        client_id: env.KEYCLOAK_CLIENT_ID,
        client_secret: env.KEYCLOAK_CLIENT_SECRET,
        refresh_token: keycloakAccount.refreshToken,
      });
      await fetch(logoutUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }).catch(() => {});
    }
  }

  await clearSessionCookies();
  redirect('/login');
}
