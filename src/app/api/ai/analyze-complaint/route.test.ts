import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Smoke test for the AI triage endpoint's graceful-fallback path. No live
// GEMINI_API_KEY is set in the test environment (see vitest.config.ts's
// SKIP_ENV_VALIDATION), so this exercises the static-heuristics branch in
// route.ts without calling the real Gemini API — proving the pipeline (and
// this route) work without needing any secret.
describe('POST /api/ai/analyze-complaint (fallback path, no GEMINI_API_KEY)', () => {
  it('returns the default triage data instead of calling Gemini', async () => {
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
      suggestedDepartment: 'ฝ่ายบริหารทรัพยากรบุคคล (HR)',
      isDirectExecutiveWorthy: false,
    });
    expect(Array.isArray(body.keyKeywords)).toBe(true);
    expect(Array.isArray(body.recommendedActions)).toBe(true);
  });

  it('echoes the submitted category and title', async () => {
    const request = new NextRequest('http://localhost/api/ai/analyze-complaint', {
      method: 'POST',
      body: JSON.stringify({
        title: 'ข้อเสนอแนะเรื่องคุณภาพ',
        description: '',
        category: 'Quality',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(body.suggestedCategory).toBe('Quality');
    expect(body.summary).toBe('ข้อเสนอแนะเรื่องคุณภาพ');
  });

  it('still answers 200 with defaults when the body is not JSON', async () => {
    const request = new NextRequest('http://localhost/api/ai/analyze-complaint', {
      method: 'POST',
      body: 'not json',
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect((await response.json()).suggestedCategory).toBe('HR');
  });

  it('answers the fallback in English for lang=en and keeps the submitted data', async () => {
    const request = new NextRequest('http://localhost/api/ai/analyze-complaint', {
      method: 'POST',
      body: JSON.stringify({ title: 'Late salary', description: '', category: 'HR', lang: 'en' }),
    });

    const body = await (await POST(request)).json();

    expect(body).toMatchObject({
      suggestedCategory: 'HR',
      summary: 'Late salary',
      suggestedDepartment: 'Human Resources (HR) Department',
      urgencyScore: 'Medium',
    });
    expect(body.recommendedActions).toHaveLength(3);
    expect(JSON.stringify(body)).not.toMatch(/[\u0E00-\u0E7F]/);
  });

  it('falls back to Thai for an unknown lang', async () => {
    const request = new NextRequest('http://localhost/api/ai/analyze-complaint', {
      method: 'POST',
      body: JSON.stringify({ title: 'x', lang: 'de' }),
    });

    expect((await (await POST(request)).json()).suggestedDepartment).toBe(
      'ฝ่ายบริหารทรัพยากรบุคคล (HR)'
    );
  });
});
