import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { pingScanner } from '@/lib/virus-scan';

export async function GET() {
  // pingScanner() has its own 3s timeout — a dead clamd must not hang this
  // endpoint (ugt-nextjs-upload-setup, 2026-09-02). The clamav service itself
  // isn't in docker-compose yet (deferred until after ugt-nextjs-cicd-setup —
  // see docs/admin-handoff.md §4), so this reports false until then.
  const scanAvailable = await pingScanner();

  return NextResponse.json({
    status: 'ok',
    service: 'Employee Voice & Grievance API',
    timestamp: new Date().toISOString(),
    aiAvailable: !!env.GEMINI_API_KEY,
    scanAvailable,
  });
}
