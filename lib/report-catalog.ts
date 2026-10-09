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
  columns: readonly string[];
}

export const REPORTS: readonly ReportDefinition[] = [
  {
    id: 'category_pareto',
    labelTh: 'สรุปภาพรวม & พาเรโต',
    labelEn: 'Pareto by Category',
    description: 'จำนวนเรื่องแยกตามหมวดหมู่ เรียงจากมากไปน้อย พร้อมสัดส่วนและจำนวนที่แก้ไขสำเร็จ',
    columns: ['หมวดหมู่', 'จำนวนเคส', 'สัดส่วน %', 'แก้ไขสำเร็จ'],
  },
  {
    id: 'in_progress_tickets',
    labelTh: 'ตรวจสอบเคสที่กำลังดำเนินการ',
    labelEn: 'In-Progress Tickets',
    description: 'เรื่องที่หน่วยงานรับเรื่องแล้วหรือกำลังแก้ไข เรียงจากเก่าไปใหม่',
    columns: ['รหัสคำร้อง', 'หมวดหมู่', 'หัวข้อ', 'ความเร่งด่วน', 'สถานะปัจจุบัน', 'ผู้รับผิดชอบ'],
  },
  {
    id: 'csat_by_category',
    labelTh: 'สรุปคะแนน CSAT และการแก้ปัญหาถาวร',
    labelEn: 'CSAT by Category',
    description: 'คะแนนความพึงพอใจเฉลี่ยแยกตามหมวดหมู่ และจำนวนเคสที่แก้ไขหายขาด',
    columns: [
      'หมวดหมู่',
      'จำนวนผู้ประเมิน',
      'คะแนนรวมเฉลี่ย',
      'ความเร็วเฉลี่ย',
      'คุณภาพเฉลี่ย',
      'แก้หายขาด (เคส)',
    ],
  },
  {
    id: 'root_cause_breakdown',
    labelTh: 'สาเหตุรากเหง้า',
    labelEn: 'RCA Category Breakdown',
    description: 'จำนวนเรื่องแยกตามสาเหตุรากเหง้า (RCA) และหมวดหมู่ที่พบ',
    columns: ['สาเหตุรากเหง้า (RCA)', 'จำนวนเรื่อง', 'หมวดหมู่ที่พบ'],
  },
  {
    id: 'direct_to_executive',
    labelTh: 'ช่องทางสายตรงผู้บริหาร',
    labelEn: 'Whistleblower',
    description: 'เรื่องที่ส่งตรงถึงผู้บริหาร เรียงจากใหม่ไปเก่า (ไม่แสดงข้อมูลตัวตนผู้ยื่นเรื่อง)',
    columns: [
      'รหัสเคส',
      'หมวดหมู่',
      'หัวข้อ',
      'ระดับความลับ',
      'ความเร่งด่วน',
      'สถานะ',
      'วันที่แจ้ง',
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

export const REPORT_ERROR_MESSAGES: Record<ReportErrorCode, string> = {
  UNAUTHORIZED: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
  FORBIDDEN: 'คุณไม่มีสิทธิ์รันรายงานนี้',
  INVALID_REPORT: 'ไม่พบรายงานที่เลือก',
  FAILED: 'ไม่สามารถรันรายงานได้ กรุณาลองใหม่อีกครั้ง',
};
