import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiContentWithFallback, getGeminiClient } from '@/lib/gemini';

const DEFAULT_COPY = {
  th: {
    suggestedDepartment: 'ฝ่ายบริหารทรัพยากรบุคคล (HR)',
    recommendedActions: [
      'รับเรื่องและตรวจสอบเบื้องต้นภายใน 24 ชม.',
      'มอบหมายเจ้าหน้าที่รับผิดชอบตามสายงาน',
      'นัดหมายสอบข้อเท็จจริง',
    ],
  },
  en: {
    suggestedDepartment: 'Human Resources (HR) Department',
    recommendedActions: [
      'Acknowledge the case and run an initial review within 24 hours',
      'Assign a responsible officer by reporting line',
      'Schedule a fact-finding interview',
    ],
  },
};

const DEPARTMENT_HINT = {
  th: 'string in Thai or English (e.g. ฝ่ายบริหารทรัพยากรบุคคล (HR), ฝ่ายกำกับการปฏิบัติตามกฎเกณฑ์ (Compliance), ฝ่ายตรวจสอบภายในและบรรษัทภิบาล (Ethics & Fraud), ฝ่ายควบคุมคุณภาพ (Quality))',
  en: 'string in English (e.g. Human Resources (HR), Compliance, Internal Audit & Corporate Governance (Ethics & Fraud), Quality Control (Quality))',
};

const LANGUAGE_NAME = { th: 'Thai', en: 'English' };

// AI Smart Triage & Category / Risk Assessment.
// Always answers 200 — on a missing key or any Gemini error the client gets
// the standard triage default (upstream behaviour) instead of a 500.
// Optional `lang` ('th' | 'en', default 'th') picks the language of the AI's answer and of the fallback.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { title, description, category } = body ?? {};
  const lang = body?.lang === 'en' ? 'en' : 'th';
  const language = LANGUAGE_NAME[lang];

  const defaultTriage = {
    suggestedCategory: category || 'HR',
    urgencyScore: 'Medium',
    sentiment: 'Concerned',
    riskLevel: 'Moderate',
    suggestedDepartment: DEFAULT_COPY[lang].suggestedDepartment,
    keyKeywords: ['Employee Relations', 'Triage'],
    summary: title || 'Grievance submitted',
    recommendedActions: DEFAULT_COPY[lang].recommendedActions,
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
  "suggestedDepartment": "${DEPARTMENT_HINT[lang]}",
  "keyKeywords": ["array of 2-4 keywords"],
  "summary": "1-sentence executive summary in ${language}",
  "recommendedActions": ["array of 3 specific standard operating procedure triage steps in ${language}"],
  "isDirectExecutiveWorthy": boolean (true if severe fraud, executive harassment, or systemic ethics breach)
}`;

    const response = await generateGeminiContentWithFallback(ai, prompt, {
      responseMimeType: 'application/json',
    });

    const result = JSON.parse(response.text || '{}');
    return NextResponse.json(result);
  } catch (error) {
    console.warn(
      // NOSONAR typescript:S106
      'AI Analysis unavailable, returning standard triage fallback:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(defaultTriage);
  }
}
