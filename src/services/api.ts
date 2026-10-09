import {
  ComplaintTicket,
  DepartmentGatekeeperConfig,
  GrievanceCategory,
  TicketStatus,
  UrgencyLevel,
  RecentSearchItem,
} from '../types';
import { CATEGORY_DEFINITIONS, INITIAL_GATEKEEPER_CONFIGS } from '../mockData';
import { analyzeWithClientHeuristics } from './categoryHeuristics';
import { safeStorage } from './safeStorage';
import { env } from '@/lib/env';

// App is served under a basePath on ugtweb.ube.co.th (decisions.md 2026-10-09) —
// plain fetch('/api/...') and hand-built URLs don't get it added automatically.
const BASE_PATH = env.NEXT_PUBLIC_BASE_PATH;

// Collision-free local id. Upstream used `${Date.now()}-${random 0-999}`, which repeats when two
// items are created in the same millisecond — removing one recent search then removed both.
// crypto.randomUUID exists in every place this runs (HTTPS/localhost browsers, Node 22, jsdom).

const uniqueId = (prefix: string): string => `${prefix}-${globalThis.crypto.randomUUID()}`;

const STORAGE_KEY_GATEKEEPERS = 'enterprise_grievance_gatekeepers_v3';
const STORAGE_KEY_RECENT_SEARCHES = 'enterprise_grievance_recent_searches_v1';

export {
  APP_TABS,
  INITIAL_EXECUTIVES,
  INITIAL_HR_ADMINS,
  INITIAL_ROLE_PERMISSIONS,
} from './rosterDefaults';

export function getStoredGatekeeperConfigs(): Record<
  GrievanceCategory,
  DepartmentGatekeeperConfig
> {
  try {
    const data = safeStorage.getItem(STORAGE_KEY_GATEKEEPERS);
    if (data) {
      const parsed = JSON.parse(data);
      // Clean up legacy Environment if present
      if (parsed.Environment) {
        delete parsed.Environment;
      }
      // Ensure all current categories are populated
      const validCategories: GrievanceCategory[] = [
        'HR',
        'Compliance',
        'Ethics',
        'Fraud',
        'Harassment',
        'Quality',
      ];
      const result = {} as Record<GrievanceCategory, DepartmentGatekeeperConfig>;
      validCategories.forEach((cat) => {
        result[cat] = parsed[cat] || INITIAL_GATEKEEPER_CONFIGS[cat];
      });
      return result;
    }
  } catch (e) {
    console.error('Failed to load gatekeeper configs from localStorage', e);
  }
  safeStorage.setItem(STORAGE_KEY_GATEKEEPERS, JSON.stringify(INITIAL_GATEKEEPER_CONFIGS));
  return INITIAL_GATEKEEPER_CONFIGS;
}
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
    return analyzeWithClientHeuristics(params.title, params.description);
  }
}

export async function analyzeGrievanceWithAI(params: {
  title: string;
  description: string;
  category?: string;
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
    const dept =
      CATEGORY_DEFINITIONS[cat as keyof typeof CATEGORY_DEFINITIONS]?.responsibleDept ||
      'People & Culture Department';
    return {
      suggestedCategory: cat,
      urgencyScore: 'Medium',
      sentiment: 'Concerned',
      riskLevel: 'Moderate',
      suggestedDepartment: dept,
      keyKeywords: ['Employee Relations', 'Standard Workflow'],
      summary: params.title || 'ข้อร้องเรียนจากพนักงาน',
      recommendedActions: [
        'รับเรื่องและส่งให้ Gatekeeper ประจำหน่วยงานตรวจสอบและประสานงานทันที',
        'ติดต่อสอบถามข้อเท็จจริงเพิ่มเติมจากพนักงาน (หากไม่ใช่เคสนิรนาม)',
        'จัดทำแผนแก้ไขและแนวทางป้องกันเชิงรุก',
      ],
      isDirectExecutiveWorthy: false,
    };
  }
}

