import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_COMPLAINTS } from '../mockData';
import {
  addRecentSearch,
  clearRecentSearches,
  analyzeGrievanceWithAI,
  getClusterInsightsWithAI,
  getRecentSearches,
  getRiskSeverityBadgeText,
  getStatusBadgeText,
  getUrgencyBadgeText,
  suggestCategoryWithAI,
  getStoredGatekeeperConfigs,
  removeRecentSearch,
} from './api';

const GK_KEY = 'enterprise_grievance_gatekeepers_v3';

beforeEach(() => {
  localStorage.clear();
});

describe('storage migrations (upstream storage-key bump)', () => {
  it('drops the legacy Environment gatekeeper config and keeps exactly 6 categories', () => {
    const stored = getStoredGatekeeperConfigs();
    localStorage.setItem(GK_KEY, JSON.stringify({ ...stored, Environment: stored.HR }));

    expect(Object.keys(getStoredGatekeeperConfigs()).sort()).toEqual(
      ['Compliance', 'Ethics', 'Fraud', 'HR', 'Harassment', 'Quality'].sort()
    );
  });
});

describe('recent searches', () => {
  it('records hits and misses, de-duplicates by query and can remove / clear', () => {
    const ticket = INITIAL_COMPLAINTS[0];
    addRecentSearch(ticket.trackingCode, ticket);
    addRecentSearch('tk-9999-0000');
    addRecentSearch(ticket.trackingCode.toLowerCase(), ticket);

    const items = getRecentSearches();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ found: true, trackingCode: ticket.trackingCode });
    expect(items[1]).toMatchObject({ found: false, trackingCode: 'TK-9999-0000' });

    expect(removeRecentSearch(items[0].id)).toHaveLength(1);
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });
});

describe('badge text helpers', () => {
  it('localise by language', () => {
    expect(getStatusBadgeText('in_progress', 'en')).toBe('In Progress');
    expect(getStatusBadgeText('in_progress', 'th')).toContain('กำลังแก้ไข');
    expect(getUrgencyBadgeText('Critical', 'en')).toBe('🔥 Critical');
    expect(getUrgencyBadgeText('Critical', 'th')).toContain('วิกฤติ');
    expect(getRiskSeverityBadgeText('Severe', 'en')).toBe('Severe Risk');
    expect(getRiskSeverityBadgeText('Severe', 'th')).toContain('วิกฤติรุนแรง');
  });
});

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

describe('recent searches', () => {
  beforeEach(() => localStorage.clear());

  it('removes only the chosen item even when two are added in the same millisecond', async () => {
    const { addRecentSearch, removeRecentSearch, getRecentSearches } = await import('./api');
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    addRecentSearch('TK-AAA-1111', undefined);
    addRecentSearch('TK-BBB-2222', undefined);
    vi.restoreAllMocks();

    const [first, second] = getRecentSearches();
    expect(first.id).not.toBe(second.id);
    removeRecentSearch(getRecentSearches().find((s) => s.query === 'TK-AAA-1111')!.id);
    expect(getRecentSearches().map((s) => s.query)).toEqual(['TK-BBB-2222']);
  });
});
