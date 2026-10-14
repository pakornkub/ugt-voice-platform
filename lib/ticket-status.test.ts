import { describe, expect, it } from 'vitest';
import type { TicketStatus } from '@/types';
import {
  findStatusLabels,
  getStatusBadgeText,
  getStatusColor,
  getStepIndex,
  getStepState,
  INBOX_COUNTER_LABELS,
  isOpenStatus,
  isPendingStatus,
  isResolvedOrClosed,
  isWorkingStatus,
  serverStatusTextToEnglish,
  STATUS_LABELS,
  STATUS_ORDER,
  statusLabel,
  timelineActionText,
  WORKFLOW_STATUS_LABELS,
} from './ticket-status';

interface Row {
  status: TicketStatus;
  step: number;
  pending: boolean;
  open: boolean;
  finished: boolean;
  working: boolean;
}

const ROWS: Row[] = [
  { status: 'submitted', step: 0, pending: true, open: true, finished: false, working: false },
  {
    status: 'gatekeeper_triaged',
    step: 1,
    pending: true,
    open: true,
    finished: false,
    working: true,
  },
  { status: 'in_progress', step: 2, pending: false, open: true, finished: false, working: true },
  { status: 'resolved', step: 3, pending: false, open: false, finished: true, working: false },
  { status: 'closed', step: 4, pending: false, open: false, finished: true, working: false },
];

describe('ticket status order, steps and predicates', () => {
  it('lists the five statuses in lifecycle order', () => {
    expect(STATUS_ORDER).toEqual(ROWS.map((r) => r.status));
  });

  it.each(ROWS)('$status: step index and predicates', (row) => {
    expect(getStepIndex(row.status)).toBe(row.step);
    expect(isPendingStatus(row.status)).toBe(row.pending);
    expect(isOpenStatus(row.status)).toBe(row.open);
    expect(isResolvedOrClosed(row.status)).toBe(row.finished);
    expect(isWorkingStatus(row.status)).toBe(row.working);
  });

  it('treats an unknown status as the first step and in no group', () => {
    expect(getStepIndex('nope' as TicketStatus)).toBe(0);
    expect(isPendingStatus('nope')).toBe(false);
    expect(isOpenStatus('nope')).toBe(false);
    expect(isResolvedOrClosed('nope')).toBe(false);
    expect(isWorkingStatus('nope')).toBe(false);
  });

  it.each(ROWS.filter((r) => r.status !== 'closed'))(
    '$status: earlier steps are passed, its own step is current, later ones are idle',
    (row) => {
      STATUS_ORDER.forEach((_, idx) => {
        expect(getStepState(row.status, idx)).toEqual({
          isPassed: idx < row.step,
          isCurrent: idx === row.step,
        });
      });
    }
  );

  it('closed ticks all five steps and has no current one', () => {
    STATUS_ORDER.forEach((_, idx) => {
      expect(getStepState('closed', idx)).toEqual({ isPassed: true, isCurrent: false });
    });
  });
});

type WordingContext =
  'badge' | 'serverNotice' | 'timelineAction' | 'dashboard' | 'filter' | 'export';

// [th, en] per context — the wording each screen shows (or the server stores) today.
const LABELS: Record<TicketStatus, Record<WordingContext, [string, string]>> = {
  submitted: {
    badge: ['ยื่นเรื่องแล้ว (Submitted)', 'Submitted'],
    serverNotice: ['ยื่นเรื่องแล้ว (Submitted)', 'Submitted'],
    timelineAction: ['ยื่นเรื่องเข้าระบบ', 'Ticket submitted'],
    dashboard: ['รับเรื่องใหม่', 'Submitted'],
    filter: ['ยื่นเรื่องใหม่', 'Newly submitted'],
    export: ['ยื่นเรื่องใหม่', 'Newly submitted'],
  },
  gatekeeper_triaged: {
    badge: ['รับเรื่องแล้ว (Triaged)', 'Triaged'],
    serverNotice: ['หน่วยงานรับเรื่อง (Triaged)', 'Triaged'],
    timelineAction: [
      'Gatekeeper รับเรื่องและคัดกรองผู้รับผิดชอบ',
      'Gatekeeper received the ticket and screened for the responsible owner',
    ],
    dashboard: ['ส่งต่อหน่วยงาน', 'Triaged'],
    filter: ['รับเรื่องแล้ว (Triaged)', 'Triaged'],
    export: ['รับเรื่องแล้ว', 'Triaged'],
  },
  in_progress: {
    badge: ['กำลังแก้ไข (In Progress)', 'In Progress'],
    serverNotice: ['กำลังแก้ไข (In Progress)', 'In Progress'],
    timelineAction: ['อยู่ระหว่างลงพื้นที่และดำเนินการแก้ไข', 'On site and working on a fix'],
    dashboard: ['กำลังดำเนินการ', 'In Progress'],
    filter: ['กำลังแก้ไข (In Progress)', 'In Progress'],
    export: ['กำลังแก้ไข', 'In progress'],
  },
  resolved: {
    badge: ['แก้ไขเสร็จสิ้น (Resolved)', 'Resolved'],
    serverNotice: ['แก้ไขเสร็จสิ้น (Resolved)', 'Resolved'],
    timelineAction: ['ดำเนินการแก้ไขแล้วเสร็จ พร้อมส่งมอบงาน', 'Fix completed and handed over'],
    dashboard: ['แก้ไขแล้ว', 'Resolved'],
    filter: ['แก้ไขเสร็จสิ้น (Resolved)', 'Resolved'],
    export: ['แก้ไขเสร็จสิ้น', 'Resolved'],
  },
  closed: {
    badge: ['ปิดเรื่องสมบูรณ์ (Closed)', 'Closed'],
    serverNotice: ['ปิดเรื่องสมบูรณ์ (Closed)', 'Closed'],
    timelineAction: [
      'ปิดเรื่องและประเมินผลความพึงพอใจ',
      'Ticket closed and satisfaction evaluated',
    ],
    dashboard: ['ปิดเคส', 'Closed'],
    filter: ['ปิดเรื่องแล้ว (Closed)', 'Closed'],
    export: ['ปิดเรื่อง', 'Closed'],
  },
};

