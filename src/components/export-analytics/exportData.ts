import { CATEGORY_DEFINITIONS } from '../../mockData';
import type { Language } from '../../context/LanguageContext';
import type { ComplaintTicket, ConfidentialityLevel, TicketStatus } from '../../types';
import { formatValue } from './formatValue';
import type { ExportFilters, ExportMetrics } from './types';

const MS_PER_HOUR = 1000 * 3600;
const MS_PER_DAY = MS_PER_HOUR * 24;

/** Fixed reference "today" the time-range filter is measured from (matches the seed data). */
const REFERENCE_DATE_ISO = '2026-09-01T00:00:00Z';

const TIME_RANGE_DAYS = new Map<string, number>([
  ['7d', 7],
  ['30d', 30],
  ['90d', 90],
]);

const isResolvedStatus = (status: TicketStatus) => status === 'resolved' || status === 'closed';

const hoursBetween = (fromIso: string, toIso: string) =>
  (new Date(toIso).getTime() - new Date(fromIso).getTime()) / MS_PER_HOUR;

const isOlderThan = (createdAt: string, days: number) => {
  const now = new Date(REFERENCE_DATE_ISO);
  const diffDays = (now.getTime() - new Date(createdAt).getTime()) / MS_PER_DAY;
  return diffDays > days;
};

const isWithinTimeRange = (createdAt: string, timeRange: string) => {
  const maxDays = TIME_RANGE_DAYS.get(timeRange);
  if (maxDays === undefined) return true;
  return !isOlderThan(createdAt, maxDays);
};

export function filterTickets(
  tickets: ComplaintTicket[],
  { department, status, timeRange }: Readonly<ExportFilters>
): ComplaintTicket[] {
  return tickets.filter((ticket) => {
    if (department !== 'ALL' && ticket.category !== department) return false;
    if (status !== 'ALL' && ticket.status !== status) return false;
    return isWithinTimeRange(ticket.createdAt, timeRange);
  });
}

const averageCsat = (tickets: ComplaintTicket[]) => {
  const evaluated = tickets.filter((t) => t.evaluation && t.evaluation.overallScore > 0);
  if (evaluated.length === 0) return 0;
  const sum = evaluated.reduce((acc, curr) => acc + (curr.evaluation?.overallScore || 0), 0);
  return sum / evaluated.length;
};

/** Average hours from creation to resolution; falls back to 48 when nothing is measurable. */
const averageResolutionHours = (resolved: ComplaintTicket[]) => {
  let totalHours = 0;
  let counted = 0;
  for (const t of resolved) {
    if (!t.resolvedAt || !t.createdAt) continue;
    const diff = hoursBetween(t.createdAt, t.resolvedAt);
    if (diff > 0) {
      totalHours += diff;
      counted++;
    }
  }
  return counted > 0 ? Math.round(totalHours / counted) : 48;
};

export function computeMetrics(filtered: ComplaintTicket[]): ExportMetrics {
  const total = filtered.length;
  if (total === 0) {
    return { total: 0, resolvedRate: 0, avgResolutionHours: 0, avgCsat: 0, directToCeoCount: 0 };
  }
  const resolved = filtered.filter((t) => isResolvedStatus(t.status));
  return {
    total,
    resolvedRate: Math.round((resolved.length / total) * 100),
    avgResolutionHours: averageResolutionHours(resolved),
    avgCsat: Number(averageCsat(filtered).toFixed(1)),
    directToCeoCount: filtered.filter((t) => t.isDirectToExecutive).length,
  };
}

interface Bilingual {
  th: string;
  en: string;
}

const pick = (lang: Language, label: Bilingual) => label[lang];

const STANDARD_CONFIDENTIALITY: Bilingual = {
  th: 'เปิดเผยชื่อ (Standard)',
  en: 'Named (Standard)',
};
const CONFIDENTIALITY_LABELS: Partial<Record<ConfidentialityLevel, Bilingual>> = {
  anonymous: { th: 'ไม่ระบุตัวตน (Anonymous)', en: 'Anonymous' },
  confidential_restricted: { th: 'ปิดเป็นความลับ (Confidential)', en: 'Confidential' },
};

const CLOSED_STATUS_LABEL: Bilingual = { th: 'ปิดเรื่อง', en: 'Closed' };
const STATUS_LABELS: Partial<Record<TicketStatus, Bilingual>> = {
  submitted: { th: 'ยื่นเรื่องใหม่', en: 'Newly submitted' },
  gatekeeper_triaged: { th: 'รับเรื่องแล้ว', en: 'Triaged' },
  in_progress: { th: 'กำลังแก้ไข', en: 'In progress' },
  resolved: { th: 'แก้ไขเสร็จสิ้น', en: 'Resolved' },
};

