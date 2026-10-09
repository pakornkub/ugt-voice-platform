// lib/report-catalog.ts — the preset reports of the "SQL Query Studio" tab (rewiring slice 5,
// 2026-10-09). Client-safe on purpose (no Prisma, no server-only): the picker in
// src/components/export-analytics renders it and lib/reports.ts runs it. The five reports are the
// five example queries upstream shipped for its in-browser SQLite console, same intent and labels.

export const REPORT_IDS = [
  'category_pareto',
  'in_progress_tickets',
  'csat_by_category',
  'root_cause_breakdown',
  'direct_to_executive',
] as const;

export type ReportId = (typeof REPORT_IDS)[number];

export interface ReportDefinition {
  id: ReportId;
  labelTh: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  /** Thai headers — what the server returns, so the Thai CSV export stays as it was. */
  columns: readonly string[];
  /** English headers, same order; the client swaps them in when the UI is in English. */
  columnsEn: readonly string[];
}

/**
 * The cell lib/reports.ts writes where a ticket has no root cause. The server keeps returning the
 * Thai text; the client shows NOT_SPECIFIED_EN in English (the Server Action takes no language).
 */
export const NOT_SPECIFIED = 'ยังไม่ระบุ';
export const NOT_SPECIFIED_EN = 'Not specified';

export const REPORTS: readonly ReportDefinition[] = [
  {
    id: 'category_pareto',
    labelTh: 'สรุปภาพรวม & พาเรโต',
    labelEn: 'Pareto by Category',
    description: 'จำนวนเรื่องแยกตามหมวดหมู่ เรียงจากมากไปน้อย พร้อมสัดส่วนและจำนวนที่แก้ไขสำเร็จ',
    descriptionEn:
      'Ticket count per category, largest first, with each share and the number resolved.',
    columns: ['หมวดหมู่', 'จำนวนเคส', 'สัดส่วน %', 'แก้ไขสำเร็จ'],
    columnsEn: ['Category', 'Cases', 'Share %', 'Resolved'],
  },
  {
    id: 'in_progress_tickets',
    labelTh: 'ตรวจสอบเคสที่กำลังดำเนินการ',
    labelEn: 'In-Progress Tickets',
    description: 'เรื่องที่หน่วยงานรับเรื่องแล้วหรือกำลังแก้ไข เรียงจากเก่าไปใหม่',
    descriptionEn: 'Tickets the department has accepted or is working on, oldest first.',
    columns: ['รหัสคำร้อง', 'หมวดหมู่', 'หัวข้อ', 'ความเร่งด่วน', 'สถานะปัจจุบัน', 'ผู้รับผิดชอบ'],
    columnsEn: ['Tracking Code', 'Category', 'Title', 'Urgency', 'Current Status', 'Assigned To'],
  },
  {
    id: 'csat_by_category',
    labelTh: 'สรุปคะแนน CSAT และการแก้ปัญหาถาวร',
    labelEn: 'CSAT by Category',
    description: 'คะแนนความพึงพอใจเฉลี่ยแยกตามหมวดหมู่ และจำนวนเคสที่แก้ไขหายขาด',
    descriptionEn:
      'Average satisfaction scores per category, and the number of cases fixed permanently.',
    columns: [
      'หมวดหมู่',
      'จำนวนผู้ประเมิน',
      'คะแนนรวมเฉลี่ย',
      'ความเร็วเฉลี่ย',
      'คุณภาพเฉลี่ย',
      'แก้หายขาด (เคส)',
    ],
    columnsEn: [
      'Category',
      'Evaluations',
      'Avg. Overall Score',
      'Avg. Speed',
      'Avg. Quality',
      'Permanently Resolved (Cases)',
    ],
  },
  {
    id: 'root_cause_breakdown',
    labelTh: 'สาเหตุรากเหง้า',
    labelEn: 'RCA Category Breakdown',
    description: 'จำนวนเรื่องแยกตามสาเหตุรากเหง้า (RCA) และหมวดหมู่ที่พบ',
    descriptionEn: 'Ticket count per root cause (RCA), with the categories where each one appears.',
    columns: ['สาเหตุรากเหง้า (RCA)', 'จำนวนเรื่อง', 'หมวดหมู่ที่พบ'],
    columnsEn: ['Root Cause (RCA)', 'Tickets', 'Categories Found'],
  },
  {
    id: 'direct_to_executive',
    labelTh: 'ช่องทางสายตรงผู้บริหาร',
    labelEn: 'Whistleblower',
    description: 'เรื่องที่ส่งตรงถึงผู้บริหาร เรียงจากใหม่ไปเก่า (ไม่แสดงข้อมูลตัวตนผู้ยื่นเรื่อง)',
    descriptionEn:
      'Tickets sent directly to executives, newest first (the submitter identity is not shown).',
    columns: [
      'รหัสเคส',
      'หมวดหมู่',
      'หัวข้อ',
      'ระดับความลับ',
      'ความเร่งด่วน',
      'สถานะ',
      'วันที่แจ้ง',
    ],
    columnsEn: [
      'Case ID',
      'Category',
      'Title',
      'Confidentiality',
      'Urgency',
      'Status',
      'Reported On',
    ],
  },
];

export type ReportCell = string | number | null;

export interface ReportResult {
  columns: string[];
  rows: ReportCell[][];
  executionTimeMs: number;
}

/** Why a report did not run — the Server Action returns it (thrown messages are scrubbed in prod). */
export type ReportErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_REPORT' | 'FAILED';

export type RunReportResult = ({ ok: true } & ReportResult) | { ok: false; error: ReportErrorCode };

export const REPORT_ERROR_MESSAGES: Record<ReportErrorCode, { th: string; en: string }> = {
  UNAUTHORIZED: {
    th: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
    en: 'Your session has expired. Please sign in again.',
  },
  FORBIDDEN: {
    th: 'คุณไม่มีสิทธิ์รันรายงานนี้',
    en: 'You do not have permission to run this report.',
  },
  INVALID_REPORT: { th: 'ไม่พบรายงานที่เลือก', en: 'The selected report was not found.' },
  FAILED: {
    th: 'ไม่สามารถรันรายงานได้ กรุณาลองใหม่อีกครั้ง',
    en: 'The report could not be run. Please try again.',
  },
};
