// lib/auth-client.ts — Better Auth React client (ugt-nextjs-auth-setup, 2026-09-02).
import { createAuthClient } from 'better-auth/react';

// Do NOT pass baseURL — Better Auth's withPath() would treat a non-root
// pathname (e.g. under a future basePath) as already-final and never append
// the auth path. Reading NEXT_PUBLIC_BASE_PATH directly (not via `@/lib/env`)
// because a t3-env createEnv() wrapper returns '' for NEXT_PUBLIC_* in the
// client bundle under Turbopack — process.env inlining is always reliable.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const authClient = createAuthClient({
  basePath: `${BASE_PATH}/api/auth`,
});

export const { signIn, signOut, useSession } = authClient;
