// lib/auth.ts — Better Auth config (ugt-nextjs-auth-setup, 2026-09-02).
// SSO (Keycloak) only — no LDAP / local email-password (มติ: docs/project-context/decisions.md).
// Adapted from the ugt-nextjs-auth-setup skill asset: trimmed to the SSO-only
// path, no lib/directory.ts enrichment (Q6 = ไม่มีฐานพนักงานกลางให้ต่อในรอบนี้ —
// see docs/project-context/decisions.md), no emailAndPassword local flows.
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { genericOAuth, keycloak } from 'better-auth/plugins';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';

// Derive a unique cookie prefix from NEXT_PUBLIC_BASE_PATH (empty in this
// project — standalone deploy, no shared domain, see docs/admin-handoff.md
// §2). Falls back to 'better-auth'. MUST stay in sync with middleware.ts
// (getSessionCookie) and lib/actions/auth.ts (SESSION_COOKIE_NAME).
const cookiePrefix = (env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\//, '') || 'better-auth';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    cookiePrefix,
  },
  trustedOrigins: (env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',').filter(Boolean),
  // Auth errors land on /login (which exists in every deployment) instead of
  // Better Auth's default /api/auth/error. login-form maps ?error=<code> to
  // a Thai message.
  onAPIError: {
    errorURL: `${env.NEXT_PUBLIC_BASE_PATH}/login`,
    onError: (error) => {
      // The redirect only carries the error code — the real cause (Prisma
      // constraint, missing field, hook throw) is only visible here.
      console.error('[auth] API error:', error);
    },
  },
  database: prismaAdapter(prisma, {
    provider: 'sqlserver',
  }),
  // Local email/password is NOT selected for this project (SSO only) — keep
  // the block present but disabled: Better Auth's prisma adapter still
  // expects the `account`/`credential` shape to exist for the `account`
  // model regardless, and disableSignUp closes the sign-up endpoint that
  // `enabled: false` would otherwise leave ambiguous.
  emailAndPassword: {
    enabled: false,
    disableSignUp: true,
  },
  rateLimit: {
    storage: 'database', // requires the rateLimit model — see prisma/schema.prisma
  },
  session: {
    expiresIn: 8 * 60 * 60, // 8 hours — org standard
    updateAge: 30 * 60, // refresh if 30 min remaining — org standard
  },
  // Allow Keycloak SSO to link with an existing row by email — safe because
  // the org Keycloak has already verified the email against the directory.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['keycloak'],
      // better-auth ≥1.6.11 blocks implicit linking into a row unless
      // emailVerified is true (nOAuth fix). Relaxed here because
      // self-registration is closed (org rule) — every row is either
      // Keycloak-created on first login, or the bootstrap admin.
      requireLocalEmailVerified: false,
    },
  },
  // Keycloak via genericOAuth + keycloak() helper. Guarded so a build with
  // SKIP_ENV_VALIDATION=1 (env vars undefined) never crashes — keycloak()
  // calls .replace() on the issuer string internally.
  plugins:
    env.KEYCLOAK_ISSUER && env.KEYCLOAK_CLIENT_ID && env.KEYCLOAK_CLIENT_SECRET
      ? [
          genericOAuth({
            config: [
              {
                ...keycloak({
                  clientId: env.KEYCLOAK_CLIENT_ID,
                  clientSecret: env.KEYCLOAK_CLIENT_SECRET,
                  issuer: env.KEYCLOAK_ISSUER,
                  pkce: true,
                  // Path is /api/auth/callback/:id (better-auth ≥1.7 folded
                  // generic OAuth into the core social provider route) — must
                  // match the redirect URI registered in Keycloak exactly,
                  // see docs/admin-handoff.md §2.
                  redirectURI: `${env.BETTER_AUTH_URL}${env.NEXT_PUBLIC_BASE_PATH}/api/auth/callback/keycloak`,
                  overrideUserInfo: true,
                }),
                mapProfileToUser: async (profile: Record<string, unknown>) => {
                  const loginName = profile.preferred_username as string | undefined;
                  if (!loginName) return {};

                  // Identity is the AD/Keycloak username, not the email — the
                  // stored email can drift from what Keycloak sends (e.g. a
                  // company domain change). Resolve the existing row first and
                  // let ITS email win, or Better Auth "creates" instead of
                  // "links" and dies on the unique email constraint.
                  const existing = await prisma.user
                    .findUnique({ where: { ldapUsername: loginName }, select: { email: true } })
                    .catch(() => null);
                  const email = existing?.email ?? (profile.email as string | undefined);
                  if (!email) {
                    throw new Error(
                      `SSO profile for "${loginName}" has no email — check the Keycloak client's "email" scope`
                    );
                  }

                  return { email, ldapUsername: loginName, authType: 'sso' };
                },
              },
            ],
          }),
        ]
      : [],
  // ─── Database hooks — SSO user sync + login audit log ────────────────────
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          const keycloakAccount = await prisma.account
            .findFirst({
              where: { userId: session.userId, providerId: 'keycloak' },
              select: { id: true },
            })
            .catch(() => null);

          if (keycloakAccount) {
            const userData = await prisma.user
              .findUnique({
                where: { id: session.userId },
                select: { ldapUsername: true, email: true },
              })
              .catch(() => null);

            const loginName = userData?.ldapUsername ?? userData?.email?.split('@')[0] ?? null;

            await prisma.user
              .update({
                where: { id: session.userId },
                data: {
                  authType: 'sso',
                  ...(loginName && !userData?.ldapUsername ? { ldapUsername: loginName } : {}),
                },
              })
              .catch(() => {});

            await prisma.activityLog
              .create({
                data: {
                  userId: session.userId,
                  action: AUDIT_ACTIONS.LOGIN_SUCCESS,
                  detail: JSON.stringify({ authType: 'sso' }),
                },
              })
              .catch(() => {});
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