// AI Executive Root Cause Clustering API Call
export async function getClusterInsightsWithAI(tickets: ComplaintTicket[]) {
  try {
    const res = await fetch(`${BASE_PATH}/api/ai/cluster-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaints: tickets }),
    });
    if (!res.ok) throw new Error('Cluster AI service error');
    return await res.json();
  } catch (err) {
    console.warn('AI Cluster Insights fallback', err);
    return {
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
    };
  }
}

export function getStatusBadgeText(status: TicketStatus, lang: 'th' | 'en' = 'th') {
  if (lang === 'en') {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'gatekeeper_triaged':
        return 'Triaged';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
    }
  }
  switch (status) {
    case 'submitted':
      return 'ยื่นเรื่องแล้ว (Submitted)';
    case 'gatekeeper_triaged':
      return 'รับเรื่องแล้ว (Triaged)';
    case 'in_progress':
      return 'กำลังแก้ไข (In Progress)';
    case 'resolved':
      return 'แก้ไขเสร็จสิ้น (Resolved)';
    case 'closed':
      return 'ปิดเรื่องสมบูรณ์ (Closed)';
  }
}

export function getStatusColor(status: TicketStatus) {
  switch (status) {
    case 'submitted':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'gatekeeper_triaged':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'in_progress':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'closed':
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

export function getUrgencyBadgeText(urgency: UrgencyLevel, lang: 'th' | 'en' = 'th') {
  if (lang === 'en') {
    switch (urgency) {
      case 'Low':
        return '🟢 Low';
      case 'Medium':
        return '🟡 Medium';
      case 'High':
        return '🔴 High';
      case 'Critical':
        return '🔥 Critical';
    }
  }
  switch (urgency) {
    case 'Low':
      return '🟢 ปกติ / ทั่วไป (Low)';
    case 'Medium':
      return '🟡 ปานกลาง (Medium)';
    case 'High':
      return '🔴 เร่งด่วน (High)';
    case 'Critical':
      return '🔥 วิกฤติ / ฉุกเฉิน (Critical)';
  }
}

export function getUrgencyColor(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'Low':
      return 'bg-slate-50 text-slate-700 border-slate-200';
    case 'Medium':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'High':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'Critical':
      return 'bg-red-100 text-red-900 border-red-300 font-bold';
  }
}

export function getRiskSeverityBadgeText(
  risk: ComplaintTicket['riskSeverity'],
  lang: 'th' | 'en' = 'th'
) {
  if (lang === 'en') {
    switch (risk) {
      case 'Low':
        return 'Low Risk';
      case 'Moderate':
        return 'Moderate Risk';
      case 'High':
        return 'High Risk';
      case 'Severe':
        return 'Severe Risk';
    }
  }
  switch (risk) {
    case 'Low':
      return 'เสี่ยงต่ำ (Low)';
    case 'Moderate':
      return 'เสี่ยงปานกลาง (Moderate)';
    case 'High':
      return 'เสี่ยงสูง (High)';
    case 'Severe':
      return 'วิกฤติรุนแรง (Severe)';
  }
}

export function getRiskSeverityColor(risk: ComplaintTicket['riskSeverity']) {
  switch (risk) {
    case 'Low':
      return 'bg-slate-50 text-slate-600 border-slate-200';
    case 'Moderate':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'High':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'Severe':
      return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
  }
}

// ============================================================================
// RECENT TRACKING SEARCHES MANAGEMENT
// ============================================================================

export function getRecentSearches(): RecentSearchItem[] {
  if (globalThis.window === undefined) return [];
  const stored = safeStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse recent searches:', e);
    return [];
  }
}

export function saveRecentSearches(items: RecentSearchItem[]): void {
  if (globalThis.window === undefined) return;
  safeStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(items));
}

export function addRecentSearch(query: string, ticket?: ComplaintTicket | null): RecentSearchItem {
  const current = getRecentSearches();
  const trimmed = query.trim();

  // Remove existing entry with the same query or tracking code to prevent duplicate clutter
  const filtered = current.filter(
    (item) =>
      item.query.toLowerCase() !== trimmed.toLowerCase() &&
      (!ticket || item.trackingCode?.toLowerCase() !== ticket.trackingCode.toLowerCase())
  );

  const newItem: RecentSearchItem = {
    id: uniqueId('search'),
    query: trimmed,
    timestamp: new Date().toISOString(),
    ticketId: ticket?.id,
    trackingCode:
      ticket?.trackingCode ||
      (trimmed.toUpperCase().startsWith('TK-') ? trimmed.toUpperCase() : undefined),
    title: ticket?.title,
    category: ticket?.category,
    urgency: ticket?.urgency,
    status: ticket?.status,
    found: !!ticket,
    submitterName: ticket?.submitterName,
  };

  // Keep up to 30 recent searches
  const updated = [newItem, ...filtered].slice(0, 30);
  saveRecentSearches(updated);
  return newItem;
}

export function removeRecentSearch(id: string): RecentSearchItem[] {
  const current = getRecentSearches();
  const updated = current.filter((item) => item.id !== id);
  saveRecentSearches(updated);
  return updated;
}

export function clearRecentSearches(): void {
  if (globalThis.window === undefined) return;
  safeStorage.removeItem(STORAGE_KEY_RECENT_SEARCHES);
}
