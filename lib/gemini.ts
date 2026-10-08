import { GoogleGenAI } from '@google/genai';
import { env } from '@/lib/env';

// Lazy initialize Gemini client safely (null when no API key is configured)
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

interface GeminiErrorShape {
  status?: number;
  code?: number;
  statusCode?: number;
  message?: string;
}

function isTransientGeminiError(err: unknown): boolean {
  const e = (err ?? {}) as GeminiErrorShape;
  const status = e.status || e.code || e.statusCode;
  const msg = (e.message || '').toLowerCase();
  return (
    status === 503 ||
    status === 429 ||
    msg.includes('503') ||
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('resource has been exhausted') ||
    msg.includes('spikes in demand')
  );
}

// Resilient Gemini invocation with automatic fallback across models when
// experiencing 503/429 high-demand spikes (ported from upstream server.ts).
export async function generateGeminiContentWithFallback(
  ai: GoogleGenAI,
  contents: string,
  config?: Record<string, unknown>
) {
  let lastError: unknown = null;

  for (const model of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({ model, contents, config });
      if (response?.text) {
        return response;
      }
    } catch (err) {
      lastError = err;
      if (isTransientGeminiError(err)) {
        console.warn(`[Gemini Temporary High Demand on ${model}] Switching to fallback model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error('Gemini returned an empty response');
}
