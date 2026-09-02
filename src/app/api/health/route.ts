import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { pingScanner } from '@/lib/virus-scan';

// Force dynamic — otherwise Next.js prerenders it static and the status
// freezes at its build-time value (ugt-nextjs-cicd-setup, 2026-09-02).
export const dynamic = 'force-dynamic';

export async function GET() {
  // ugt-nextjs-cicd-setup, 2026-09-02: real DB check, added on top of the
  // fields ugt-nextjs-upload-setup already shipped here (aiAvailable/
  // scanAvailable) rather than replacing this route with the skill's generic
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

  // pingScanner() has its own 3s timeout — a dead clamd must not hang this
  // endpoint. Informational only (does not flip `status`/the HTTP code): the
  // upload path already fails closed on its own when the scanner is down, and
  // docker-compose's `depends_on: clamav: condition: service_healthy` means
  // clamav is already healthy before this container is even started.
  const scanAvailable = await pingScanner();

  return NextResponse.json(
    {
      status: ok ? 'healthy' : 'degraded',
      service: 'Employee Voice & Grievance API',
      timestamp: new Date().toISOString(),
      // Never include version / framework / commit sha — this endpoint is
      // public, and that information tells outsiders which exploits to try.
      checks,
      aiAvailable: !!env.GEMINI_API_KEY,
      scanAvailable,
    },
    { status: ok ? 200 : 503 }
  );
}