const CONTEXTS = Object.keys(LABELS.submitted) as WordingContext[];

describe('ticket status label contexts', () => {
  it.each(ROWS)('$status: every context keeps its own wording, TH and EN', ({ status }) => {
    for (const context of CONTEXTS) {
      const [th, en] = LABELS[status][context];
      expect(statusLabel(status, context, 'th')).toBe(th);
      expect(statusLabel(status, context, 'en')).toBe(en);
    }
  });

  it.each(ROWS)('$status: badge helpers read the badge context', ({ status }) => {
    expect(getStatusBadgeText(status, 'th')).toBe(LABELS[status].badge[0]);
    expect(getStatusBadgeText(status, 'en')).toBe(LABELS[status].badge[1]);
    expect(getStatusColor(status)).toMatch(/^bg-\S+ text-\S+ border-\S+/);
  });

  it('keeps the wording of the progress tracker', () => {
    expect(STATUS_ORDER.map((s) => STATUS_LABELS[s].step.label.en)).toEqual([
      'Submitted',
      'Triaged',
      'In Progress',
      'Resolved',
      'Evaluated & Closed',
    ]);
    expect(STATUS_ORDER.map((s) => STATUS_LABELS[s].step.label.th)).toEqual([
      'ยื่นเรื่องแล้ว',
      'รับเรื่องแล้ว',
      'กำลังดำเนินการแก้ไข',
      'แก้ไขแล้วเสร็จ',
      'ประเมินผลและปิดเรื่อง',
    ]);
    expect(STATUS_LABELS.gatekeeper_triaged.step.sub).toEqual({
      th: 'ผู้รับผิดชอบคัดกรอง',
      en: 'Gatekeeper assigned',
    });
  });

  it('keeps the inbox target and counter wording', () => {
    expect(WORKFLOW_STATUS_LABELS.gatekeeper_triaged).toEqual({
      th: 'รับเรื่อง (Triaged)',
      en: 'Triaged',
    });
    expect(WORKFLOW_STATUS_LABELS.closed).toEqual({ th: 'ปิดเรื่อง (Closed)', en: 'Closed' });
    expect(INBOX_COUNTER_LABELS.resolved).toEqual({ th: 'แก้ไขเสร็จ', en: 'Resolved' });
  });

  it('looks a status up by name, and only knows the five', () => {
    expect(findStatusLabels('closed')).toBe(STATUS_LABELS.closed);
    expect(findStatusLabels('nope')).toBeUndefined();
    expect(timelineActionText('resolved', 'th')).toBe('ดำเนินการแก้ไขแล้วเสร็จ พร้อมส่งมอบงาน');
    expect(timelineActionText('nope', 'th')).toBeUndefined();
  });

  it('maps the Thai text the server stores to English (statuses and timeline actions)', () => {
    const map = serverStatusTextToEnglish();
    for (const status of STATUS_ORDER) {
      const { serverNotice, timelineAction } = STATUS_LABELS[status];
      expect(map[serverNotice.th]).toBe(serverNotice.en);
      expect(map[timelineAction.th]).toBe(timelineAction.en);
    }
    expect(Object.keys(map)).toHaveLength(10);
  });
});