const TICKET_TYPE_LABELS: Record<'complaint' | 'suggestion', Bilingual> = {
  complaint: { th: 'ข้อร้องเรียน (Complaint)', en: 'Complaint' },
  suggestion: { th: 'ข้อเสนอแนะ (Suggestion)', en: 'Suggestion' },
};

const DIRECT_TO_EXECUTIVE_LABELS: Record<'yes' | 'no', Bilingual> = {
  yes: { th: 'ใช่ (CEO Direct / Whistleblower)', en: 'Yes (CEO Direct / Whistleblower)' },
  no: { th: 'ไม่ใช่ (Standard)', en: 'No (Standard)' },
};

const YES_NO_LABELS: Record<'yes' | 'no', Bilingual> = {
  yes: { th: 'ใช่', en: 'Yes' },
  no: { th: 'ไม่ใช่', en: 'No' },
};

const ANONYMOUS_SUBMITTER: Bilingual = { th: 'ปกปิด (Anonymous)', en: 'Anonymous' };

const THAI_CHAR = /[\u0E00-\u0E7F]/;

/** Department names carry their Thai name in trailing parentheses; English output drops it.
 * Plain string search \u2014 no backtracking regex over free text (Sonar S5852). */
const departmentLabel = (name: string, lang: Language) => {
  const trimmed = name.trimEnd();
  const open = trimmed.lastIndexOf('(');
  if (lang !== 'en' || open < 0 || !trimmed.endsWith(')')) return name;
  const inner = trimmed.slice(open + 1, -1);
  return inner.includes(')') || !THAI_CHAR.test(inner) ? name : trimmed.slice(0, open).trimEnd();
};

const categoryLabel = (t: ComplaintTicket, lang: Language) => {
  const category = CATEGORY_DEFINITIONS[t.category];
  if (!category) return t.category;
  return (lang === 'en' ? category.nameEn : category.nameTh) || t.category;
};

const leadTimeHours = (fromIso: string | undefined, toIso: string | undefined) => {
  if (!fromIso || !toIso) return '';
  const diff = hoursBetween(fromIso, toIso);
  return diff > 0 ? diff.toFixed(1) : '';
};

const findTriageLog = (t: ComplaintTicket) =>
  t.timeline?.find(
    (l) =>
      l.action.includes('รับเรื่อง') ||
      l.action.includes('Triage') ||
      l.status === 'gatekeeper_triaged'
  );

const ratingLabel = (rating: number | undefined) => (rating ? `${rating}/5` : '-');

const permanentlyResolvedLabel = (value: boolean | undefined, lang: Language) => {
  if (value === undefined) return '-';
  return pick(lang, YES_NO_LABELS[value ? 'yes' : 'no']);
};

const attachmentsLabel = (t: ComplaintTicket, lang: Language) => {
  const count = t.attachments?.length ?? 0;
  if (count === 0) return lang === 'en' ? 'None' : 'ไม่มี';
  if (lang === 'en') return `Yes (${count} ${count === 1 ? 'file' : 'files'})`;
  return `มี (${count} ไฟล์)`;
};

const submitterDepartmentLabel = (t: ComplaintTicket, lang: Language) => {
  if (t.submitterDepartment) return t.submitterDepartment;
  return t.confidentiality === 'anonymous' ? pick(lang, ANONYMOUS_SUBMITTER) : '-';
};

const identityFields = (t: ComplaintTicket, lang: Language) => {
  const category = CATEGORY_DEFINITIONS[t.category];
  return {
    trackingCode: t.trackingCode,
    createdAt: t.createdAt,
    type: pick(lang, TICKET_TYPE_LABELS[t.type === 'complaint' ? 'complaint' : 'suggestion']),
    categoryKey: t.category,
    categoryNameTh: categoryLabel(t, lang),
    responsibleDept: departmentLabel(
      category?.responsibleDept || t.gatekeeperDepartment || '',
      lang
    ),
    locationOrUnit: t.locationOrUnit || '',
    isDirectToExecutive: pick(
      lang,
      DIRECT_TO_EXECUTIVE_LABELS[t.isDirectToExecutive ? 'yes' : 'no']
    ),
    confidentiality: pick(
      lang,
      CONFIDENTIALITY_LABELS[t.confidentiality] ?? STANDARD_CONFIDENTIALITY
    ),
    submitterDepartment: submitterDepartmentLabel(t, lang),
  };
};

const caseFields = (t: ComplaintTicket, lang: Language) => ({
  title: t.title,
  description: t.description,
  urgency: t.urgency,
  riskSeverity: t.riskSeverity,
  sentiment: t.sentiment || 'Neutral',
  status: t.status,
  statusLabelTh: pick(lang, STATUS_LABELS[t.status] ?? CLOSED_STATUS_LABEL),
  assignedOfficerName: t.assignedOfficerName || '-',
});

