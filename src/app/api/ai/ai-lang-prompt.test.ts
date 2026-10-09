import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// With a (fake) Gemini client the three AI routes must ask for the language the UI is in.
const generate = vi.hoisted(() => vi.fn());
vi.mock('@/lib/gemini', () => ({
  getGeminiClient: () => ({}),
  generateGeminiContentWithFallback: generate,
}));

import { POST as analyze } from './analyze-complaint/route';
import { POST as cluster } from './cluster-insights/route';
import { POST as suggest } from './suggest-category/route';

const call = (route: typeof analyze, payload: unknown) =>
  route(
    new NextRequest('http://localhost/api/ai/x', { method: 'POST', body: JSON.stringify(payload) })
  );

const promptOf = () => generate.mock.calls[0][1] as string;

beforeEach(() => {
  generate.mockReset();
  generate.mockResolvedValue({
    text: JSON.stringify({ suggestedCategory: 'HR', topRiskClusters: [] }),
  });
});

describe('AI routes ask Gemini for the requested language', () => {
  it.each([
    ['analyze-complaint', analyze],
    ['suggest-category', suggest],
    ['cluster-insights', cluster],
  ] as const)('%s: lang=en → English prompt', async (_name, route) => {
    await call(route, {
      title: 't',
      description: 'd',
      complaints: [{ trackingCode: 'TK-1' }],
      lang: 'en',
    });

    expect(promptOf()).toContain('in English');
    expect(promptOf()).not.toContain('in Thai');
  });

  it.each([
    ['analyze-complaint', analyze],
    ['suggest-category', suggest],
    ['cluster-insights', cluster],
  ] as const)('%s: no lang → unchanged Thai prompt', async (_name, route) => {
    await call(route, { title: 't', description: 'd', complaints: [{ trackingCode: 'TK-1' }] });

    expect(promptOf()).toContain('in Thai');
  });

  it('passes the Gemini answer through untouched', async () => {
    const response = await call(suggest, { title: 't', lang: 'en' });
    expect(await response.json()).toMatchObject({ suggestedCategory: 'HR' });
  });

  it('serves the English heuristics when Gemini returns no category', async () => {
    generate.mockResolvedValue({ text: '{}' });
    const body = await (await call(suggest, { title: 'ทุจริต', lang: 'en' })).json();

    expect(body.suggestedCategory).toBe('Fraud');
    expect(body.keywords).toEqual(['Corruption', 'Finance', 'Audit']);
  });

  it('serves the English fallbacks when Gemini throws', async () => {
    generate.mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const analysis = await (await call(analyze, { title: 'x', lang: 'en' })).json();
    expect(analysis.suggestedDepartment).toBe('Human Resources (HR) Department');

    const clusters = await (
      await call(cluster, { complaints: [{ trackingCode: 'TK-1' }], lang: 'en' })
    ).json();
    expect(clusters.executiveSummary).toMatch(/^This quarter/);
  });
});
