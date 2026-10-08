import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { analyzeWithHeuristics } from '@/services/categoryHeuristics';

function post(payload: unknown) {
  return POST(
    new NextRequest('http://localhost/api/ai/suggest-category', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  );
}

// No GEMINI_API_KEY in the test env → the route serves the keyword heuristics.
describe('POST /api/ai/suggest-category (fallback path, no GEMINI_API_KEY)', () => {
  it.each([
    ['หัวหน้าคุกคามและข่มขู่ลูกน้อง', 'Harassment', 'High'],
    ['พบการทุจริตและรับสินบนในแผนกจัดซื้อ', 'Fraud', 'Critical'],
    ['มีการเปิดเผยข้อมูลภายในบริษัท', 'Ethics', 'High'],
    ['ละเมิด PDPA ของลูกค้า', 'Compliance', 'Medium'],
    ['มีการปลอมผล QC ก่อนส่งสินค้า', 'Quality', 'Medium'],
    ['ขอปรับโครงสร้างโบนัสประจำปี', 'HR', 'Medium'],
  ])('classifies "%s" as %s', async (title, category, urgency) => {
    const response = await post({ title, description: '' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestedCategory).toBe(category);
    expect(body.suggestedUrgency).toBe(urgency);
    expect(Array.isArray(body.keywords)).toBe(true);
  });

  it('survives a non-JSON body', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/ai/suggest-category', { method: 'POST', body: 'x' })
    );
    expect((await response.json()).suggestedCategory).toBe('HR');
  });
});

describe('analyzeWithHeuristics', () => {
  it('lets the earlier fraud rule win over later harassment keywords', () => {
    expect(analyzeWithHeuristics('ทุจริต', 'และสิทธิมนุษยชน').suggestedCategory).toBe('Fraud');
  });

  it('does not leak the internal terms list', () => {
    expect(analyzeWithHeuristics('fraud')).not.toHaveProperty('terms');
  });
});
