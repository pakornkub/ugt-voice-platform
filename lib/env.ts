// kit: ugt-nextjs-platform 4.25.0 · ugt-nextjs-database-setup/lib/env.ts
// kit-hash: 5a6ed3abd1c4
// lib/env.ts — type-safe env validation via @t3-oss/env-nextjs + zod.
// App code MUST import env from here — never read process.env directly.
// Lives at repo-root lib/ (not src/lib/) per this skill's convention —
// import it via `@/lib/env`, resolved by the dedicated `@/lib/*` -> `./lib/*`
// tsconfig path added ahead of the general `@/*` -> `./src/*` rule from
// Phase A (see tsconfig.json).
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Server-side environment variables — never exposed to the browser.
   */
  server: {
    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    // Dev-only shadow DB for `prisma migrate dev` — see prisma.config.ts and
    // references/migrations.md §1.1. Optional because `migrate deploy` (prod/CI)
    // never uses it.
    SHADOW_DATABASE_URL: z.string().optional(),

    // ── ugt-nextjs-database-setup: pre-existing app vars folded in here ────
    // (previously read directly via process.env in src/app/api/ai/* and
    // src/app/api/health/route.ts — moved here so those routes stop
    // violating the "no direct process.env" rule)
    GEMINI_API_KEY: z.string().optional(),
    APP_URL: z.string().optional(),

    // ── ugt-nextjs-auth-setup: Better Auth + Keycloak SSO (2026-09-02) ─────
    // SSO (Keycloak) only — no LDAP/local email-password in this project
    // (มติ: see docs/project-context/decisions.md). BETTER_AUTH_URL is
    // REQUIRED (not optional): Better Auth derives the __Secure- cookie
    // prefix from its scheme, and an empty value in production falls back to
    // NODE_ENV, which disagrees with what lib/actions/auth.ts computes →
    // redirect loop (see references/auth-flows.md in the skill).
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
    // Guarded as a group in lib/auth.ts (only registers the Keycloak plugin
    // when all three are present) so SKIP_ENV_VALIDATION=1 builds don't crash.
    KEYCLOAK_ISSUER: z.string().optional(),
    KEYCLOAK_CLIENT_ID: z.string().optional(),
    KEYCLOAK_CLIENT_SECRET: z.string().optional(),

    // ── ugt-nextjs-mail-setup: SMTP relay for workflow email (2026-09-02) ──
    // All optional so a build without a relay still passes — lib/email.ts's
    // sendMail() is the real runtime guard (throws if SMTP_HOST is missing).
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().default('25'),
    SMTP_SECURE: z.enum(['true', 'false']).default('false'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    // ── ugt-nextjs-upload-setup: file storage + virus scanning (2026-09-02) ─
    // Uploads go through a Route Handler (src/app/api/files/route.ts), never
    // a Server Action — see .claude/rules/ugt-nextjs-upload.md.
    STORAGE_ROOT: z.string().default('/app/storage'),
    // 25 MB per file — matches EmployeeSubmitForm.tsx's existing attachment
    // UI copy ("ขนาดไม่เกิน 25 MB") and the skill's own default; see
    // docs/project-context/decisions.md for the reverse-proxy caveat (raise
    // its body-size limit to match, if one fronts this app in production).
    UPLOAD_MAX_BYTES: z.string().default('26214400'),
    // clamd, reachable on the compose network once ugt-nextjs-cicd-setup adds
    // the clamav service (deferred — see docs/admin-handoff.md §4 and
    // .claude/state/handoff.md). The app fails closed: unreachable = refused
    // upload, never accepted unscanned.
    CLAMAV_HOST: z.string().default('clamav'),
    CLAMAV_PORT: z.string().default('3310'),
    CLAMAV_TIMEOUT_MS: z.string().default('30000'),

    // Node.js built-ins
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },

  /**
   * Client-side environment variables — exposed to the browser.
   * Must be prefixed with NEXT_PUBLIC_.
   */
  client: {
    // basePath: /ugt-voice-platform (prod) · /ugt-voice-platform-dev (dev) on
    // https://ugtweb.ube.co.th, empty locally (decisions.md 2026-10-09). Kept
    // here (defaulting to '') rather than hardcoded so the basePath
    // is a build arg per branch, not a code change.
    NEXT_PUBLIC_BASE_PATH: z.string().default(''),
    NEXT_PUBLIC_APP_NAME: z.string().optional(),
  },

  /**
   * Explicit runtimeEnv mapping required by @t3-oss/env-nextjs.
   * Server vars are read via process.env; client vars must be listed
   * individually so Next.js can statically inline them at build time.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SHADOW_DATABASE_URL: process.env.SHADOW_DATABASE_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    APP_URL: process.env.APP_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    STORAGE_ROOT: process.env.STORAGE_ROOT,
    UPLOAD_MAX_BYTES: process.env.UPLOAD_MAX_BYTES,
    CLAMAV_HOST: process.env.CLAMAV_HOST,
    CLAMAV_PORT: process.env.CLAMAV_PORT,
    CLAMAV_TIMEOUT_MS: process.env.CLAMAV_TIMEOUT_MS,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },

  /**
   * Skip validation in CI or when explicitly requested.
   * Useful for builds that don't have all env vars available (e.g. frontend-only CI).
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
