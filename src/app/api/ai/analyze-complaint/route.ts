import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiContentWithFallback, getGeminiClient } from '@/lib/gemini';

// AI Smart Triage & Category / Risk Assessment.
// Always answers 200 — on a missing key or any Gemini error the client gets
// the standard triage default (upstream behaviour) instead of a 500.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { title, description, category } = body ?? {};

  const defaultTriage = {
    suggestedCategory: category || 'HR',
    urgencyScore: 'Medium',
    sentiment: 'Concerned',
    riskLevel: 'Moderate',
    suggestedDepartment: 'ฝ่ายบริหารทรัพยากรบุคคล (HR)',
    keyKeywords: ['Employee Relations', 'Triage'],
    summary: title || 'Grievance submitted',
    recommendedActions: [
      'รับเรื่องและตรวจสอบเบื้องต้นภายใน 24 ชม.',
      'มอบหมายเจ้าหน้าที่รับผิดชอบตามสายงาน',
      'นัดหมายสอบข้อเท็จจริง',
    ],
    isDirectExecutiveWorthy: false,
  };

  try {
    const ai = getGeminiClient();

    if (!ai) {
      return NextResponse.json(defaultTriage);
    }

    const prompt = `You are an enterprise Employee Relations & Whistleblower Triage AI Expert for a Thai corporate organization.
Analyze the following employee complaint/feedback:
Title: "${title || ''}"
Category chosen: "${category || 'Not specified'}"
Description: "${description || ''}"

Return a valid JSON object with the following fields:
{
  "suggestedCategory": "HR" | "Compliance" | "Ethics" | "Fraud" | "Harassment" | "Quality",
  "urgencyScore": "Low" | "Medium" | "High" | "Critical",
  "sentiment": "Neutral" | "Frustrated" | "Concerned" | "Urgent" | "Constructive",
  "riskLevel": "Low" | "Moderate" | "High" | "Severe",
  "suggestedDepartment": "string in Thai or English (e.g. ฝ่ายบริหารทรัพยากรบุคคล (HR), ฝ่ายกำกับการปฏิบัติตามกฎเกณฑ์ (Compliance), ฝ่ายตรวจสอบภายในและบรรษัทภิบาล (Ethics & Fraud), ฝ่ายควบคุมคุณภาพ (Quality))",
  "keyKeywords": ["array of 2-4 keywords"],
  "summary": "1-sentence executive summary in Thai",
  "recommendedActions": ["array of 3 specific standard operating procedure triage steps in Thai"],
  "isDirectExecutiveWorthy": boolean (true if severe fraud, executive harassment, or systemic ethics breach)
}`;

    const response = await generateGeminiContentWithFallback(ai, prompt, {
      responseMimeType: 'application/json',
    });

    const result = JSON.parse(response.text || '{}');
    return NextResponse.json(result);
  } catch (error) {
    console.warn(
      'AI Analysis unavailable, returning standard triage fallback:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(defaultTriage);
  }
}
