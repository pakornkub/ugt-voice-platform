import {
  ComplaintTicket,
  DepartmentGatekeeperConfig,
  GrievanceCategory,
  TicketStatus,
  UrgencyLevel,
  EmailNotificationSettings,
  EmailDispatchLog,
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
/** The page origin in the browser, empty on the server (links are built client-side). */
const appOrigin = (): string => globalThis.location?.origin ?? '';

const uniqueId = (prefix: string): string => `${prefix}-${globalThis.crypto.randomUUID()}`;

const STORAGE_KEY_GATEKEEPERS = 'enterprise_grievance_gatekeepers_v3';
const STORAGE_KEY_EMAIL_SETTINGS = 'enterprise_grievance_email_settings_v1';
const STORAGE_KEY_EMAIL_LOGS = 'enterprise_grievance_email_logs_v1';
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

// Upstream's simulated email dispatch log (localStorage) — the ticket itself now lives in the DB
// (lib/actions/tickets.ts), so the components call these after the Server Action returns.
// Slice 3 of the rewiring moves delivery server-side (AppSettings + SMTP).
export function logTicketSubmittedEmail(ticket: ComplaintTicket) {
  try {
    dispatchEmailOnTicketSubmitted(ticket);
  } catch (error_) {
    console.warn('Auto email dispatch error on ticket submit:', error_);
  }
}

export function logTicketResolvedEmail(
  ticket: ComplaintTicket,
  updates: { resolutionSummary?: string; actionNote?: string; actorName?: string }
) {
  if (ticket.status !== 'resolved') return;
  try {
    dispatchEmailOnTicketResolved(
      ticket,
      updates.resolutionSummary ||
        updates.actionNote ||
        'ดำเนินการตรวจสอบและแก้ไขปัญหาเรียบร้อยตามมาตรฐานการปฏิบัติงาน',
      updates.actorName || 'เจ้าหน้าที่ Gatekeeper'
    );
  } catch (error_) {
    console.warn('Auto email dispatch error on ticket resolve:', error_);
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

// =========================================================================
// EMAIL NOTIFICATION SYSTEM (Admin Settings, Dynamic Templates & Dispatch)
// =========================================================================

export const DEFAULT_EMAIL_SETTINGS: EmailNotificationSettings = {
  masterEnabled: true,
  onTicketSubmitted: {
    enabled: true,
    subject:
      '[VoicePlatform แจ้งเรื่องใหม่] {ticketId}: มีข้อร้องเรียนใหม่ ({categoryTh}) - {urgency}',
    body: `เรียน ทีมงาน Gatekeeper ประจำฝ่าย {categoryTh},

ระบบ VoicePlatform ขอแจ้งเตือนว่ามีผู้ยื่นเรื่องข้อร้องเรียน/ข้อเสนอแนะใหม่เข้าระบบ โดยมีรายละเอียดดังนี้:

- รหัสติดตาม (Tracking ID): {ticketId}
- หมวดหมู่ (Category): {categoryTh} ({category})
- หัวข้อเรื่อง (Title): {title}
- ระดับความเร่งด่วน (Urgency): {urgency}
- ผู้ยื่นเรื่อง (Submitter): {senderName} ({senderDept})
- วันที่และเวลาที่ยื่น (Submitted At): {submissionDate}

รายละเอียดข้อร้องเรียน:
"{description}"

กรุณาเข้าสู่ระบบเพื่อดำเนินการคัดกรอง (Triage), ตรวจสอบความถูกต้อง, มอบหมายเจ้าหน้าที่ผู้รับผิดชอบ และประสานงานแก้ไขปัญหาตามระเบียบนโยบายขององค์กรต่อไป

เข้าสู่ระบบจัดการเคส: {trackingUrl}

ขอแสดงความนับถือ,
ระบบรับเรื่องร้องเรียนและข้อเสนอแนะองค์กร VoicePlatform`,
  },
  onTicketResolved: {
    enabled: true,
    subject:
      '[VoicePlatform แจ้งผลการแก้ไข] เรื่อง {ticketId}: ดำเนินการแก้ไขเสร็จสิ้นเรียบร้อยแล้ว',
    body: `เรียน คุณ {recipientName},

ระบบ VoicePlatform ขอแจ้งให้ท่านทราบว่า ข้อร้องเรียน/ข้อเสนอแนะของท่านได้รับการตรวจสอบและดำเนินการแก้ไขเสร็จสิ้นเรียบร้อยแล้ว

ข้อมูลสรุปการดำเนินงาน:
- รหัสติดตาม (Tracking ID): {ticketId}
- หัวข้อเรื่อง (Title): {title}
- หมวดหมู่ (Category): {categoryTh}
- ผู้ดำเนินการปิดเคส: {resolvedBy}
- วันที่ดำเนินการเสร็จสิ้น: {resolvedDate}

สรุปผลการแก้ไขและการดำเนินงาน:
"{resolutionNotes}"

ท่านสามารถเข้าสู่ระบบเพื่อตรวจสอบรายละเอียดการดำเนินงานย้อนหลัง (Audit Timeline) และโปรดร่วมสละเวลา 1 นาทีในการทำแบบประเมินความพึงพอใจ (CSAT Rating) เพื่อเป็นข้อมูลในการปรับปรุงมาตรฐานการบริการขององค์กรต่อไป

ตรวจสอบผลการแก้ไขและทำแบบประเมิน: {trackingUrl}

ขอแสดงความนับถือ,
ทีมงาน VoicePlatform & แผนก {categoryTh}`,
  },
  updatedAt: new Date().toISOString(),
};

export function getStoredEmailNotificationSettings(): EmailNotificationSettings {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY_EMAIL_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_EMAIL_SETTINGS,
        ...parsed,
        onTicketSubmitted: {
          ...DEFAULT_EMAIL_SETTINGS.onTicketSubmitted,
          ...parsed.onTicketSubmitted,
        },
        onTicketResolved: {
          ...DEFAULT_EMAIL_SETTINGS.onTicketResolved,
          ...parsed.onTicketResolved,
        },
      };
    }
  } catch (err) {
    console.error('Failed to parse email notification settings', err);
  }
  return DEFAULT_EMAIL_SETTINGS;
}