const timingFields = (t: ComplaintTicket) => ({
  triageLeadTimeHours: leadTimeHours(t.createdAt, findTriageLog(t)?.timestamp) || '-',
  resolutionLeadTimeHours: leadTimeHours(t.createdAt, t.resolvedAt) || '-',
  resolvedAt: t.resolvedAt || '-',
  closedAt: t.closedAt || '-',
});

const rootCauseFields = (t: ComplaintTicket, lang: Language) => ({
  rootCauseCategory: t.rootCauseCategory || '-',
  rootCauseSummary: t.rootCauseSummary || '-',
  preventiveActionPlan: t.preventiveActionPlan || '-',
  clusterGroup: t.clusterGroup || '-',
  resolutionSummary: t.resolutionSummary || '-',
  hasAttachments: attachmentsLabel(t, lang),
});

const csatFields = (t: ComplaintTicket, lang: Language) => ({
  csatOverallScore: ratingLabel(t.evaluation?.overallScore),
  csatSpeedRating: ratingLabel(t.evaluation?.speedRating),
  csatQualityRating: ratingLabel(t.evaluation?.resolutionQualityRating),
  csatMannerRating: ratingLabel(t.evaluation?.serviceMannerRating),
  csatPermanentlyResolved: permanentlyResolvedLabel(t.evaluation?.isResolvedPermanently, lang),
  csatFeedbackComment: t.evaluation?.feedbackComment || '-',
  csatImprovementSuggestions: t.evaluation?.improvementSuggestions || '-',
});

const buildExportRecord = (t: ComplaintTicket, lang: Language) => ({
  ...identityFields(t, lang),
  ...caseFields(t, lang),
  ...timingFields(t),
  ...rootCauseFields(t, lang),
  ...csatFields(t, lang),
});

export type ExportRecord = ReturnType<typeof buildExportRecord>;

/**
 * Enriched analytics records, one per ticket (key order = JSON / CSV column order). Labels follow
 * the UI language; the keys never change, so `categoryNameTh` / `statusLabelTh` keep their names.
 */
export function buildExportRecords(
  filtered: ComplaintTicket[],
  lang: Language = 'th'
): ExportRecord[] {
  return filtered.map((t) => buildExportRecord(t, lang));
}

export interface CsvColumn {
  /** Thai header (the original text). */
  header: string;
  headerEn: string;
  key: keyof ExportRecord;
}

