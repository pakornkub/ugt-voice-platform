import { describe, expect, it } from 'vitest';
import { CATEGORY_DEFINITIONS } from '@/mockData';
import { localizeServerText } from '@/services/serverText';
import {
  RESOLVED_ANSWER,
  resolvedAnswer,
  SERVER_TEMPLATES,
  SERVER_TEXT,
  serverTextToEnglish,
  type ServerTemplate,
} from '@/lib/server-text';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/ticket-status';

// The safety net for the Thai the server stores: every phrase / sentence in lib/server-text.ts (and
// the status wording in lib/ticket-status.ts) must come back as its English through
// localizeServerText. A writer that adds a phrase to the catalog without its English fails here.

const en = (text: string) => localizeServerText(text, 'en');

describe('SERVER_TEXT — fixed phrases', () => {
  const entries = Object.entries(SERVER_TEXT);

  it.each(entries)('%s localizes to its English', (_key, { th, en: english }) => {
    expect(english.trim()).not.toBe('');
    expect(en(th)).toBe(english);
  });

  it('never gives one Thai string two different English wordings', () => {
    const seen = new Map<string, string>();
    for (const { th, en: english } of Object.values(SERVER_TEXT)) {
      expect(seen.get(th) ?? english).toBe(english);
      seen.set(th, english);
    }
  });

  it('is what serverTextToEnglish hands the exact-match map', () => {
    const map = serverTextToEnglish();
    for (const { th, en: english } of Object.values(SERVER_TEXT)) expect(map[th]).toBe(english);
  });
});

describe('ticket-status — the wording the server stores', () => {
  const rows = STATUS_ORDER.flatMap((status) => [
    [`${status} timelineAction`, STATUS_LABELS[status].timelineAction] as const,
    [`${status} serverNotice`, STATUS_LABELS[status].serverNotice] as const,
  ]);

  it.each(rows)('%s localizes to its English', (_label, { th, en: english }) => {
    expect(en(th)).toBe(english);
  });
});

describe('SERVER_TEMPLATES — sentences with varying parts', () => {
  const fraud = CATEGORY_DEFINITIONS.Fraud;

  // One or more sample argument sets per template. `enArgs` is what the English builder gets when an
  // argument is itself translated (a status, an actor, a category, a yes/no answer).
  // Typed against the catalog's keys: a new template without samples is a compile error.
  const SAMPLES: Record<keyof typeof SERVER_TEMPLATES, { args: string[]; enArgs?: string[] }[]> = {
    submittedTitle: [{ args: ['Wi-Fi ชั้น 18 ใช้งานไม่ได้'] }],
    submittedMessage: [{ args: ['TK-2026-1234', 'People & Culture Department'] }],
    directAlertMessage: [{ args: ['เงินทอนไม่ครบ', 'Fraud', 'Critical'] }],
    resolvedTitle: [{ args: ['TK-2026-0042'] }],
    progressTitle: [{ args: ['TK-2026-0001'] }],
    statusChangedMessage: STATUS_ORDER.flatMap((status) => [
      {
        args: [STATUS_LABELS[status].serverNotice.th, 'Gatekeeper Supervisor'],
        enArgs: [STATUS_LABELS[status].serverNotice.en, 'Gatekeeper Supervisor'],
      },
      {
        args: [STATUS_LABELS[status].serverNotice.th, SERVER_TEXT.protectedActorName.th],
        enArgs: [STATUS_LABELS[status].serverNotice.en, SERVER_TEXT.protectedActorName.en],
      },
    ]),
    chatStaffTitle: [{ args: ['TK-2026-0007'] }],
    chatComplainantTitle: [{ args: ['TK-2026-0007'] }],
    ratedTitle: [{ args: ['TK-2026-0042', '4'] }],
    ratedMessage: [true, false].map((isResolved) => ({
      args: ['4', resolvedAnswer(isResolved).th],
      enArgs: ['4', resolvedAnswer(isResolved).en],
    })),
    autoAssignAction: [{ args: ['สมหญิง ใจดี'] }],
    csatClosedAction: [{ args: ['1'] }, { args: ['5'] }],
    gatekeeperOfDepartment: [{ args: ['HR'] }, { args: [fraud.nameTh], enArgs: [fraud.nameEn] }],
    employeeSuffix: [{ args: ['สมศักดิ์ มั่นคง'] }],
  };

  const cases = (Object.keys(SERVER_TEMPLATES) as (keyof typeof SERVER_TEMPLATES)[]).flatMap(
    (key) => SAMPLES[key].map((sample, index) => [`${key} #${index + 1}`, key, sample] as const)
  );

  it('has samples for every template', () => {
    for (const key of Object.keys(SERVER_TEMPLATES)) {
      expect(SAMPLES[key as keyof typeof SERVER_TEMPLATES].length).toBeGreaterThan(0);
    }
  });

  it.each(cases)('%s: the stored Thai localizes to the builder English', (_label, key, sample) => {
    const builder: ServerTemplate = SERVER_TEMPLATES[key];
    expect(sample.args).toHaveLength(builder.segments.length - 1);
    const stored = builder.th(...sample.args);
    const english = builder.en(...(sample.enArgs ?? sample.args));
    expect(english).not.toBe(stored);
    expect(en(stored)).toBe(english);
  });

  it('stores the Thai of a template with its arguments between the literal segments', () => {
    expect(SERVER_TEMPLATES.ratedTitle.th('TK-2026-0042', '4')).toBe(
      '[ประเมินแล้ว] TK-2026-0042 · 4/5'
    );
    expect(SERVER_TEMPLATES.csatClosedAction.th('5')).toBe(
      'ประเมินความพึงพอใจ 5 ดาว และปิดเรื่อง (Closed)'
    );
    expect(SERVER_TEMPLATES.employeeSuffix.th('สมชาย')).toBe('สมชาย (พนักงาน)');
  });

  it('resolvedAnswer picks the yes / no wording', () => {
    expect(resolvedAnswer(true)).toBe(RESOLVED_ANSWER.yes);
    expect(resolvedAnswer(false)).toBe(RESOLVED_ANSWER.no);
  });
});