export function saveStoredEmailNotificationSettings(settings: EmailNotificationSettings) {
  try {
    safeStorage.setItem(STORAGE_KEY_EMAIL_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save email notification settings', err);
  }
}

export function updateEmailNotificationSettings(
  settings: Partial<EmailNotificationSettings>
): EmailNotificationSettings {
  const current = getStoredEmailNotificationSettings();
  const updated: EmailNotificationSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  saveStoredEmailNotificationSettings(updated);
  return updated;
}

export function resetEmailNotificationSettings(): EmailNotificationSettings {
  const reset = {
    ...DEFAULT_EMAIL_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
  saveStoredEmailNotificationSettings(reset);
  return reset;
}

export function getStoredEmailDispatchLogs(): EmailDispatchLog[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY_EMAIL_LOGS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse email dispatch logs', err);
  }
  return [];
}

export function addEmailDispatchLog(log: EmailDispatchLog) {
  try {
    const current = getStoredEmailDispatchLogs();
    const updated = [log, ...current].slice(0, 100);
    safeStorage.setItem(STORAGE_KEY_EMAIL_LOGS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to store email dispatch log', err);
  }
}

export function clearEmailDispatchLogs() {
  try {
    safeStorage.removeItem(STORAGE_KEY_EMAIL_LOGS);
  } catch (err) {
    console.error('Failed to clear email dispatch logs', err);
  }
}

export function interpolateEmailTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    // split/join, not String.replace — a "$&" in user text must not act as a pattern
    result = result.split(`{${key}}`).join(val ?? '-');
  }
  return result;
}

