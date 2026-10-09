import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const THAI = /[฀-๿]/;

function post(payload: unknown) {
  return POST(
    new NextRequest('http://localhost/api/ai/cluster-insights', {
      method: 'POST',
      body: typeof payload === 'string' ? payload : JSON.stringify(payload),
    })
  );
}

// No GEMINI_API_KEY in the test env → the route serves its default clusters.
describe('POST /api/ai/cluster-insights (fallback path, no GEMINI_API_KEY)', () => {
  it('returns the default Thai clusters by default', async () => {
    const response = await post({ complaints: [] });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.topRiskClusters).toHaveLength(3);
    expect(body.topRiskClusters[0]).toMatchObject({ category: 'Quality', count: 14 });
    expect(body.executiveSummary).toMatch(THAI);
    expect(body.strategicRecommendations).toHaveLength(3);
  });

  it('returns English clusters for lang=en with the same shape and numbers', async () => {
    const th = await (await post({ complaints: [] })).json();
    const en = await (await post({ complaints: [], lang: 'en' })).json();

    expect(JSON.stringify(en)).not.toMatch(THAI);
    expect(
      en.topRiskClusters.map((c: { category: string; count: number }) => [c.category, c.count])
    ).toEqual(
      th.topRiskClusters.map((c: { category: string; count: number }) => [c.category, c.count])
    );
    expect(en.strategicRecommendations).toHaveLength(th.strategicRecommendations.length);
  });

  it('serves the matching language when the body is not JSON or lang is unknown', async () => {
    const bad = await (await post('not json')).json();
    expect(bad.executiveSummary).toMatch(THAI);

    const unknown = await (await post({ complaints: [], lang: 'xx' })).json();
    expect(unknown.executiveSummary).toMatch(THAI);
  });
});
