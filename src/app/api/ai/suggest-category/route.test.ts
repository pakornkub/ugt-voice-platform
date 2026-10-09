import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { analyzeWithClientHeuristics, analyzeWithHeuristics } from '@/services/categoryHeuristics';

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

  it('survives a JSON null body', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/ai/suggest-category', { method: 'POST', body: 'null' })
    );
    expect(response.status).toBe(200);
    expect((await response.json()).suggestedCategory).toBe('HR');
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

  it('recognises server-only keywords that the client list does not', () => {
    expect(analyzeWithHeuristics('พูดจาดูถูกลูกน้อง').suggestedCategory).toBe('Harassment');
    expect(analyzeWithHeuristics('ฮั้วประมูล').suggestedCategory).toBe('Fraud');
  });

  it('client fallback mirrors upstream api.ts (no server-only rules)', () => {
    expect(analyzeWithClientHeuristics('พูดจาดูถูกลูกน้อง').suggestedCategory).toBe('HR');
    expect(analyzeWithClientHeuristics('ฮั้วประมูล').suggestedCategory).toBe('HR');
    expect(analyzeWithClientHeuristics('bullying at work')).toMatchObject({
      suggestedCategory: 'Harassment',
      confidence: 96,
    });
    expect(analyzeWithClientHeuristics('ทุจริต')).toMatchObject({
      suggestedCategory: 'Fraud',
      secondaryCategory: 'Ethics',
      keywords: ['การทุจริต', 'การฉ้อโกง', 'สินบน'],
    });
  });

  it('does not leak the internal terms list', () => {
    expect(analyzeWithHeuristics('fraud')).not.toHaveProperty('terms');
  });
});

const THAI = /[\u0E00-\u0E7F]/;

describe('POST /api/ai/suggest-category with lang=en (fallback path)', () => {
  it('keeps the classification but answers in English', async () => {
    const response = await post({ title: 'พบการทุจริตและรับสินบน', description: '', lang: 'en' });
    const body = await response.json();

    expect(body).toMatchObject({
      suggestedCategory: 'Fraud',
      suggestedUrgency: 'Critical',
      confidence: 96,
    });
    expect(body.reasoning).not.toMatch(THAI);
    expect(body.keywords).toEqual(['Corruption', 'Finance', 'Audit']);
  });

  it('stays Thai without lang or with an unknown lang', async () => {
    for (const lang of [undefined, 'th', 'fr']) {
      const body = await (await post({ title: 'พบการทุจริต', description: '', lang })).json();
      expect(body.reasoning).toMatch(THAI);
      expect(body.keywords).toEqual(['ทุจริต', 'การเงิน', 'การตรวจสอบ']);
    }
  });
});

describe('heuristics in English', () => {
  it.each([
    ['คุกคามลูกน้อง', 'Harassment'],
    ['ฮั้วประมูล', 'Fraud'],
    ['ทุจริต', 'Fraud'],
    ['จริยธรรม', 'Ethics'],
    ['pdpa', 'Compliance'],
    ['ใบรับรองคุณภาพ', 'Quality'],
    ['ขอปรับโบนัส', 'HR'],
  ])('translates reasoning and keywords for "%s" (%s)', (title, category) => {
    const th = analyzeWithHeuristics(title);
    const en = analyzeWithHeuristics(title, '', 'en');

    expect(en.suggestedCategory).toBe(category);
    expect(en).toMatchObject({
      suggestedCategory: th.suggestedCategory,
      confidence: th.confidence,
      secondaryCategory: th.secondaryCategory,
      suggestedUrgency: th.suggestedUrgency,
    });
    expect(en.reasoning).not.toMatch(THAI);
    expect(en.keywords.length).toBe(th.keywords.length);
    for (const keyword of en.keywords) expect(keyword).not.toMatch(THAI);
    expect(en).not.toHaveProperty('terms');
    expect(en).not.toHaveProperty('en');
  });

  it('does not mutate the Thai defaults when English is requested', () => {
    analyzeWithHeuristics('ทุจริต', '', 'en');
    analyzeWithClientHeuristics('อื่น ๆ', '', 'en');

    expect(analyzeWithHeuristics('ทุจริต').keywords).toEqual(['ทุจริต', 'การเงิน', 'การตรวจสอบ']);
    expect(analyzeWithClientHeuristics('อื่น ๆ').keywords).toEqual([
      'ทรัพยากรบุคคล',
      'สวัสดิการ',
      'สิทธิประโยชน์',
    ]);
  });

  it('client fallback in English keeps the client-only rule set', () => {
    expect(analyzeWithClientHeuristics('ฮั้วประมูล', '', 'en')).toMatchObject({
      suggestedCategory: 'HR',
      keywords: ['Human Resources', 'Benefits', 'Entitlements'],
    });
  });
});
