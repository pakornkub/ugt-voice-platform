import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

function getGeminiClient(): GoogleGenAI | null {
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

export async function POST(request: NextRequest) {
  try {
    const { title, description, category } = await request.json();
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback heuristics if API key is not yet set
      return NextResponse.json({
        suggestedCategory: category || 'HR',
        urgencyScore: 'Medium',
        sentiment: 'Concerned',
        riskLevel: 'Moderate',
        suggestedDepartment: 'HR Operations',
        keyKeywords: ['Employee Relations', 'Process'],
        summary: title || 'Grievance submitted',
        recommendedActions: [
          'Acknowledge within 24 hours',
          'Assign designated officer',
          'Schedule initial inquiry',
        ],
      });
    }

    const prompt = `You are an enterprise Employee Relations & Whistleblower Triage AI Expert for a Thai corporate organization.
Analyze the following employee complaint/feedback:
Title: "${title || ''}"
Category chosen: "${category || 'Not specified'}"
Description: "${description || ''}"

Return a valid JSON object with the following fields:
{
  "suggestedCategory": "HR" | "IT" | "Safety" | "Compliance" | "Ethics" | "Harassment" | "Fraud" | "Quality" | "Environment",
  "urgencyScore": "Low" | "Medium" | "High" | "Critical",
  "sentiment": "Neutral" | "Frustrated" | "Concerned" | "Urgent" | "Constructive",
  "riskLevel": "Low" | "Moderate" | "High" | "Severe",
  "suggestedDepartment": "string in Thai or English (e.g. แผนกบุคคล (HR), แผนกไอที (IT), ฝ่ายความปลอดภัย (Safety & EHS), ฝ่ายกำกับการปฏิบัติตามกฎเกณฑ์ (Compliance), ฝ่ายตรวจสอบภายใน (Internal Audit))",
  "keyKeywords": ["array of 2-4 keywords"],
  "summary": "1-sentence executive summary in Thai",
  "recommendedActions": ["array of 3 specific standard operating procedure triage steps in Thai"],
  "isDirectExecutiveWorthy": boolean (true if severe fraud, executive harassment, gross safety violation, or systemic ethics breach)
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text || '{}');
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Analysis Error:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to analyze grievance', details, fallback: true },
      { status: 500 }
    );
  }
}
