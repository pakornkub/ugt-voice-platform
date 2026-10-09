import { describe, expect, it } from 'vitest';
import type { ComplaintTicket, SatisfactionEvaluation } from '../../types';
import {
  CSV_COLUMNS,
  buildCsvContent,
  buildExportRecords,
  buildJsonPayload,
  computeMetrics,
  escapeCsv,
  filterTickets,
} from './exportData';

const ALL_FILTERS = { department: 'ALL', status: 'ALL', timeRange: 'ALL' };

function makeTicket(overrides: Partial<ComplaintTicket> = {}): ComplaintTicket {
  return {
    id: 't-1',
    trackingCode: 'TK-1',
    type: 'complaint',
    category: 'HR',
    title: 'Title',
    description: 'Description',
    isDirectToExecutive: false,
    confidentiality: 'standard_named',
    gatekeeperDepartment: 'Gate Dept',
    status: 'submitted',
    urgency: 'Low',
    riskSeverity: 'Low',
    attachments: [],
    timeline: [],
    createdAt: '2026-08-31T00:00:00.000Z',
    updatedAt: '2026-08-31T00:00:00.000Z',
    ...overrides,
  };
}

function makeEvaluation(overrides: Partial<SatisfactionEvaluation> = {}): SatisfactionEvaluation {
  return {
    id: 'e-1',
    ticketId: 't-1',
    overallScore: 4,
    speedRating: 5,
    resolutionQualityRating: 3,
    serviceMannerRating: 2,
    clarityRating: 4,
    isResolvedPermanently: true,
    feedbackComment: 'Good',
    improvementSuggestions: 'More staff',
    evaluatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('filterTickets', () => {
  const tickets = [
    makeTicket({ id: 'a', category: 'HR', status: 'submitted', createdAt: '2026-08-31T00:00:00Z' }),
    makeTicket({ id: 'b', category: 'Fraud', status: 'closed', createdAt: '2026-08-20T00:00:00Z' }),
    makeTicket({ id: 'c', category: 'HR', status: 'closed', createdAt: '2026-06-01T00:00:00Z' }),
  ];
  const ids = (list: ComplaintTicket[]) => list.map((t) => t.id);

  it('returns everything when all filters are ALL', () => {
    expect(ids(filterTickets(tickets, ALL_FILTERS))).toEqual(['a', 'b', 'c']);
  });

  it('filters by department', () => {
    expect(ids(filterTickets(tickets, { ...ALL_FILTERS, department: 'HR' }))).toEqual(['a', 'c']);
  });

  it('filters by status', () => {
    expect(ids(filterTickets(tickets, { ...ALL_FILTERS, status: 'closed' }))).toEqual(['b', 'c']);
  });

  it('combines department and status', () => {
    const result = filterTickets(tickets, { ...ALL_FILTERS, department: 'HR', status: 'closed' });
    expect(ids(result)).toEqual(['c']);
  });

  it.each([
    ['7d', ['a']],
    ['30d', ['a', 'b']],
    ['90d', ['a', 'b']],
  ])('measures the %s window from the fixed 2026-09-01 reference date', (timeRange, expected) => {
    expect(ids(filterTickets(tickets, { ...ALL_FILTERS, timeRange }))).toEqual(expected);
  });

  it('ignores an unknown time range and unparseable dates', () => {
    const odd = [makeTicket({ id: 'x', createdAt: 'not-a-date' })];
    expect(ids(filterTickets(tickets, { ...ALL_FILTERS, timeRange: 'forever' }))).toHaveLength(3);
    expect(ids(filterTickets(odd, { ...ALL_FILTERS, timeRange: '7d' }))).toEqual(['x']);
  });
});

describe('computeMetrics', () => {
  it('returns zeros for an empty list', () => {
    expect(computeMetrics([])).toEqual({
      total: 0,
      resolvedRate: 0,
      avgResolutionHours: 0,
      avgCsat: 0,
      directToCeoCount: 0,
    });
  });

  it('computes rate, resolution hours, CSAT and direct-to-CEO count', () => {
    const metrics = computeMetrics([
      makeTicket({
        id: '1',
        status: 'resolved',
        createdAt: '2026-08-30T00:00:00Z',
        resolvedAt: '2026-08-30T10:00:00Z',
        evaluation: makeEvaluation({ overallScore: 5 }),
        isDirectToExecutive: true,
      }),
      makeTicket({
        id: '2',
        status: 'closed',
        createdAt: '2026-08-30T00:00:00Z',
        resolvedAt: '2026-08-30T20:00:00Z',
        evaluation: makeEvaluation({ overallScore: 4 }),
      }),
      makeTicket({ id: '3', status: 'in_progress' }),
      makeTicket({ id: '4', status: 'submitted', evaluation: makeEvaluation({ overallScore: 0 }) }),
    ]);
    expect(metrics).toEqual({
      total: 4,
      resolvedRate: 50,
      avgResolutionHours: 15,
      avgCsat: 4.5,
      directToCeoCount: 1,
    });
  });

  it('falls back to 48 hours when no resolved ticket has a measurable duration', () => {
    const metrics = computeMetrics([
      makeTicket({ status: 'resolved' }),
      makeTicket({
        status: 'closed',
        createdAt: '2026-08-30T10:00:00Z',
        resolvedAt: '2026-08-30T10:00:00Z',
      }),
    ]);
    expect(metrics.avgResolutionHours).toBe(48);
    expect(metrics.resolvedRate).toBe(100);
    expect(metrics.avgCsat).toBe(0);
  });
});

describe('buildExportRecords', () => {
  it('maps a minimal ticket to the documented labels and "-" placeholders', () => {
    const [record] = buildExportRecords([makeTicket()]);
    expect(record).toMatchObject({
      trackingCode: 'TK-1',
      type: 'ข้อร้องเรียน (Complaint)',
      categoryKey: 'HR',
      categoryNameTh: expect.stringContaining('HR'),
      responsibleDept: expect.stringContaining('People'),
      locationOrUnit: '',
      isDirectToExecutive: 'ไม่ใช่ (Standard)',
      confidentiality: 'เปิดเผยชื่อ (Standard)',
      submitterDepartment: '-',
      sentiment: 'Neutral',
      statusLabelTh: 'ยื่นเรื่องใหม่',
      assignedOfficerName: '-',
      triageLeadTimeHours: '-',
      resolutionLeadTimeHours: '-',
      resolvedAt: '-',
      closedAt: '-',
      rootCauseCategory: '-',
      hasAttachments: 'ไม่มี',
      csatOverallScore: '-',
      csatPermanentlyResolved: '-',
      csatFeedbackComment: '-',
      csatImprovementSuggestions: '-',
    });
  });

  it.each([
    ['submitted', 'ยื่นเรื่องใหม่'],
    ['gatekeeper_triaged', 'รับเรื่องแล้ว'],
    ['in_progress', 'กำลังแก้ไข'],
    ['resolved', 'แก้ไขเสร็จสิ้น'],
    ['closed', 'ปิดเรื่อง'],
  ] as const)('labels status %s as %s', (status, label) => {
    expect(buildExportRecords([makeTicket({ status })])[0].statusLabelTh).toBe(label);
  });

  it.each([
    ['anonymous', 'ไม่ระบุตัวตน (Anonymous)', 'ปกปิด (Anonymous)'],
    ['confidential_restricted', 'ปิดเป็นความลับ (Confidential)', '-'],
    ['standard_named', 'เปิดเผยชื่อ (Standard)', '-'],
  ] as const)('labels confidentiality %s', (confidentiality, label, submitterDept) => {
    const [record] = buildExportRecords([makeTicket({ confidentiality })]);
    expect(record.confidentiality).toBe(label);
    expect(record.submitterDepartment).toBe(submitterDept);
  });

  it('computes triage and resolution lead times, attachments and CSAT values', () => {
    const [record] = buildExportRecords([
      makeTicket({
        type: 'suggestion',
        isDirectToExecutive: true,
        submitterDepartment: 'IT',
        status: 'resolved',
        createdAt: '2026-08-30T00:00:00Z',
        resolvedAt: '2026-08-30T12:30:00Z',
        timeline: [
          {
            id: 'l1',
            timestamp: '2026-08-30T02:00:00Z',
            actor: 'Gate',
            actorRole: 'gatekeeper',
            action: 'Triage completed',
            status: 'gatekeeper_triaged',
          },
        ],
        attachments: [{ id: 'f1', name: 'a.png', size: '1KB', type: 'image/png' }],
        evaluation: makeEvaluation({ isResolvedPermanently: false }),
      }),
    ]);
    expect(record).toMatchObject({
      type: 'ข้อเสนอแนะ (Suggestion)',
      isDirectToExecutive: 'ใช่ (CEO Direct / Whistleblower)',
      submitterDepartment: 'IT',
      triageLeadTimeHours: '2.0',
      resolutionLeadTimeHours: '12.5',
      hasAttachments: 'มี (1 ไฟล์)',
      csatOverallScore: '4/5',
      csatSpeedRating: '5/5',
      csatQualityRating: '3/5',
      csatMannerRating: '2/5',
      csatPermanentlyResolved: 'ไม่ใช่',
      csatFeedbackComment: 'Good',
      csatImprovementSuggestions: 'More staff',
    });
  });

  it('marks permanently resolved CSAT as ใช่ and ignores a non-positive lead time', () => {
    const [record] = buildExportRecords([
      makeTicket({
        createdAt: '2026-08-30T10:00:00Z',
        resolvedAt: '2026-08-30T09:00:00Z',
        evaluation: makeEvaluation({ isResolvedPermanently: true }),
      }),
    ]);
    expect(record.csatPermanentlyResolved).toBe('ใช่');
    expect(record.resolutionLeadTimeHours).toBe('-');
  });

  it('falls back to the gatekeeper department for an unknown category', () => {
    const [record] = buildExportRecords([
      makeTicket({ category: 'Unknown' as ComplaintTicket['category'] }),
    ]);
    expect(record.categoryNameTh).toBe('Unknown');
    expect(record.responsibleDept).toBe('Gate Dept');
  });

  it('exposes exactly the keys referenced by the CSV columns, in that order', () => {
    const [record] = buildExportRecords([makeTicket()]);
    expect(CSV_COLUMNS.map((c) => c.key)).toEqual(Object.keys(record));
  });
});

describe('CSV helpers', () => {
  it('escapeCsv quotes values, doubles inner quotes and blanks nullish values', () => {
    expect(escapeCsv('plain')).toBe('"plain"');
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsv(12)).toBe('"12"');
    expect(escapeCsv(null)).toBe('""');
    expect(escapeCsv(undefined)).toBe('""');
  });

  it('has 35 columns with unique keys and no SLA columns', () => {
    expect(CSV_COLUMNS).toHaveLength(35);
    expect(new Set(CSV_COLUMNS.map((c) => c.key)).size).toBe(35);
    expect(CSV_COLUMNS.some((c) => /SLA/i.test(c.header))).toBe(false);
  });

  it('buildCsvContent emits BOM, a header row and one row per record', () => {
    const records = buildExportRecords([
      makeTicket({ id: '1', trackingCode: 'TK-A', title: 'He said "no"' }),
      makeTicket({ id: '2', trackingCode: 'TK-B' }),
    ]);
    const csv = buildCsvContent(records);
    const lines = csv.split('\n');
    expect(csv.startsWith('﻿"รหัสคำร้อง (Tracking Code)"')).toBe(true);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('﻿' + CSV_COLUMNS.map((c) => `"${c.header}"`).join(','));
    expect(
      lines[1].startsWith('"TK-A","2026-08-31T00:00:00.000Z","ข้อร้องเรียน (Complaint)"')
    ).toBe(true);
    expect(lines[1]).toContain('"He said ""no"""');
    expect(lines[2].startsWith('"TK-B"')).toBe(true);
  });

  it('buildCsvContent yields just the header for no records', () => {
    expect(buildCsvContent([]).split('\n')).toHaveLength(2);
  });
});

describe('buildJsonPayload', () => {
  it('wraps the records with metadata, filters and summary metrics', () => {
    const records = buildExportRecords([makeTicket()]);
    const metrics = computeMetrics([makeTicket()]);
    const payload = buildJsonPayload(records, {
      datasetType: 'csat_quality',
      filters: { department: 'HR', status: 'ALL', timeRange: '7d' },
      metrics,
      exportedAt: '2026-09-01T00:00:00.000Z',
    });
    expect(payload.metadata).toEqual({
      system: 'Enterprise Grievance & Whistleblower System',
      version: '3.0.0',
      exportedAt: '2026-09-01T00:00:00.000Z',
      datasetType: 'csat_quality',
      totalRecords: 1,
      filters: { department: 'HR', status: 'ALL', timeRange: '7d' },
      summaryMetrics: metrics,
    });
    expect(payload.data).toBe(records);
  });
});

describe('English export', () => {
  const THAI = /[฀-๿]/;

  it('labels a minimal ticket in English', () => {
    const [record] = buildExportRecords([makeTicket()], 'en');
    expect(record).toMatchObject({
      type: 'Complaint',
      categoryKey: 'HR',
      categoryNameTh: 'HR – Human Resources & Employee Benefits',
      responsibleDept: 'People & Culture Department',
      isDirectToExecutive: 'No (Standard)',
      confidentiality: 'Named (Standard)',
      submitterDepartment: '-',
      statusLabelTh: 'Newly submitted',
      hasAttachments: 'None',
    });
  });

  it('drops the Thai text from every label it generates', () => {
    const [record] = buildExportRecords(
      [
        makeTicket({
          type: 'suggestion',
          isDirectToExecutive: true,
          confidentiality: 'anonymous',
          status: 'closed',
          attachments: [{ id: 'f1', name: 'a.png', size: '1KB', type: 'image/png' }],
          evaluation: makeEvaluation({ isResolvedPermanently: false }),
        }),
      ],
      'en'
    );
    expect(record).toMatchObject({
      type: 'Suggestion',
      isDirectToExecutive: 'Yes (CEO Direct / Whistleblower)',
      confidentiality: 'Anonymous',
      submitterDepartment: 'Anonymous',
      statusLabelTh: 'Closed',
      hasAttachments: 'Yes (1 file)',
      csatPermanentlyResolved: 'No',
    });
    expect(Object.values(record).filter((v) => typeof v === 'string' && THAI.test(v))).toEqual([]);
  });

  it.each([
    ['submitted', 'Newly submitted'],
    ['gatekeeper_triaged', 'Triaged'],
    ['in_progress', 'In progress'],
    ['resolved', 'Resolved'],
    ['closed', 'Closed'],
  ] as const)('labels status %s as %s', (status, label) => {
    expect(buildExportRecords([makeTicket({ status })], 'en')[0].statusLabelTh).toBe(label);
  });

  it('pluralises attachments and labels confidential and permanently resolved', () => {
    const files = [1, 2].map((n) => ({
      id: `f${n}`,
      name: 'a.png',
      size: '1KB',
      type: 'image/png',
    }));
    const [record] = buildExportRecords(
      [
        makeTicket({
          confidentiality: 'confidential_restricted',
          attachments: files,
          evaluation: makeEvaluation({ isResolvedPermanently: true }),
        }),
      ],
      'en'
    );
    expect(record).toMatchObject({
      confidentiality: 'Confidential',
      hasAttachments: 'Yes (2 files)',
      csatPermanentlyResolved: 'Yes',
    });
  });

  it('keeps an unknown category and its gatekeeper department as they are', () => {
    const [record] = buildExportRecords(
      [makeTicket({ category: 'Unknown' as ComplaintTicket['category'] })],
      'en'
    );
    expect(record.categoryNameTh).toBe('Unknown');
    expect(record.responsibleDept).toBe('Gate Dept');
  });

  it('has an English header for every column, same keys, nothing in Thai', () => {
    expect(CSV_COLUMNS.every((c) => c.headerEn && !THAI.test(c.headerEn))).toBe(true);
    expect(new Set(CSV_COLUMNS.map((c) => c.headerEn)).size).toBe(CSV_COLUMNS.length);
    expect(CSV_COLUMNS.some((c) => /SLA/i.test(c.headerEn))).toBe(false);
  });

  it('buildCsvContent writes the English header row, and the Thai one by default', () => {
    const records = buildExportRecords([makeTicket()], 'en');
    const en = buildCsvContent(records, 'en').split('\n');
    expect(en[0]).toBe('﻿' + CSV_COLUMNS.map((c) => `"${c.headerEn}"`).join(','));
    expect(en[1].startsWith('"TK-1","2026-08-31T00:00:00.000Z","Complaint"')).toBe(true);
    expect(buildCsvContent(buildExportRecords([makeTicket()])).split('\n')[0]).toBe(
      '﻿' + CSV_COLUMNS.map((c) => `"${c.header}"`).join(',')
    );
  });
});

describe('English export', () => {
  const THAI = /[฀-๿]/;

  it('labels a minimal ticket in English', () => {
    const [record] = buildExportRecords([makeTicket()], 'en');
    expect(record).toMatchObject({
      type: 'Complaint',
      categoryKey: 'HR',
      categoryNameTh: 'HR – Human Resources & Employee Benefits',
      responsibleDept: 'People & Culture Department',
      isDirectToExecutive: 'No (Standard)',
      confidentiality: 'Named (Standard)',
      submitterDepartment: '-',
      statusLabelTh: 'Newly submitted',
      hasAttachments: 'None',
    });
  });

  it('drops the Thai text from every label it generates', () => {
    const [record] = buildExportRecords(
      [
        makeTicket({
          type: 'suggestion',
          isDirectToExecutive: true,
          confidentiality: 'anonymous',
          status: 'closed',
          attachments: [{ id: 'f1', name: 'a.png', size: '1KB', type: 'image/png' }],
          evaluation: makeEvaluation({ isResolvedPermanently: false }),
        }),
      ],
      'en'
    );
    expect(record).toMatchObject({
      type: 'Suggestion',
      isDirectToExecutive: 'Yes (CEO Direct / Whistleblower)',
      confidentiality: 'Anonymous',
      submitterDepartment: 'Anonymous',
      statusLabelTh: 'Closed',
      hasAttachments: 'Yes (1 file)',
      csatPermanentlyResolved: 'No',
    });
    expect(Object.values(record).filter((v) => typeof v === 'string' && THAI.test(v))).toEqual([]);
  });

  it.each([
    ['submitted', 'Newly submitted'],
    ['gatekeeper_triaged', 'Triaged'],
    ['in_progress', 'In progress'],
    ['resolved', 'Resolved'],
    ['closed', 'Closed'],
  ] as const)('labels status %s as %s', (status, label) => {
    expect(buildExportRecords([makeTicket({ status })], 'en')[0].statusLabelTh).toBe(label);
  });

  it('pluralises attachments and labels confidential and permanently resolved', () => {
    const files = [1, 2].map((n) => ({
      id: `f${n}`,
      name: 'a.png',
      size: '1KB',
      type: 'image/png',
    }));
    const [record] = buildExportRecords(
      [
        makeTicket({
          confidentiality: 'confidential_restricted',
          attachments: files,
          evaluation: makeEvaluation({ isResolvedPermanently: true }),
        }),
      ],
      'en'
    );
    expect(record).toMatchObject({
      confidentiality: 'Confidential',
      hasAttachments: 'Yes (2 files)',
      csatPermanentlyResolved: 'Yes',
    });
  });

  it('keeps an unknown category and its gatekeeper department as they are', () => {
    const [record] = buildExportRecords(
      [makeTicket({ category: 'Unknown' as ComplaintTicket['category'] })],
      'en'
    );
    expect(record.categoryNameTh).toBe('Unknown');
    expect(record.responsibleDept).toBe('Gate Dept');
  });

  it('has an English header for every column, unique and with no Thai', () => {
    expect(CSV_COLUMNS.every((c) => c.headerEn && !THAI.test(c.headerEn))).toBe(true);
    expect(new Set(CSV_COLUMNS.map((c) => c.headerEn)).size).toBe(CSV_COLUMNS.length);
    expect(CSV_COLUMNS.some((c) => /SLA/i.test(c.headerEn))).toBe(false);
  });

  it('buildCsvContent writes the English header row, and the Thai one by default', () => {
    const records = buildExportRecords([makeTicket()], 'en');
    const en = buildCsvContent(records, 'en').split('\n');
    expect(en[0]).toBe('﻿' + CSV_COLUMNS.map((c) => `"${c.headerEn}"`).join(','));
    expect(en[1].startsWith('"TK-1","2026-08-31T00:00:00.000Z","Complaint"')).toBe(true);
    expect(buildCsvContent(buildExportRecords([makeTicket()])).split('\n')[0]).toBe(
      '﻿' + CSV_COLUMNS.map((c) => `"${c.header}"`).join(',')
    );
  });
});