/** Single source of truth for the CSV header row and the per-row cells. */
export const CSV_COLUMNS: readonly CsvColumn[] = [
  { header: 'รหัสคำร้อง (Tracking Code)', headerEn: 'Tracking Code', key: 'trackingCode' },
  { header: 'วันที่และเวลายื่นเรื่อง (Created At)', headerEn: 'Created At', key: 'createdAt' },
  { header: 'ประเภทคำร้อง (Type)', headerEn: 'Type', key: 'type' },
  { header: 'รหัสหมวดหมู่ (Category Key)', headerEn: 'Category Key', key: 'categoryKey' },
  {
    header: 'ชื่อหมวดหมู่ภาษาไทย (Category Name)',
    headerEn: 'Category Name',
    key: 'categoryNameTh',
  },
  {
    header: 'หน่วยงานที่รับผิดชอบ (Responsible Dept)',
    headerEn: 'Responsible Dept',
    key: 'responsibleDept',
  },
  {
    header: 'สถานที่หรือหน่วยงานย่อย (Location/Unit)',
    headerEn: 'Location/Unit',
    key: 'locationOrUnit',
  },
  {
    header: 'ช่องทางสายตรงผู้บริหาร/Whistleblower (Direct CEO)',
    headerEn: 'Direct to CEO / Whistleblower',
    key: 'isDirectToExecutive',
  },
  {
    header: 'ระดับการปกปิดข้อมูล (Confidentiality)',
    headerEn: 'Confidentiality',
    key: 'confidentiality',
  },
  {
    header: 'สังกัดฝ่ายของผู้แจ้ง (Submitter Dept)',
    headerEn: 'Submitter Dept',
    key: 'submitterDepartment',
  },
  { header: 'หัวข้อเรื่องร้องเรียน (Title)', headerEn: 'Title', key: 'title' },
  { header: 'รายละเอียดข้อร้องเรียน (Description)', headerEn: 'Description', key: 'description' },
  { header: 'ระดับความเร่งด่วน (Urgency)', headerEn: 'Urgency', key: 'urgency' },
  { header: 'ระดับความเสี่ยง (Risk Severity)', headerEn: 'Risk Severity', key: 'riskSeverity' },
  { header: 'การวิเคราะห์ความรู้สึก AI (Sentiment)', headerEn: 'AI Sentiment', key: 'sentiment' },
  { header: 'รหัสสถานะ (Status Key)', headerEn: 'Status Key', key: 'status' },
  { header: 'สถานะการดำเนินงาน (Status Label)', headerEn: 'Status Label', key: 'statusLabelTh' },
  {
    header: 'เจ้าหน้าที่ผู้รับผิดชอบ (Assigned Officer)',
    headerEn: 'Assigned Officer',
    key: 'assignedOfficerName',
  },
  {
    header: 'เวลาคัดกรองเรื่อง ชม. (Triage Lead Time)',
    headerEn: 'Triage Lead Time (hrs)',
    key: 'triageLeadTimeHours',
  },
  {
    header: 'เวลาแก้ไขแล้วเสร็จ ชม. (Resolution Lead Time)',
    headerEn: 'Resolution Lead Time (hrs)',
    key: 'resolutionLeadTimeHours',
  },
  { header: 'วันที่แก้ไขเสร็จ (Resolved At)', headerEn: 'Resolved At', key: 'resolvedAt' },
  { header: 'วันที่ปิดเรื่องสมบูรณ์ (Closed At)', headerEn: 'Closed At', key: 'closedAt' },
  {
    header: 'หมวดหมู่สาเหตุรากเหง้า (Root Cause Category)',
    headerEn: 'Root Cause Category',
    key: 'rootCauseCategory',
  },
  {
    header: 'สรุปสาเหตุรากเหง้า (Root Cause Summary)',
    headerEn: 'Root Cause Summary',
    key: 'rootCauseSummary',
  },
  {
    header: 'แผนปฏิบัติการป้องกันการเกิดซ้ำ (CAPA Preventive Action)',
    headerEn: 'CAPA Preventive Action',
    key: 'preventiveActionPlan',
  },
  {
    header: 'กลุ่มปัญหาที่จัดคลัสเตอร์ (Cluster Group)',
    headerEn: 'Cluster Group',
    key: 'clusterGroup',
  },
  {
    header: 'สรุปผลการแก้ไข (Resolution Summary)',
    headerEn: 'Resolution Summary',
    key: 'resolutionSummary',
  },
  { header: 'ไฟล์แนบหลักฐาน (Attachments)', headerEn: 'Attachments', key: 'hasAttachments' },
  {
    header: 'คะแนนความพึงพอใจรวม (CSAT Overall)',
    headerEn: 'CSAT Overall',
    key: 'csatOverallScore',
  },
  { header: 'คะแนนความรวดเร็ว (CSAT Speed)', headerEn: 'CSAT Speed', key: 'csatSpeedRating' },
  {
    header: 'คะแนนคุณภาพการแก้ปัญหา (CSAT Quality)',
    headerEn: 'CSAT Quality',
    key: 'csatQualityRating',
  },
  {
    header: 'คะแนนกิริยามารยาทบริการ (CSAT Manner)',
    headerEn: 'CSAT Manner',
    key: 'csatMannerRating',
  },
  {
    header: 'ปัญหาได้รับการแก้ไขหายขาดหรือไม่ (Permanently Resolved)',
    headerEn: 'Permanently Resolved',
    key: 'csatPermanentlyResolved',
  },
  {
    header: 'ความคิดเห็นพนักงาน (CSAT Feedback)',
    headerEn: 'CSAT Feedback',
    key: 'csatFeedbackComment',
  },
  {
    header: 'ข้อเสนอแนะในการปรับปรุง (Improvement Suggestions)',
    headerEn: 'Improvement Suggestions',
    key: 'csatImprovementSuggestions',
  },
];

export function escapeCsv(val: unknown): string {
  if (val === undefined || val === null) return '""';
  const str = formatValue(val).replaceAll('"', '""');
  return `"${str}"`;
}

export function buildCsvContent(records: ExportRecord[], lang: Language = 'th'): string {
  const header = CSV_COLUMNS.map((c) => escapeCsv(lang === 'en' ? c.headerEn : c.header)).join(',');
  const rows = records.map((r) => CSV_COLUMNS.map((c) => escapeCsv(r[c.key])).join(','));
  return '﻿' + header + '\n' + rows.join('\n');
}

export interface JsonPayloadOptions {
  datasetType: string;
  filters: ExportFilters;
  metrics: ExportMetrics;
  exportedAt: string;
}

export function buildJsonPayload(records: ExportRecord[], options: Readonly<JsonPayloadOptions>) {
  return {
    metadata: {
      system: 'Enterprise Grievance & Whistleblower System',
      version: '3.0.0',
      exportedAt: options.exportedAt,
      datasetType: options.datasetType,
      totalRecords: records.length,
      filters: {
        department: options.filters.department,
        status: options.filters.status,
        timeRange: options.filters.timeRange,
      },
      summaryMetrics: options.metrics,
    },
    data: records,
  };
}
