// app/api/auth/[...all]/route.ts — Better Auth catch-all handler
// (ugt-nextjs-auth-setup, 2026-09-02).
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
