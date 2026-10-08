import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiContentWithFallback, getGeminiClient } from '@/lib/gemini';
import { analyzeWithHeuristics } from '@/services/categoryHeuristics';

// AI Smart Category Suggestion & Classification Assistant
export async function POST(request: NextRequest) {
  const { title, description } = await request.json().catch(() => ({}));

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json(analyzeWithHeuristics(title, description));
    }

    const prompt = `You are an enterprise Employee Grievance & Whistleblower AI Assistant for a Thai organization.
Analyze the user's grievance details and recommend the single best matching category out of these 6 categories:
1. "HR" (HR – ทรัพยากรบุคคลและสวัสดิการ: Benefits, compensation, work hours, transfers, evaluation, labor relations)
2. "Compliance" (Compliance – การไม่ปฏิบัติตามกฎหมายและกฎเกณฑ์: Competition Laws, National Security Export Controls, PDPA, external statutory rules)
3. "Ethics" (Ethics – จริยธรรม: Anti-money laundering, insider trading, illicit influence groups, political/social activities, company tangible/intangible assets & trade secrets, disclosure of corporate information, 3rd-party IP infringement, financial reporting, UBE group public communications & internet posting)
4. "Fraud" (Fraud – การทุจริต และการฉ้อโกง: Financial fraud, bribery/corruption, conflicts of interest, excessive gifts/entertainment, embezzlement, document forgery)
5. "Harassment" (Human Right, Harassment – สิทธิมนุษยชน, การล่วงละเมิด: Human rights, sexual harassment, workplace bullying, verbal abuse, discrimination)
6. "Quality" (Quality Impropriety – การตรวจสอบคุณภาพอย่างไม่เหมาะสม: Quality inspection impropriety, falsifying/altering QA/QC test results, bypassing standards, sub-standard release)

Title: "${title || ''}"
Details: "${description || ''}"

Return a valid JSON object:
{
  "suggestedCategory": "HR" | "Compliance" | "Ethics" | "Fraud" | "Harassment" | "Quality",
  "confidence": number (between 75 and 99),
  "reasoning": "Clear 1-2 sentence explanation in Thai explaining why this category is selected",
  "secondaryCategory": "HR" | "Compliance" | "Ethics" | "Fraud" | "Harassment" | "Quality",
  "suggestedUrgency": "Low" | "Medium" | "High" | "Critical",
  "keywords": ["2-3 key terms in Thai found in the input"]
}`;

    const response = await generateGeminiContentWithFallback(ai, prompt, {
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!parsed.suggestedCategory) {
      return NextResponse.json(analyzeWithHeuristics(title, description));
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.warn(
      'AI Category Suggestion service unavailable or experiencing high demand, served rule-based classification:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(analyzeWithHeuristics(title, description));
  }
}
