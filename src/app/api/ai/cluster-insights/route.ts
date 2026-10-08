import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiContentWithFallback, getGeminiClient } from '@/lib/gemini';
import type { AiClusterInsights, ComplaintTicket } from '@/types';

const defaultClusters: AiClusterInsights = {
  topRiskClusters: [
    {
      clusterName: 'Quality Assurance & Batch Inspection Latency',
      category: 'Quality',
      count: 14,
      rootCause: 'การตรวจสอบคุณภาพปลายทางมีจุดคอขวดและขาดระบบบันทึกผลดิจิทัล',
      preventiveAction:
        'พัฒนาระบบ Digital QA Inspection ผ่านแท็บเล็ตและเชื่อมต่อระบบ ERP ปลายทางอัตโนมัติ',
      severity: 'Medium',
    },
    {
      clusterName: 'Workplace Harassment & Psychological Safety',
      category: 'Harassment',
      count: 6,
      rootCause:
        'Middle management communication gap and lack of clear anti-harassment escalation workshop',
      preventiveAction: 'Mandatory respectful workplace training and anonymous counseling hotline',
      severity: 'High',
    },
    {
      clusterName: 'Vendor Compliance & Contract Risk Adherence',
      category: 'Compliance',
      count: 8,
      rootCause: 'กระบวนการตรวจรับเอกสารคู่ค้าและมาตรการคุ้มครองข้อมูลส่วนบุคคลขาดมาตรฐานกลาง',
      preventiveAction: 'จัดทำ Standard Compliance Checklist และเชื่อมโยงฐานข้อมูลตรวจสอบอัตโนมัติ',
      severity: 'High',
    },
  ],
  executiveSummary:
    'ภาพรวมข้อร้องเรียนในไตรมาสนี้ มุ่งเน้นไปที่ด้านการทำงานร่วมกัน มาตรฐานการตรวจรับงาน และการเสริมสร้างความปลอดภัยทางจิตวิทยาในที่ทำงาน การตอบสนองของ Gatekeeper อยู่ในเกณฑ์เฉลี่ยที่ดี',
  strategicRecommendations: [
    'เร่งรัดการปรับปรุงกระบวนการตรวจสอบคุณภาพงาน (Digital Quality Assurance)',
    'จัดอบรม Respectful Workplace & Anti-Harassment ทั่วทั้งองค์กร',
    'เพิ่มประสิทธิภาพการตรวจสอบคู่สัญญาและมาตรการคุ้มครองข้อมูล',
  ],
};

// AI Executive Root-Cause Cluster Insights & Strategic Briefing.
// Always answers 200 — falls back to defaultClusters on a missing key or any
// Gemini error (upstream behaviour).
export async function POST(request: NextRequest) {
  try {
    const { complaints } = await request.json();
    const ai = getGeminiClient();

    if (!ai || !complaints || complaints.length === 0) {
      return NextResponse.json(defaultClusters);
    }

    const sampleSummary = (complaints as ComplaintTicket[]).slice(0, 15).map((c) => ({
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
      "category": "HR" | "Compliance" | "Ethics" | "Fraud" | "Harassment" | "Quality",
      "count": number,
      "rootCause": "Deep root cause analysis in Thai",
      "preventiveAction": "Corrective & Preventive Action (CAPA) in Thai",
      "severity": "Low" | "Medium" | "High" | "Critical"
    }
  ],
  "executiveSummary": "Concise paragraph in Thai summarizing the organizational health, key risk alerts, and resolution trends for CEO/EVP",
  "strategicRecommendations": ["array of 3-4 concrete actionable strategic management directives in Thai"]
}`;

    const response = await generateGeminiContentWithFallback(ai, prompt, {
      responseMimeType: 'application/json',
    });

    const result = JSON.parse(response.text || '{}');
    return NextResponse.json(result);
  } catch (error) {
    console.warn(
      'AI Cluster Insights unavailable, returning default corporate clusters:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(defaultClusters);
  }
}
