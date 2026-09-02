import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Smoke test for the AI triage endpoint's graceful-fallback path. No live
// GEMINI_API_KEY is set in the test environment (see vitest.config.ts's
// SKIP_ENV_VALIDATION), so this exercises the static-heuristics branch in
// route.ts without calling the real Gemini API — proving the pipeline (and
// this route) work without needing any secret.
describe('POST /api/ai/analyze-complaint (fallback path, no GEMINI_API_KEY)', () => {
  it('returns static heuristic triage data instead of calling Gemini', async () => {
    const request = new NextRequest('http://localhost/api/ai/analyze-complaint', {
      method: 'POST',
      body: JSON.stringify({
        title: 'ปัญหาการจ่ายเงินเดือนล่าช้า',
        description: 'เงินเดือนเข้าช้ากว่ากำหนด 3 วันติดต่อกัน',
        category: 'HR',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      suggestedCategory: 'HR',
      urgencyScore: 'Medium',
      sentiment: 'Concerned',
      riskLevel: 'Moderate',
      suggestedDepartment: 'HR Operations',
    });
    expect(Array.isArray(body.keyKeywords)).toBe(true);
    expect(Array.isArray(body.recommendedActions)).toBe(true);
  });

  it('falls back to the submitted category when none is heuristically overridden', async () => {
    const request = new NextRequest('http://localhost/api/ai/analyze-complaint', {
      method: 'POST',
      body: JSON.stringify({
        title: 'ข้อเสนอแนะเรื่องความปลอดภัย',
        description: '',
        category: 'Safety',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(body.suggestedCategory).toBe('Safety');
    expect(body.summary).toBe('ข้อเสนอแนะเรื่องความปลอดภัย');
  });
});
