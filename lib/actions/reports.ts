'use server';

// lib/actions/reports.ts — runs one preset report of the "SQL Query Studio" tab (rewiring slice 5,
// 2026-10-09). session → permission → action → audit log. HR admin only, like the export button
// that opens the tab upstream; the report itself only sees the tickets the viewer may see
// (lib/reports.ts). The outcome is returned, not thrown: a thrown message is scrubbed in
// production, so the UI would never learn why a run was refused.
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { REPORT_IDS, type ReportErrorCode, type RunReportResult } from '@/lib/report-catalog';
import { canRunReports, runPresetReport } from '@/lib/reports';
import { requireTicketViewer } from '@/lib/ticket-access';
import type { TicketViewer } from '@/lib/ticket-scope';

// TODO(lead): replace with AUDIT_ACTIONS.REPORTS_RUN ('reports.run') once lib/audit-actions.ts has it.
const REPORTS_RUN_ACTION = 'reports.run';

const ReportInput = z.enum(REPORT_IDS);

function auditReportRun(viewer: TicketViewer, detail: object): void {
  prisma.activityLog
    .create({
      data: { userId: viewer.userId, action: REPORTS_RUN_ACTION, detail: JSON.stringify(detail) },
    })
    .catch(() => {}); // an audit failure must never fail the report itself
}

const refused = (error: ReportErrorCode): RunReportResult => ({ ok: false, error });

export async function runReport(reportId: unknown): Promise<RunReportResult> {
  let viewer: TicketViewer;
  try {
    viewer = await requireTicketViewer();
  } catch {
    return refused('UNAUTHORIZED');
  }
  if (!canRunReports(viewer)) return refused('FORBIDDEN');

  const parsed = ReportInput.safeParse(reportId);
  if (!parsed.success) return refused('INVALID_REPORT');

  try {
    const result = await runPresetReport(viewer, parsed.data);
    auditReportRun(viewer, { reportId: parsed.data, rows: result.rows.length });
    return { ok: true, ...result };
  } catch (error) {
    console.error('runReport failed', error);
    return refused('FAILED');
  }
}
