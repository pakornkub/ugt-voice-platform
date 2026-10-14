// The one place that knows what a ticket status IS: the lifecycle order, the progress-step rule,
// the open / finished predicates and every piece of status wording. React-free, so client screens
// and Server Actions (lib/actions/tickets.ts) read the same table.
//
// Screens word the same status differently ON PURPOSE (a badge says "รับเรื่องแล้ว (Triaged)", the
// text the server stores says "หน่วยงานรับเรื่อง (Triaged)", the executive dashboard says "ส่งต่อหน่วยงาน").
// Each wording is its own context in STATUS_LABELS — never "fix" one to match another. The
// `serverNotice` and `timelineAction` Thai strings are STORED in the DB (notification / timeline
// text) and old rows are never rewritten, so changing them orphans the EN mapping in
// src/services/serverText.ts (which reads them from here).
import type { TicketStatus } from '@/types';

type Lang = 'th' | 'en';
export interface Bilingual {
  th: string;
  en: string;
}

/** Lifecycle order — also the progress-tracker order. */
export const STATUS_ORDER: readonly TicketStatus[] = [
  'submitted',
  'gatekeeper_triaged',
  'in_progress',
  'resolved',
  'closed',
];

// ── Progress tracker ────────────────────────────────────────────────────────

/** Index of the status in the five-step tracker; an unknown status counts as the first step. */
export function getStepIndex(status: TicketStatus): number {
  return Math.max(STATUS_ORDER.indexOf(status), 0);
}

/**
 * How one step of the tracker is drawn. Closed is the last step and nothing follows it, so it ticks
 * every step as passed (no step is "current").
 */
export function getStepState(
  status: TicketStatus,
  stepIndex: number
): { isPassed: boolean; isCurrent: boolean } {
  const isDone = status === 'closed';
  const current = getStepIndex(status);
  return { isPassed: stepIndex < current || isDone, isCurrent: stepIndex === current && !isDone };
}

// ── Predicates (the sets differ on purpose — pick the one the screen means) ──

const PENDING_STATUSES: readonly string[] = ['submitted', 'gatekeeper_triaged'];
const OPEN_STATUSES: readonly string[] = [...PENDING_STATUSES, 'in_progress'];
const FINISHED_STATUSES: readonly string[] = ['resolved', 'closed'];

/** Not yet being worked on: submitted or triaged. */
export const isPendingStatus = (status: string) => PENDING_STATUSES.includes(status);

/** Still open: submitted, triaged or in progress (resolved and closed are done). */
export const isOpenStatus = (status: string) => OPEN_STATUSES.includes(status);

/** Resolved OR closed — "finished" for dashboards, exports and reports. */
export const isResolvedOrClosed = (status: string) => FINISHED_STATUSES.includes(status);

/** Statuses the inbox / reports count as "in progress": triaged and in progress together. */
export const WORKING_STATUSES: readonly TicketStatus[] = ['in_progress', 'gatekeeper_triaged'];
export const isWorkingStatus = (status: string) =>
  (WORKING_STATUSES as readonly string[]).includes(status);

// ── Label contexts ──────────────────────────────────────────────────────────

export interface StatusLabels {
  /** Status badges on lists, the tracker header and the investigation report. */
  badge: Bilingual;
  /** The status named inside the notification text the server STORES (th = DB text). */
  serverNotice: Bilingual;
  /** The timeline action the server STORES when a status changes (th = DB text). */
  timelineAction: Bilingual;
  /** Executive dashboard row badge. */
  dashboard: Bilingual;
  /** Export-analytics status filter. */
  filter: Bilingual;
  /** Export-analytics file (the status column). */
  export: Bilingual;
  /** Progress tracker step: title and the line under it. */
  step: { label: Bilingual; sub: Bilingual };
}