export function dispatchEmailOnTicketSubmitted(ticket: ComplaintTicket): EmailDispatchLog | null {
  const settings = getStoredEmailNotificationSettings();
  const catConfig = CATEGORY_DEFINITIONS[ticket.category];
  const gkConfigs = getStoredGatekeeperConfigs();
  const targetGk = gkConfigs[ticket.category];

  const recipientEmail =
    targetGk?.leadOfficer?.email ||
    targetGk?.escalationEmail ||
    `${ticket.category.toLowerCase()}-gatekeeper@enterprise.co.th`;
  const recipientName =
    targetGk?.leadOfficer?.name || `Gatekeeper ประจำฝ่าย ${catConfig?.nameTh || ticket.category}`;

  const vars: Record<string, string> = {
    ticketId: ticket.trackingCode || ticket.id,
    title: ticket.title || '-',
    category: ticket.category,
    categoryTh: catConfig?.nameTh || ticket.category,
    senderName:
      ticket.confidentiality === 'anonymous'
        ? 'ผู้ยื่นเรื่องนิรนาม (Anonymous)'
        : ticket.submitterName || 'พนักงานผู้ยื่นเรื่อง',
    senderDept:
      ticket.confidentiality === 'anonymous'
        ? 'ไม่เปิดเผยสังกัด'
        : ticket.submitterDepartment || 'ทั่วไป',
    senderEmail: ticket.submitterEmail || '-',
    recipientName,
    urgency: ticket.urgency,
    description: ticket.description || '-',
    submissionDate: new Date(ticket.createdAt).toLocaleString('th-TH'),
    trackingUrl: `${appOrigin()}${BASE_PATH}/#tracking=${ticket.trackingCode}`,
  };

  const isEnabled = settings.masterEnabled && settings.onTicketSubmitted.enabled;
  const subject = interpolateEmailTemplate(settings.onTicketSubmitted.subject, vars);
  const body = interpolateEmailTemplate(settings.onTicketSubmitted.body, vars);

  const log: EmailDispatchLog = {
    id: uniqueId('elog'),
    timestamp: new Date().toISOString(),
    trigger: 'ticket_submitted',
    ticketId: ticket.id,
    trackingCode: ticket.trackingCode,
    recipientEmail,
    recipientName,
    recipientRole: 'gatekeeper',
    subject,
    body,
    status: isEnabled ? 'sent' : 'disabled',
    deliveryChannel: 'SMTP / Enterprise Mail Gateway (Simulated)',
  };

  addEmailDispatchLog(log);
  return log;
}

export function dispatchEmailOnTicketResolved(
  ticket: ComplaintTicket,
  resolutionNotes: string,
  resolvedBy: string
): EmailDispatchLog | null {
  const settings = getStoredEmailNotificationSettings();
  const catConfig = CATEGORY_DEFINITIONS[ticket.category];

  const recipientEmail =
    ticket.submitterEmail ||
    (ticket.confidentiality === 'anonymous'
      ? 'anonymous-submitter@voiceplatform.internal'
      : 'employee@enterprise.co.th');
  const recipientName =
    ticket.confidentiality === 'anonymous'
      ? 'ผู้ยื่นเรื่อง (Anonymous Submitter)'
      : ticket.submitterName || 'พนักงานผู้ยื่นเรื่อง';

  const vars: Record<string, string> = {
    ticketId: ticket.trackingCode || ticket.id,
    title: ticket.title || '-',
    category: ticket.category,
    categoryTh: catConfig?.nameTh || ticket.category,
    recipientName,
    resolvedBy: resolvedBy || 'เจ้าหน้าที่ผู้รับผิดชอบ',
    resolvedDate: new Date().toLocaleString('th-TH'),
    resolutionNotes: resolutionNotes || 'ดำเนินการแก้ไขและปรับปรุงตามขั้นตอนเรียบร้อยแล้ว',
    trackingUrl: `${appOrigin()}${BASE_PATH}/#tracking=${ticket.trackingCode}`,
  };

  const isEnabled = settings.masterEnabled && settings.onTicketResolved.enabled;
  const subject = interpolateEmailTemplate(settings.onTicketResolved.subject, vars);
  const body = interpolateEmailTemplate(settings.onTicketResolved.body, vars);

  const log: EmailDispatchLog = {
    id: uniqueId('elog'),
    timestamp: new Date().toISOString(),
    trigger: 'ticket_resolved',
    ticketId: ticket.id,
    trackingCode: ticket.trackingCode,
    recipientEmail,
    recipientName,
    recipientRole: 'employee',
    subject,
    body,
    status: isEnabled ? 'sent' : 'disabled',
    deliveryChannel: 'SMTP / Enterprise Mail Gateway (Simulated)',
  };

  addEmailDispatchLog(log);
  return log;
}

