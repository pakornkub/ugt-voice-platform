import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  prisma: { departmentGatekeeperConfig: { findFirst: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => db);

const {
  assigneeOf,
  chatMessageRow,
  evaluationRow,
  gatekeeperMailTo,
  readCategoryRoster,
  statusChangeRow,
  submissionRows,
} = await import('./ticket-events');

// The strings below are the rows lib/actions/tickets.ts stored before they moved here — a change
// to any of them is a change to what users see in the bell.
const REF = { id: 'tk1', trackingCode: 'TK-2026-0007' };

describe('submissionRows', () => {
  const ticket = {
    ...REF,
    title: 'น้ำไม่ไหล',
    category: 'Fraud',
    urgency: 'High',
    gatekeeperDepartment: 'Human Resources',
    isDirectToExecutive: false,
    submitterEmail: 'somchai@ube.com',
  };
  const receipt = {
    ticketId: 'tk1',
    trackingCode: 'TK-2026-0007',
    title: 'ยื่นเรื่องสำเร็จ: น้ำไม่ไหล...',
    message:
      'รหัสติดตามของคุณคือ TK-2026-0007 หน่วยงาน Human Resources ได้รับเรื่องเข้าสู่ระบบเรียบร้อยแล้ว',
    type: 'new_ticket',
    recipientRole: 'employee',
    recipientEmail: 'somchai@ube.com',
  };

  it('gives the submitter a receipt', () => {
    expect(submissionRows(ticket)).toEqual([receipt]);
  });

  it('adds a role-wide executive alert (no address) when the ticket goes straight up', () => {
    expect(submissionRows({ ...ticket, isDirectToExecutive: true })).toEqual([
      receipt,
      {
        ticketId: 'tk1',
        trackingCode: 'TK-2026-0007',
        title: '[CEO/EVP Alert] ข้อร้องเรียนสำคัญส่งตรงถึงผู้บริหาร',
        message: 'เรื่อง: น้ำไม่ไหล (หมวดหมู่: Fraud, ความเร่งด่วน: High)',
        type: 'direct_ceo_alert',
        recipientRole: 'executive',
      },
    ]);
  });

  it('keeps only the first 40 characters of the title in the receipt', () => {
    const [row] = submissionRows({ ...ticket, title: 'ก'.repeat(60) });
    expect(row.title).toBe(`ยื่นเรื่องสำเร็จ: ${'ก'.repeat(40)}...`);
  });
});

describe('statusChangeRow', () => {
  const ticket = { ...REF, submitterEmail: 'somchai@ube.co.th' };

  it.each([
    [
      'in_progress',
      'status_update',
      'อัปเดตความคืบหน้า (TK-2026-0007)',
      'เรื่องของคุณมีการเปลี่ยนสถานะเป็น "กำลังแก้ไข (In Progress)" โดย Gatekeeper Supervisor',
    ],
    [
      'resolved',
      'satisfaction_pending',
      'แก้ไขเสร็จสิ้น: รหัส TK-2026-0007',
      'หน่วยงานได้ดำเนินการแก้ไขปัญหาเรียบร้อยแล้ว กรุณาให้คะแนนประเมินความพึงพอใจเพื่อพัฒนาองค์กร',
    ],
  ] as const)('%s → %s for the submitter', (status, type, title, message) => {
    expect(statusChangeRow(ticket, status, 'Gatekeeper Supervisor')).toEqual({
      ticketId: 'tk1',
      trackingCode: 'TK-2026-0007',
      type,
      title,
      message,
      recipientRole: 'employee',
      recipientEmail: 'somchai@ube.co.th',
    });
  });

  it('passes a missing submitter address through as null', () => {
    expect(statusChangeRow({ ...ticket, submitterEmail: null }, 'closed', 'x').recipientEmail).toBe(
      null
    );
  });
});

describe('chatMessageRow', () => {
  const ticket = { ...REF, loginEmail: 'Employee@ube.co.th', submitterEmail: 'typed@ube.com' };

  it('staff → the submitter, by the normalised login email', () => {
    expect(
      chatMessageRow(ticket, { senderName: 'เจ้าหน้าที่', text: 'สวัสดี', isStaff: true })
    ).toEqual({
      ticketId: 'tk1',
      trackingCode: 'TK-2026-0007',
      title: '[ข้อความใหม่จากเจ้าหน้าที่] TK-2026-0007',
      message: 'เจ้าหน้าที่: สวัสดี',
      type: 'chat_message',
      recipientRole: 'employee',
      recipientEmail: 'employee@ube.com',
    });
  });

  it('staff → a legacy row without a login email falls back to the typed one, else null', () => {
    const staff = { senderName: 's', text: 't', isStaff: true };
    expect(chatMessageRow({ ...ticket, loginEmail: null }, staff).recipientEmail).toBe(
      'typed@ube.com'
    );
    expect(
      chatMessageRow({ ...ticket, loginEmail: null, submitterEmail: null }, staff).recipientEmail
    ).toBeNull();
  });

  it('submitter → the gatekeepers, no address, preview cut at 75 characters', () => {
    const row = chatMessageRow(ticket, {
      senderName: 'ผู้ยื่น',
      text: 'ก'.repeat(90),
      isStaff: false,
    });
    expect(row).toMatchObject({
      title: '[ข้อความใหม่จากผู้ร้องเรียน] TK-2026-0007',
      recipientRole: 'gatekeeper',
      recipientEmail: null,
    });
    expect(row.message).toBe(`ผู้ยื่น: ${'ก'.repeat(75)}...`);
  });

  it('does not add an ellipsis to a message of exactly 75 characters', () => {
    const row = chatMessageRow(ticket, { senderName: 'a', text: 'x'.repeat(75), isStaff: true });
    expect(row.message).toBe(`a: ${'x'.repeat(75)}`);
  });
});

describe('evaluationRow', () => {
  it.each([
    [true, 'ใช่'],
    [false, 'ไม่ใช่'],
  ])('rating with resolved-for-good=%s → staff bell only', (isResolvedPermanently, answer) => {
    expect(evaluationRow(REF, { overallScore: 4, isResolvedPermanently })).toEqual({
      ticketId: 'tk1',
      trackingCode: 'TK-2026-0007',
      type: 'evaluation_submitted',
      recipientRole: 'gatekeeper',
      title: '[ประเมินแล้ว] TK-2026-0007 · 4/5',
      message: `ผู้ยื่นให้คะแนน 4/5 · ปัญหาได้รับการแก้ไขถาวร: ${answer}`,
    });
  });
});

describe('category roster', () => {
  const A = { name: 'A', email: 'a@ube.co.th', isLead: false };
  const B = { name: 'B', email: 'b@ube.com', isLead: true };
  const C = { name: 'C', email: 'A@ube.com', isLead: false };
  const find = db.prisma.departmentGatekeeperConfig.findFirst;

  beforeEach(() => vi.clearAllMocks());

  it('reads the active, not-deleted officers oldest first, plus the escalation address', async () => {
    find.mockResolvedValue({ officers: [A, B], escalationEmail: 'esc@ube.com' });
    const roster = await readCategoryRoster('HR');
    expect(roster).toEqual({ officers: [A, B], escalationEmail: 'esc@ube.com' });
    expect(roster.officers[0]).toBe(A);
    expect(find).toHaveBeenCalledWith({
      where: { category: 'HR', isDeleted: false },
      select: {
        escalationEmail: true,
        officers: {
          where: { isActive: true, isDeleted: false },
          select: { name: true, email: true, isLead: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  });

  it('a category with no config row has no officers and no escalation address', async () => {
    find.mockResolvedValue(null);
    expect(await readCategoryRoster('HR')).toEqual({ officers: [], escalationEmail: null });
  });

  it.each([
    ['the Lead, wherever they sit', [A, B, C], B],
    ['the first officer when nobody is Lead', [A, C], A],
    ['nobody for an empty roster', [], null],
  ])('assignee: %s', (_label, officers, expected) => {
    expect(assigneeOf({ officers })).toBe(expected);
  });

  it.each([
    [
      'every officer, Lead included, de-duplicated across domains',
      [A, B, C],
      'esc@ube.com',
      'a@ube.com, b@ube.com',
    ],
    ['the officers even when an escalation address exists', [B], 'esc@ube.com', 'b@ube.com'],
    ['the escalation address for an empty roster', [], 'esc@ube.com', 'esc@ube.com'],
    ['nobody when there is neither', [], null, null],
  ])('To line: %s', (_label, officers, escalationEmail, expected) => {
    expect(gatekeeperMailTo({ officers, escalationEmail })).toBe(expected);
  });
});
