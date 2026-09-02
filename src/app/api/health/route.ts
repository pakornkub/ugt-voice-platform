import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Employee Voice & Grievance API',
    timestamp: new Date().toISOString(),
    aiAvailable: !!process.env.GEMINI_API_KEY,
  });
}