export function sendTestEmailNotification(
  triggerType: 'ticket_submitted' | 'ticket_resolved',
  targetEmail?: string
): EmailDispatchLog {
  const settings = getStoredEmailNotificationSettings();
  const testVars: Record<string, string> = {
    ticketId: 'TK-2026-TEST',
    title: 'ตัวอย่าง: ติดขัดขั้นตอนการส่งเอกสารและระบบเบิกจ่าย',
    category: 'HR',
    categoryTh: 'ทรัพยากรบุคคลและแรงงานสัมพันธ์',
    senderName: 'สมศักดิ์ มั่นคง',
    senderDept: 'ฝ่ายปฏิบัติการคลังสินค้า',
    senderEmail: 'somsak.m@enterprise.co.th',
    recipientName:
      triggerType === 'ticket_submitted'
        ? 'คุณวิภาวรรณ สดใส (Lead Gatekeeper)'
        : 'สมศักดิ์ มั่นคง (พนักงาน)',
    urgency: 'Urgent',
    description:
      'ทดสอบส่งข้อความแจ้งเตือนทางระบบอีเมลอัตโนมัติ เพื่อตรวจสอบความถูกต้องของ Subject และ Body Template',
    submissionDate: new Date().toLocaleString('th-TH'),
    resolvedBy: 'คุณนพดล เกียรติสกุล (HR Gatekeeper)',
    resolvedDate: new Date().toLocaleString('th-TH'),
    resolutionNotes:
      'ได้ปรับปรุงแบบฟอร์มเบิกจ่ายออนไลน์และเพิ่มช่องทางยืนยันเอกสารผ่านระบบอัตโนมัติแล้ว',
    trackingUrl: `${appOrigin()}${BASE_PATH}/#tracking=TK-2026-TEST`,
  };

  const template =
    triggerType === 'ticket_submitted' ? settings.onTicketSubmitted : settings.onTicketResolved;
  const subject = interpolateEmailTemplate(template.subject, testVars);
  const body = interpolateEmailTemplate(template.body, testVars);

  const log: EmailDispatchLog = {
    id: uniqueId('elog'),
    timestamp: new Date().toISOString(),
    trigger: 'test_dispatch',
    ticketId: 'TK-2026-TEST',
    trackingCode: 'TK-2026-TEST',
    recipientEmail:
      targetEmail ||
      (triggerType === 'ticket_submitted'
        ? 'hr-gatekeeper@enterprise.co.th'
        : 'employee.test@enterprise.co.th'),
    recipientName: testVars.recipientName,
    recipientRole: 'test',
    subject: `[TEST SIMULATION] ${subject}`,
    body,
    status: 'sent',
    deliveryChannel: 'SMTP / Enterprise Mail Gateway (Simulated)',
  };

  addEmailDispatchLog(log);
  return log;
}

// ============================================================================
// RECENT TRACKING SEARCHES MANAGEMENT
// ============================================================================

export function getRecentSearches(): RecentSearchItem[] {
  if (typeof globalThis.window === 'undefined') return [];
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
  if (typeof globalThis.window === 'undefined') return;
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
  if (typeof globalThis.window === 'undefined') return;
  safeStorage.removeItem(STORAGE_KEY_RECENT_SEARCHES);
}