export const STATUS_LABELS: Record<TicketStatus, StatusLabels> = {
  submitted: {
    badge: { th: 'ยื่นเรื่องแล้ว (Submitted)', en: 'Submitted' },
    serverNotice: { th: 'ยื่นเรื่องแล้ว (Submitted)', en: 'Submitted' },
    timelineAction: { th: 'ยื่นเรื่องเข้าระบบ', en: 'Ticket submitted' },
    dashboard: { th: 'รับเรื่องใหม่', en: 'Submitted' },
    filter: { th: 'ยื่นเรื่องใหม่', en: 'Newly submitted' },
    export: { th: 'ยื่นเรื่องใหม่', en: 'Newly submitted' },
    step: {
      label: { th: 'ยื่นเรื่องแล้ว', en: 'Submitted' },
      sub: { th: 'เข้าสู่ระบบแล้ว', en: 'Submitted to queue' },
    },
  },
  gatekeeper_triaged: {
    badge: { th: 'รับเรื่องแล้ว (Triaged)', en: 'Triaged' },
    serverNotice: { th: 'หน่วยงานรับเรื่อง (Triaged)', en: 'Triaged' },
    timelineAction: {
      th: 'Gatekeeper รับเรื่องและคัดกรองผู้รับผิดชอบ',
      en: 'Gatekeeper received the ticket and screened for the responsible owner',
    },
    dashboard: { th: 'ส่งต่อหน่วยงาน', en: 'Triaged' },
    filter: { th: 'รับเรื่องแล้ว (Triaged)', en: 'Triaged' },
    export: { th: 'รับเรื่องแล้ว', en: 'Triaged' },
    step: {
      label: { th: 'รับเรื่องแล้ว', en: 'Triaged' },
      sub: { th: 'ผู้รับผิดชอบคัดกรอง', en: 'Gatekeeper assigned' },
    },
  },
  in_progress: {
    badge: { th: 'กำลังแก้ไข (In Progress)', en: 'In Progress' },
    serverNotice: { th: 'กำลังแก้ไข (In Progress)', en: 'In Progress' },
    timelineAction: {
      th: 'อยู่ระหว่างลงพื้นที่และดำเนินการแก้ไข',
      en: 'On site and working on a fix',
    },
    dashboard: { th: 'กำลังดำเนินการ', en: 'In Progress' },
    filter: { th: 'กำลังแก้ไข (In Progress)', en: 'In Progress' },
    export: { th: 'กำลังแก้ไข', en: 'In progress' },
    step: {
      label: { th: 'กำลังดำเนินการแก้ไข', en: 'In Progress' },
      sub: { th: 'อยู่ระหว่างการแก้ไข', en: 'Action in progress' },
    },
  },
  resolved: {
    badge: { th: 'แก้ไขเสร็จสิ้น (Resolved)', en: 'Resolved' },
    serverNotice: { th: 'แก้ไขเสร็จสิ้น (Resolved)', en: 'Resolved' },
    timelineAction: {
      th: 'ดำเนินการแก้ไขแล้วเสร็จ พร้อมส่งมอบงาน',
      en: 'Fix completed and handed over',
    },
    dashboard: { th: 'แก้ไขแล้ว', en: 'Resolved' },
    filter: { th: 'แก้ไขเสร็จสิ้น (Resolved)', en: 'Resolved' },
    export: { th: 'แก้ไขเสร็จสิ้น', en: 'Resolved' },
    step: {
      label: { th: 'แก้ไขแล้วเสร็จ', en: 'Resolved' },
      sub: { th: 'สรุปแนวทางแก้ไข', en: 'Resolution implemented' },
    },
  },
  closed: {
    badge: { th: 'ปิดเรื่องสมบูรณ์ (Closed)', en: 'Closed' },
    serverNotice: { th: 'ปิดเรื่องสมบูรณ์ (Closed)', en: 'Closed' },
    timelineAction: {
      th: 'ปิดเรื่องและประเมินผลความพึงพอใจ',
      en: 'Ticket closed and satisfaction evaluated',
    },
    dashboard: { th: 'ปิดเคส', en: 'Closed' },
    filter: { th: 'ปิดเรื่องแล้ว (Closed)', en: 'Closed' },
    export: { th: 'ปิดเรื่อง', en: 'Closed' },
    step: {
      label: { th: 'ประเมินผลและปิดเรื่อง', en: 'Evaluated & Closed' },
      sub: { th: 'ปิดเคสเรียบร้อย', en: 'Completed' },
    },
  },
};

type StatusContext =
  'badge' | 'serverNotice' | 'timelineAction' | 'dashboard' | 'filter' | 'export';

/** The label table of a status, or undefined for a status this module does not know. */
export function findStatusLabels(status: string): StatusLabels | undefined {
  return (STATUS_LABELS as Partial<Record<string, StatusLabels>>)[status];
}

/** One wording of a status, e.g. `statusLabel('closed', 'badge', 'en')`. */
export function statusLabel(status: TicketStatus, context: StatusContext, lang: Lang): string {
  return STATUS_LABELS[status][context][lang];
}

/** The badge wording of a status (lists, tracker header, investigation report). */
export const getStatusBadgeText = (status: TicketStatus, lang: Lang) =>
  statusLabel(status, 'badge', lang);

/**
 * The timeline action text for a status change, or undefined for a status this table does not know
 * (callers fall back to the officer's note).
 */
export function timelineActionText(status: string, lang: Lang): string | undefined {
  return findStatusLabels(status)?.timelineAction[lang];
}

/** Triage-form target buttons (the inbox) — no "submitted": a ticket is never moved back to it. */
export const WORKFLOW_STATUS_LABELS: Readonly<
  Record<Exclude<TicketStatus, 'submitted'>, Bilingual>
> = {
  gatekeeper_triaged: { th: 'รับเรื่อง (Triaged)', en: 'Triaged' },
  in_progress: { th: 'กำลังแก้ไข (In Progress)', en: 'In Progress' },
  resolved: { th: 'แก้ไขเสร็จ (Resolved)', en: 'Resolved' },
  closed: { th: 'ปิดเรื่อง (Closed)', en: 'Closed' },
};

/** Short inbox counter / chip names for the statuses that have a card of their own. */
export const INBOX_COUNTER_LABELS: Readonly<
  Record<'in_progress' | 'resolved' | 'closed', Bilingual>
> = {
  in_progress: { th: 'กำลังแก้ไข', en: 'In Progress' },
  resolved: { th: 'แก้ไขเสร็จ', en: 'Resolved' },
  closed: { th: 'ปิดเรื่อง', en: 'Closed' },
};

/** Badge colour classes (Tailwind) per status. */
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

/**
 * Stored Thai text → English for the status wording the server writes (serverNotice + timelineAction),
 * used by src/services/serverText.ts so the EN mapping can never drift from what the server writes.
 */
export function serverStatusTextToEnglish(): Record<string, string> {
  const entries: [string, string][] = [];
  for (const status of STATUS_ORDER) {
    const { serverNotice, timelineAction } = STATUS_LABELS[status];
    entries.push([serverNotice.th, serverNotice.en], [timelineAction.th, timelineAction.en]);
  }
  return Object.fromEntries(entries);
}
