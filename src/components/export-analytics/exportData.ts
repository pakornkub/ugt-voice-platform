import { CATEGORY_DEFINITIONS } from '../../mockData';
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

const STANDARD_CONFIDENTIALITY = 'เปิดเผยชื่อ (Standard)';
const CONFIDENTIALITY_LABELS: Partial<Record<ConfidentialityLevel, string>> = {
  anonymous: 'ไม่ระบุตัวตน (Anonymous)',
  confidential_restricted: 'ปิดเป็นความลับ (Confidential)',
};

const CLOSED_STATUS_LABEL = 'ปิดเรื่อง';
const STATUS_LABELS_TH: Partial<Record<TicketStatus, string>> = {
  submitted: 'ยื่นเรื่องใหม่',
  gatekeeper_triaged: 'รับเรื่องแล้ว',
  in_progress: 'กำลังแก้ไข',
  resolved: 'แก้ไขเสร็จสิ้น',
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

const permanentlyResolvedLabel = (value: boolean | undefined) => {
  if (value === undefined) return '-';
  return value ? 'ใช่' : 'ไม่ใช่';
};

const attachmentsLabel = (t: ComplaintTicket) => {
  const count = t.attachments?.length ?? 0;
  return count > 0 ? `มี (${count} ไฟล์)` : 'ไม่มี';
};

const identityFields = (t: ComplaintTicket) => {
  const category = CATEGORY_DEFINITIONS[t.category];
  return {
    trackingCode: t.trackingCode,
    createdAt: t.createdAt,
    type: t.type === 'complaint' ? 'ข้อร้องเรียน (Complaint)' : 'ข้อเสนอแนะ (Suggestion)',
    categoryKey: t.category,
    categoryNameTh: category?.nameTh || t.category,
    responsibleDept: category?.responsibleDept || t.gatekeeperDepartment || '',
    locationOrUnit: t.locationOrUnit || '',
    isDirectToExecutive: t.isDirectToExecutive
      ? 'ใช่ (CEO Direct / Whistleblower)'
      : 'ไม่ใช่ (Standard)',
    confidentiality: CONFIDENTIALITY_LABELS[t.confidentiality] ?? STANDARD_CONFIDENTIALITY,
    submitterDepartment:
      t.submitterDepartment || (t.confidentiality === 'anonymous' ? 'ปกปิด (Anonymous)' : '-'),
  };
};

const caseFields = (t: ComplaintTicket) => ({
  title: t.title,
  description: t.description,
  urgency: t.urgency,
  riskSeverity: t.riskSeverity,
  sentiment: t.sentiment || 'Neutral',
  status: t.status,
  statusLabelTh: STATUS_LABELS_TH[t.status] ?? CLOSED_STATUS_LABEL,
  assignedOfficerName: t.assignedOfficerName || '-',
});

const timingFields = (t: ComplaintTicket) => ({
  triageLeadTimeHours: leadTimeHours(t.createdAt, findTriageLog(t)?.timestamp) || '-',
  resolutionLeadTimeHours: leadTimeHours(t.createdAt, t.resolvedAt) || '-',
  resolvedAt: t.resolvedAt || '-',
  closedAt: t.closedAt || '-',
});

const rootCauseFields = (t: ComplaintTicket) => ({
  rootCauseCategory: t.rootCauseCategory || '-',
  rootCauseSummary: t.rootCauseSummary || '-',
  preventiveActionPlan: t.preventiveActionPlan || '-',
  clusterGroup: t.clusterGroup || '-',
  resolutionSummary: t.resolutionSummary || '-',
  hasAttachments: attachmentsLabel(t),
});

const csatFields = (t: ComplaintTicket) => ({
  csatOverallScore: ratingLabel(t.evaluation?.overallScore),
  csatSpeedRating: ratingLabel(t.evaluation?.speedRating),
  csatQualityRating: ratingLabel(t.evaluation?.resolutionQualityRating),
  csatMannerRating: ratingLabel(t.evaluation?.serviceMannerRating),
  csatPermanentlyResolved: permanentlyResolvedLabel(t.evaluation?.isResolvedPermanently),
  csatFeedbackComment: t.evaluation?.feedbackComment || '-',
  csatImprovementSuggestions: t.evaluation?.improvementSuggestions || '-',
});

const buildExportRecord = (t: ComplaintTicket) => ({
  ...identityFields(t),
  ...caseFields(t),
  ...timingFields(t),
  ...rootCauseFields(t),
  ...csatFields(t),
});

export type ExportRecord = ReturnType<typeof buildExportRecord>;

/** Enriched analytics records, one per ticket (key order = JSON / CSV column order). */
export function buildExportRecords(filtered: ComplaintTicket[]): ExportRecord[] {
  return filtered.map(buildExportRecord);
}

export interface CsvColumn {
  header: string;
  key: keyof ExportRecord;
}

/** Single source of truth for the CSV header row and the per-row cells. */
export const CSV_COLUMNS: readonly CsvColumn[] = [
  { header: 'รหัสคำร้อง (Tracking Code)', key: 'trackingCode' },
  { header: 'วันที่และเวลายื่นเรื่อง (Created At)', key: 'createdAt' },
  { header: 'ประเภทคำร้อง (Type)', key: 'type' },
  { header: 'รหัสหมวดหมู่ (Category Key)', key: 'categoryKey' },
  { header: 'ชื่อหมวดหมู่ภาษาไทย (Category Name)', key: 'categoryNameTh' },
  { header: 'หน่วยงานที่รับผิดชอบ (Responsible Dept)', key: 'responsibleDept' },
  { header: 'สถานที่หรือหน่วยงานย่อย (Location/Unit)', key: 'locationOrUnit' },
  { header: 'ช่องทางสายตรงผู้บริหาร/Whistleblower (Direct CEO)', key: 'isDirectToExecutive' },
  { header: 'ระดับการปกปิดข้อมูล (Confidentiality)', key: 'confidentiality' },
  { header: 'สังกัดฝ่ายของผู้แจ้ง (Submitter Dept)', key: 'submitterDepartment' },
  { header: 'หัวข้อเรื่องร้องเรียน (Title)', key: 'title' },
  { header: 'รายละเอียดข้อร้องเรียน (Description)', key: 'description' },
  { header: 'ระดับความเร่งด่วน (Urgency)', key: 'urgency' },
  { header: 'ระดับความเสี่ยง (Risk Severity)', key: 'riskSeverity' },
  { header: 'การวิเคราะห์ความรู้สึก AI (Sentiment)', key: 'sentiment' },
  { header: 'รหัสสถานะ (Status Key)', key: 'status' },
  { header: 'สถานะการดำเนินงาน (Status Label)', key: 'statusLabelTh' },
  { header: 'เจ้าหน้าที่ผู้รับผิดชอบ (Assigned Officer)', key: 'assignedOfficerName' },
  { header: 'เวลาคัดกรองเรื่อง ชม. (Triage Lead Time)', key: 'triageLeadTimeHours' },
  { header: 'เวลาแก้ไขแล้วเสร็จ ชม. (Resolution Lead Time)', key: 'resolutionLeadTimeHours' },
  { header: 'วันที่แก้ไขเสร็จ (Resolved At)', key: 'resolvedAt' },
  { header: 'วันที่ปิดเรื่องสมบูรณ์ (Closed At)', key: 'closedAt' },
  { header: 'หมวดหมู่สาเหตุรากเหง้า (Root Cause Category)', key: 'rootCauseCategory' },
  { header: 'สรุปสาเหตุรากเหง้า (Root Cause Summary)', key: 'rootCauseSummary' },
  {
    header: 'แผนปฏิบัติการป้องกันการเกิดซ้ำ (CAPA Preventive Action)',
    key: 'preventiveActionPlan',
  },
  { header: 'กลุ่มปัญหาที่จัดคลัสเตอร์ (Cluster Group)', key: 'clusterGroup' },
  { header: 'สรุปผลการแก้ไข (Resolution Summary)', key: 'resolutionSummary' },
  { header: 'ไฟล์แนบหลักฐาน (Attachments)', key: 'hasAttachments' },
  { header: 'คะแนนความพึงพอใจรวม (CSAT Overall)', key: 'csatOverallScore' },
  { header: 'คะแนนความรวดเร็ว (CSAT Speed)', key: 'csatSpeedRating' },
  { header: 'คะแนนคุณภาพการแก้ปัญหา (CSAT Quality)', key: 'csatQualityRating' },
  { header: 'คะแนนกิริยามารยาทบริการ (CSAT Manner)', key: 'csatMannerRating' },
  {
    header: 'ปัญหาได้รับการแก้ไขหายขาดหรือไม่ (Permanently Resolved)',
    key: 'csatPermanentlyResolved',
  },
  { header: 'ความคิดเห็นพนักงาน (CSAT Feedback)', key: 'csatFeedbackComment' },
  {
    header: 'ข้อเสนอแนะในการปรับปรุง (Improvement Suggestions)',
    key: 'csatImprovementSuggestions',
  },
];

export function escapeCsv(val: unknown): string {
  if (val === undefined || val === null) return '""';
  const str = formatValue(val).replaceAll('"', '""');
  return `"${str}"`;
}

export function buildCsvContent(records: ExportRecord[]): string {
  const header = CSV_COLUMNS.map((c) => escapeCsv(c.header)).join(',');
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
