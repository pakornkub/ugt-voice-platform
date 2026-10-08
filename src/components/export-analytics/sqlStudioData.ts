import type { SqlResult } from './types';

export const DEFAULT_SQL = `-- รายงานวิเคราะห์จำนวนข้อร้องเรียนและอัตราแก้ไขสำเร็จ แยกตามหมวดหมู่
SELECT 
  category AS "หมวดหมู่",
  COUNT(*) AS "จำนวนเรื่องทั้งหมด",
  SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS "แก้ไขสำเร็จ",
  SUM(CASE WHEN is_direct_to_executive = 1 THEN 1 ELSE 0 END) AS "สายตรงผู้บริหาร"
FROM tickets
GROUP BY category
ORDER BY COUNT(*) DESC;`;

export interface PresetQuery {
  title: string;
  sql: string;
}

export const PRESET_QUERIES: readonly PresetQuery[] = [
  {
    title: '1. สรุปภาพรวม & พาเรโต (Pareto by Category)',
    sql: `SELECT 
  category AS "หมวดหมู่",
  COUNT(*) AS "จำนวนเคส",
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tickets), 1) || '%' AS "สัดส่วน %",
  SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS "แก้ไขสำเร็จ"
FROM tickets
GROUP BY category
ORDER BY COUNT(*) DESC;`,
  },
  {
    title: '2. ตรวจสอบเคสที่กำลังดำเนินการ (In-Progress Tickets)',
    sql: `SELECT 
  tracking_code AS "รหัสคำร้อง",
  category AS "หมวดหมู่",
  title AS "หัวข้อ",
  urgency AS "ความเร่งด่วน",
  status AS "สถานะปัจจุบัน",
  assigned_officer_name AS "ผู้รับผิดชอบ"
FROM tickets
WHERE status = 'in_progress' OR status = 'gatekeeper_triaged'
ORDER BY created_at ASC;`,
  },
  {
    title: '3. สรุปคะแนน CSAT และการแก้ปัญหาถาวร',
    sql: `SELECT 
  t.category AS "หมวดหมู่",
  COUNT(e.ticket_tracking_code) AS "จำนวนผู้ประเมิน",
  ROUND(AVG(e.overall_score), 2) AS "คะแนนรวมเฉลี่ย",
  ROUND(AVG(e.speed_rating), 2) AS "ความเร็วเฉลี่ย",
  ROUND(AVG(e.resolution_quality_rating), 2) AS "คุณภาพเฉลี่ย",
  SUM(e.is_resolved_permanently) AS "แก้หายขาด (เคส)"
FROM tickets t
JOIN ticket_evaluations e ON t.tracking_code = e.ticket_tracking_code
GROUP BY t.category;`,
  },
  {
    title: '4. สาเหตุรากเหง้า (RCA Category Breakdown)',
    sql: `SELECT 
  IFNULL(NULLIF(root_cause_category, ''), 'ยังไม่ระบุ') AS "สาเหตุรากเหง้า (RCA)",
  COUNT(*) AS "จำนวนเรื่อง",
  GROUP_CONCAT(DISTINCT category) AS "หมวดหมู่ที่พบ"
FROM tickets
GROUP BY root_cause_category
ORDER BY COUNT(*) DESC;`,
  },
  {
    title: '5. ช่องทางสายตรงผู้บริหาร (Whistleblower)',
    sql: `SELECT 
  tracking_code AS "รหัสเคส",
  category AS "หมวดหมู่",
  title AS "หัวข้อ",
  confidentiality AS "ระดับความลับ",
  urgency AS "ความเร่งด่วน",
  status AS "สถานะ",
  created_at AS "วันที่แจ้ง"
FROM tickets
WHERE is_direct_to_executive = 1
ORDER BY created_at DESC;`,
  },
];

export interface ResultGridCell {
  id: string;
  value: unknown;
}

export interface ResultGridRow {
  id: string;
  cells: ResultGridCell[];
}

export interface ResultGridColumn {
  id: string;
  label: string;
}

export interface ResultGrid {
  columns: ResultGridColumn[];
  rows: ResultGridRow[];
}

/**
 * Attach stable positional ids to SQL result columns/rows/cells so the table can
 * render with real keys (result sets have no natural identifiers; columns may repeat).
 */
export function buildResultGrid(result: Pick<SqlResult, 'columns' | 'rows'>): ResultGrid {
  return {
    columns: result.columns.map((label, c) => ({ id: `col-${c}`, label })),
    rows: result.rows.map((row, r) => ({
      id: `row-${r}`,
      cells: row.map((value, c) => ({ id: `cell-${r}-${c}`, value })),
    })),
  };
}
