import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeGrievanceWithAI,
  getClusterInsightsWithAI,
  suggestCategoryWithAI,
} from './aiClient';

const THAI = /[\u0E00-\u0E7F]/;

// Network down → the client fallbacks answer, in the language that was asked for.
describe('AI client fallbacks', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('suggestCategoryWithAI: Thai by default, English on request', async () => {
    const th = await suggestCategoryWithAI({ title: 'พบการทุจริต', description: '' });
    const en = await suggestCategoryWithAI({ title: 'พบการทุจริต', description: '', lang: 'en' });

    expect(th.reasoning).toMatch(THAI);
    expect(en.reasoning).not.toMatch(THAI);
    expect(en.suggestedCategory).toBe(th.suggestedCategory);
    expect(en.keywords).toEqual(['Corruption', 'Fraud', 'Bribery']);
  });

  it('suggestCategoryWithAI sends the language to the API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: 1 }) } as Response);

    await suggestCategoryWithAI({ title: 't', description: 'd', lang: 'en' });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(init!.body as string)).toMatchObject({ lang: 'en' });
  });

  it('analyzeGrievanceWithAI: localised summary, actions and department', async () => {
    const th = await analyzeGrievanceWithAI({ title: '', description: '', category: 'Fraud' });
    const en = await analyzeGrievanceWithAI({
      title: '',
      description: '',
      category: 'Fraud',
      lang: 'en',
    });

    expect(th.summary).toBe('ข้อร้องเรียนจากพนักงาน');
    expect(th.suggestedDepartment).toContain('ฝ่ายตรวจสอบภายใน');
    expect(en.summary).toBe('Employee grievance');
    expect(en.suggestedDepartment).toBe('Internal Audit & Forensic Investigation');
    expect(JSON.stringify(en)).not.toMatch(THAI);
    expect(en.recommendedActions).toHaveLength(3);
  });

  it('analyzeGrievanceWithAI keeps the submitted title and the default department', async () => {
    const en = await analyzeGrievanceWithAI({
      title: 'My title',
      description: '',
      category: 'Unknown',
      lang: 'en',
    });

    expect(en.summary).toBe('My title');
    expect(en.suggestedDepartment).toBe('People & Culture Department');
  });

  it('getClusterInsightsWithAI: Thai by default, English on request', async () => {
    const th = await getClusterInsightsWithAI([]);
    const en = await getClusterInsightsWithAI([], 'en');

    expect(th.executiveSummary).toMatch(THAI);
    expect(JSON.stringify(en)).not.toMatch(THAI);
    expect(en.topRiskClusters).toHaveLength(th.topRiskClusters.length);
    expect(en.strategicRecommendations).toHaveLength(th.strategicRecommendations.length);
  });
});
