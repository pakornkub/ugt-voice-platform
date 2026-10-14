import type { ComplaintTicket, GrievanceCategory, UrgencyLevel } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import type { Language } from '../context/LanguageContext';
import { analyzeWithClientHeuristics } from './categoryHeuristics';
import { env } from '@/lib/env';

// App is served under a basePath on ugtweb.ube.co.th (decisions.md 2026-10-09) —
// plain fetch('/api/...') and hand-built URLs don't get it added automatically.
const BASE_PATH = env.NEXT_PUBLIC_BASE_PATH;

// AI Smart Triage Assistant API Call
export interface AICategorySuggestionResult {
  suggestedCategory: GrievanceCategory;
  confidence: number;
  reasoning: string;
  secondaryCategory?: GrievanceCategory;
  suggestedUrgency?: UrgencyLevel;
  keywords?: string[];
}

export async function suggestCategoryWithAI(params: {
  title: string;
  description: string;
  /** Language of the AI reasoning/keywords (and of the client fallback). Default 'th'. */
  lang?: Language;
}): Promise<AICategorySuggestionResult> {
  try {
    const res = await fetch(`${BASE_PATH}/api/ai/suggest-category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Category AI service error');
    return await res.json();
  } catch (err) {
    console.warn('suggestCategoryWithAI fallback', err);
    return analyzeWithClientHeuristics(params.title, params.description, params.lang);
  }
}

// Client fallback copy of analyzeGrievanceWithAI, per language.
const ANALYZE_FALLBACK_COPY = {
  th: {
    summary: 'ข้อร้องเรียนจากพนักงาน',
    recommendedActions: [
      'รับเรื่องและส่งให้ Gatekeeper ประจำหน่วยงานตรวจสอบและประสานงานทันที',
      'ติดต่อสอบถามข้อเท็จจริงเพิ่มเติมจากพนักงาน (หากไม่ใช่เคสนิรนาม)',
      'จัดทำแผนแก้ไขและแนวทางป้องกันเชิงรุก',
    ],
  },
  en: {
    summary: 'Employee grievance',
    recommendedActions: [
      'Acknowledge the case and route it to the department Gatekeeper for immediate review and coordination',
      'Follow up with the employee for further facts (unless the case is anonymous)',
      'Prepare a corrective plan and proactive prevention measures',
    ],
  },
};

// Client fallback copy of getClusterInsightsWithAI, per language.
const CLUSTER_FALLBACK = {
  th: {
    topRiskClusters: [
      {
        clusterName: 'Quality Control & Operational Standards',
        category: 'Quality',
        count: 3,
        rootCause: 'ขั้นตอนการตรวจสอบคุณภาพปลายทางมีจุดคอขวดและขาดเกณฑ์ชี้วัดข้อบกพร่องที่ชัดเจน',
        preventiveAction: 'ปรับปรุง SOP Checklist การตรวจรับ และนำระบบ Digital Inspection มาใช้',
        severity: 'Medium',
      },
      {
        clusterName: 'Workplace Psychological Safety & Ethics',
        category: 'Harassment',
        count: 2,
        rootCause: 'ช่องว่างการสื่อสารของหัวหน้างานระดับกลางและขาดการอบรม Respectful Workplace',
        preventiveAction:
          'จัดหลักสูตร Mandatory Respectful Leadership และเปิดสายด่วนรับฟังความปลอดภัยทางใจ',
        severity: 'High',
      },
      {
        clusterName: 'Regulatory Compliance & Document Policy',
        category: 'Compliance',
        count: 2,
        rootCause: 'การจัดเก็บและเปิดเผยเอกสารสัญญาคู่ค้ายังขาดแนวทางปฏิบัติตามมาตรฐาน PDPA',
        preventiveAction:
          'จัดทำ DPA Standard Template และจัดอบรมกระบวนการเปิดเผยข้อมูลส่วนบุคคลภายนอก',
        severity: 'High',
      },
    ],
    executiveSummary:
      'ภาพรวมขององค์กรมีการตอบสนองต่อข้อร้องเรียนอยู่ในเกณฑ์ดี มีอัตราการแก้ไขสำเร็จสูง มีจุดที่ต้องเฝ้าระวังเรื่องการจัดซื้อและมาตรฐานเอกสารสัญญา',
    strategicRecommendations: [
      'เร่งการปฏิรูปเครื่องมือตรวจสอบการดำเนินงานสำหรับ Hybrid Workplace',
      'เพิ่มมาตรการตรวจสอบความโปร่งใสของฝ่ายจัดซื้อด้วยระบบตรวจเช็คอัตโนมัติ',
      'ยกระดับโปรแกรมดูแลสุขภาพจิตและสวัสดิการแบบยืดหยุ่น (Flex-Benefits)',
    ],
  },
  en: {
    topRiskClusters: [
      {
        clusterName: 'Quality Control & Operational Standards',
        category: 'Quality',
        count: 3,
        rootCause:
          'The downstream quality inspection step has bottlenecks and lacks clear defect criteria',
        preventiveAction:
          'Improve the acceptance-inspection SOP checklist and adopt a Digital Inspection system',
        severity: 'Medium',
      },
      {
        clusterName: 'Workplace Psychological Safety & Ethics',
        category: 'Harassment',
        count: 2,
        rootCause:
          'A communication gap among middle-level supervisors and a lack of Respectful Workplace training',
        preventiveAction:
          'Run a Mandatory Respectful Leadership course and open a psychological-safety hotline',
        severity: 'High',
      },
      {
        clusterName: 'Regulatory Compliance & Document Policy',
        category: 'Compliance',
        count: 2,
        rootCause:
          'Storage and disclosure of vendor contract documents still lack PDPA-compliant practices',
        preventiveAction:
          'Create a DPA Standard Template and train staff on disclosing personal data to external parties',
        severity: 'High',
      },
    ],
    executiveSummary:
      'Overall, the organization is responding well to grievances, with a high resolution rate. Procurement and contract document standards need continued monitoring.',
    strategicRecommendations: [
      'Accelerate the overhaul of operational monitoring tools for the Hybrid Workplace',
      'Strengthen procurement transparency checks with an automated verification system',
      'Elevate mental-health and flexible-benefits (Flex-Benefits) programs',
    ],
  },
};

export async function analyzeGrievanceWithAI(params: {
  title: string;
  description: string;
  category?: string;
  /** Language of the AI answer (and of the client fallback). Default 'th'. */
  lang?: Language;
}) {
  try {
    const res = await fetch(`${BASE_PATH}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('AI service error');
    return await res.json();
  } catch (err) {
    console.warn('AI offline or fallback mode', err);
    const cat = params.category || 'HR';
    const copy = ANALYZE_FALLBACK_COPY[params.lang ?? 'th'];
    // responsibleDept reads "English (Thai)"; the English UI shows just the English part.
    const responsibleDept =
      CATEGORY_DEFINITIONS[cat as keyof typeof CATEGORY_DEFINITIONS]?.responsibleDept;
    const dept =
      (params.lang === 'en' ? responsibleDept?.split(' (')[0] : responsibleDept) ||
      'People & Culture Department';
    return {
      suggestedCategory: cat,
      urgencyScore: 'Medium',
      sentiment: 'Concerned',
      riskLevel: 'Moderate',
      suggestedDepartment: dept,
      keyKeywords: ['Employee Relations', 'Standard Workflow'],
      summary: params.title || copy.summary,
      recommendedActions: copy.recommendedActions,
      isDirectExecutiveWorthy: false,
    };
  }
}

// AI Executive Root Cause Clustering API Call
export async function getClusterInsightsWithAI(tickets: ComplaintTicket[], lang: Language = 'th') {
  try {
    const res = await fetch(`${BASE_PATH}/api/ai/cluster-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaints: tickets, lang }),
    });
    if (!res.ok) throw new Error('Cluster AI service error');
    return await res.json();
  } catch (err) {
    console.warn('AI Cluster Insights fallback', err);
    return CLUSTER_FALLBACK[lang];
  }
}
