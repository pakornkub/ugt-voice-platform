import { describe, expect, it, vi } from 'vitest';
import type { GoogleGenAI } from '@google/genai';
import { generateGeminiContentWithFallback } from './gemini';

function fakeAi(generateContent: ReturnType<typeof vi.fn>) {
  return { models: { generateContent } } as unknown as GoogleGenAI;
}

describe('generateGeminiContentWithFallback', () => {
  it('falls through to the next model on 503 / 429 and returns the first good response', async () => {
    const generateContent = vi
      .fn()
      .mockRejectedValueOnce({ status: 503, message: 'high demand' })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({ text: '{"ok":true}' });

    const response = await generateGeminiContentWithFallback(fakeAi(generateContent), 'prompt');

    expect(response.text).toBe('{"ok":true}');
    expect(generateContent).toHaveBeenCalledTimes(3);
    expect(generateContent.mock.calls.map((c) => c[0].model)).toEqual([
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
    ]);
  });

  it('rethrows non-transient errors immediately', async () => {
    const generateContent = vi.fn().mockRejectedValue(new Error('invalid api key'));

    await expect(generateGeminiContentWithFallback(fakeAi(generateContent), 'p')).rejects.toThrow(
      'invalid api key'
    );
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('throws when every model is exhausted', async () => {
    const generateContent = vi.fn().mockRejectedValue({ status: 503 });

    await expect(
      generateGeminiContentWithFallback(fakeAi(generateContent), 'p')
    ).rejects.toMatchObject({ status: 503 });
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it('throws a clear error when models answer with empty text', async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: '' });

    await expect(generateGeminiContentWithFallback(fakeAi(generateContent), 'p')).rejects.toThrow(
      'empty response'
    );
  });
});
