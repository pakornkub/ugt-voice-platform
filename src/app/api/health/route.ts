import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Employee Voice & Grievance API',
    timestamp: new Date().toISOString(),
    aiAvailable: !!env.GEMINI_API_KEY,
  });
}
