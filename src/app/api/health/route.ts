import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

// Force dynamic — otherwise Next.js prerenders it static and the status
// freezes at its build-time value (ugt-nextjs-cicd-setup, 2026-09-02).
export const dynamic = 'force-dynamic';

export async function GET() {
  // ugt-nextjs-cicd-setup, 2026-09-02: real DB check, added on top of the
  // field ugt-nextjs-upload-setup already shipped here (aiAvailable) rather than replacing this route with the skill's generic
  // asset — see docs/project-context/decisions.md. `status`/`checks` +
  // 200/503 is the org-wide contract every ugt-nextjs-* project's Dockerfile
  // HEALTHCHECK and both compose healthchecks key off; do not rename
  // 'healthy'/'degraded'.
  const checks: Record<string, 'ok' | 'error'> = {};
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }
  const ok = Object.values(checks).every((status) => status === 'ok');

  return NextResponse.json(
    {
      status: ok ? 'healthy' : 'degraded',
      service: 'Employee Voice & Grievance API',
      timestamp: new Date().toISOString(),
      // Never include version / framework / commit sha — this endpoint is
      // public, and that information tells outsiders which exploits to try.
      checks,
      aiAvailable: !!env.GEMINI_API_KEY,
    },
    { status: ok ? 200 : 503 }
  );
}
