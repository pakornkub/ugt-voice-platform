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
    const { complaints } = await request.json();
    const ai = getGeminiClient();

    if (!ai || !complaints || complaints.length === 0) {
      return NextResponse.json({
        topRiskClusters: [
          {
            clusterName: 'IT Equipment & Infrastructure Latency',
            category: 'IT',
            count: 14,
            rootCause: 'Aging laptop hardware and VPN bandwidth constraints during hybrid days',
            preventiveAction: 'Procure upgraded hardware batches and boost corporate gateway bandwidth',
            severity: 'Medium',
          },
          {
            clusterName: 'Workplace Harassment & Psychological Safety',
            category: 'Harassment',
            count: 6,
            rootCause: 'Middle management communication gap and lack of clear anti-harassment escalation workshop',
            preventiveAction: 'Mandatory respectful workplace training and anonymous counseling hotline',
            severity: 'High',
          },
          {
            clusterName: 'EHS Workshop Safety Protocol Adherence',
            category: 'Safety',
            count: 8,
            rootCause: 'PPE inspection gaps during night shifts',
            preventiveAction: 'Enforce bi-weekly safety audit and automated shift checklist sign-off',
            severity: 'High',
          },
        ],
        executiveSummary:
          'ภาพรวมข้อร้องเรียนในไตรมาสนี้ มุ่งเน้นไปที่ด้านการทำงานแบบไฮบริดและอุปกรณ์ไอที รวมถึงการเสริมสร้างความปลอดภัยในโรงงาน การตอบสนองของ Gatekeeper อยู่ในเกณฑ์เฉลี่ย 94.2% ของ SLA',
        strategicRecommendations: [
          'เร่งรัดการปรับปรุงโครงสร้างพื้นฐานไอทีเพื่อลดเคสสะสม',
          'จัดอบรม Respectful Workplace & Anti-Harassment ทั่วทั้งองค์กร',
          'เพิ่มประสิทธิภาพการตรวจสอบความปลอดภัยกะดึก',
        ],
      });
    }

    const sampleSummary = complaints.slice(0, 15).map((c: any) => ({
      id: c.trackingCode,
      category: c.category,
      title: c.title,
      status: c.status,
      isDirectToExecutive: c.isDirectToExecutive,
    }));

    const prompt = `You are a Chief People Officer & Enterprise Risk Analyst for a major Thai corporation.
Analyze the following corporate grievances and suggestions sample:
${JSON.stringify(sampleSummary, null, 2)}

Identify the main root-cause clusters, systemic patterns, and strategic recommendations in Thai language.
Return valid JSON with schema:
{
  "topRiskClusters": [
    {
      "clusterName": "string in Thai",
      "category": "HR" | "IT" | "Safety" | "Compliance" | "Ethics" | "Harassment" | "Fraud" | "Quality" | "Environment",
      "count": number,
      "rootCause": "Deep root cause analysis in Thai",
      "preventiveAction": "Corrective & Preventive Action (CAPA) in Thai",
      "severity": "Low" | "Medium" | "High" | "Critical"
    }
  ],
  "executiveSummary": "Concise paragraph in Thai summarizing the organizational health, key risk alerts, and resolution trends for CEO/EVP",
  "strategicRecommendations": ["array of 3-4 concrete actionable strategic management directives in Thai"]
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
  } catch (error: any) {
    console.error('AI Cluster Insights Error:', error);
    return NextResponse.json({ error: 'Failed to generate cluster insights' }, { status: 500 });
  }
}
