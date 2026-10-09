import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { INITIAL_ROLE_PERMISSIONS } from '@/services/api';
import type { TicketViewer } from '@/lib/ticket-scope';
import type { UserRole } from '@/types';

const db = vi.hoisted(() => {
  const prisma = {
    ticket: { create: vi.fn(), update: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});
const access = vi.hoisted(() => ({
  requireTicketViewer: vi.fn(),
  findVisibleTicket: vi.fn(),
  findVisibleTicketWithRelations: vi.fn(),
  listVisibleTickets: vi.fn(),
  TICKET_INCLUDE: {},
}));

const mail = vi.hoisted(() => ({
  mailActorFor: vi.fn(),
  notifyTicketSubmitted: vi.fn(),
  notifyTicketResolved: vi.fn(),
}));

vi.mock('@/lib/prisma', () => db);
vi.mock('@/lib/email-notifications', () => mail);
vi.mock('@/lib/ticket-access', () => access);

const {
  getTicketByTrackingCode,
  getTickets,
  sendAnonymousChatMessage,
  submitEvaluation,
  submitTicket,
  updateTicketWorkflow,
} = await import('./tickets');

const viewer = (role: UserRole): TicketViewer => ({
  userId: `user-${role}`,
  email: `${role}@ube.co.th`,
  name: `Session ${role}`,
  rbacRoleName: null,
  role,
  config: INITIAL_ROLE_PERMISSIONS[role],
  gatekeeperCategories: ['HR'],
});

const NOW = new Date('2026-10-09T00:00:00Z');
const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'tk1',
  trackingCode: 'TK-2026-1111',
  type: 'complaint',
  category: 'HR',
  title: 'เรื่องทดสอบ',
  description: 'รายละเอียด',
  locationOrUnit: null,
  isDirectToExecutive: false,
  confidentiality: 'standard_named',
  submitterName: 'สมชาย',
  submitterEmployeeId: 'EMP001',
  submitterDepartment: 'HR',
  submitterEmail: 'somchai@ube.co.th',
  submitterPhone: null,
  loginEmail: 'employee@ube.co.th',
  isAnonymousMapped: false,
  gatekeeperDepartment: 'Human Resources',
  assignedOfficerName: null,
  assignedOfficerEmail: null,
  status: 'submitted',
  urgency: 'Medium',
  riskSeverity: 'Moderate',
  sentiment: null,
  clusterGroup: null,
  rootCauseCategory: null,
  rootCauseSummary: null,
  preventiveActionPlan: null,
  resolutionSummary: null,
  resolvedAt: null,
  closedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const payload = {
  type: 'complaint' as const,
  category: 'HR' as const,
  title: 'เรื่องทดสอบ',
  description: 'รายละเอียด',
  isDirectToExecutive: false,
  confidentiality: 'standard_named' as const,
  submitterName: 'สมชาย',
  submitterEmail: 'somchai@ube.co.th',
  loginEmail: 'someone-else@ube.co.th',
  gatekeeperDepartment: 'Human Resources',
  urgency: 'Medium' as const,
  riskSeverity: 'Moderate' as const,
  attachments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.prisma.$transaction.mockImplementation((fn: (tx: typeof db.prisma) => unknown) =>
    fn(db.prisma)
  );
  db.prisma.activityLog.create.mockResolvedValue({});
  db.prisma.notification.create.mockResolvedValue({});
  db.prisma.notification.createMany.mockResolvedValue({});
  access.requireTicketViewer.mockResolvedValue(viewer('employee'));
  mail.mailActorFor.mockReturnValue({ email: 'employee@ube.co.th', hasDevMode: false });
  mail.notifyTicketSubmitted.mockResolvedValue(undefined);
  mail.notifyTicketResolved.mockResolvedValue(undefined);
});

describe('reads', () => {
  it('lists and looks up only through the viewer scope', async () => {
    access.listVisibleTickets.mockResolvedValue([]);
    access.findVisibleTicketWithRelations.mockResolvedValue(null);

    await getTickets();
    await getTicketByTrackingCode('  TK-2026-1111 ');

    expect(access.listVisibleTickets).toHaveBeenCalledWith(viewer('employee'));
    expect(access.findVisibleTicketWithRelations).toHaveBeenCalledWith(viewer('employee'), {
      trackingCode: 'TK-2026-1111',
    });
  });

  it('refuses callers without a session / app role', async () => {
    access.requireTicketViewer.mockRejectedValue(new Error('UNAUTHORIZED'));
    await expect(getTickets()).rejects.toThrow('UNAUTHORIZED');
  });
});

describe('submitTicket', () => {
  it('refuses a submitter email that is not one plain address', async () => {
    await expect(
      submitTicket({ ...payload, submitterEmail: 'a@x.com, b@y.com' })
    ).rejects.toThrow();
    expect(db.prisma.ticket.create).not.toHaveBeenCalled();
  });

  it('stamps the session login email, writes the notification and the audit log', async () => {
    db.prisma.ticket.create.mockImplementation(async ({ data }) =>
      row({ ...data, timeline: [], id: 'tk-new' })
    );

    const ticket = await submitTicket(payload);

    const { data } = db.prisma.ticket.create.mock.calls[0][0];
    expect(data.loginEmail).toBe('employee@ube.co.th');
    expect(data.createdBy).toBe('user-employee');
    expect(data.trackingCode).toMatch(/^TK-\d{4}-\d{4}$/);
    expect(data.timeline.create).toMatchObject({
      actor: 'สมชาย',
      notes: 'ระบบได้รับเรื่องและเข้าสู่คิวคัดกรองของ Gatekeeper',
    });
    expect(db.prisma.notification.createMany.mock.calls[0][0].data).toHaveLength(1);
    expect(db.prisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-employee', action: 'tickets.submit' }),
    });
    expect(ticket).toMatchObject({ id: 'tk-new', status: 'submitted' });
  });

  it('emails the category gatekeeper after the save, without waiting for or failing on the mail', async () => {
    db.prisma.ticket.create.mockImplementation(async ({ data }) =>
      row({ ...data, timeline: [], id: 'tk-new' })
    );
    mail.notifyTicketSubmitted.mockReturnValue(new Promise(() => {})); // SMTP still pending

    const ticket = await submitTicket(payload);

    expect(ticket.id).toBe('tk-new');
    expect(mail.notifyTicketSubmitted).toHaveBeenCalledTimes(1);
    const [notified, ctx] = mail.notifyTicketSubmitted.mock.calls[0];
    expect(notified).toMatchObject({ id: 'tk-new', category: 'HR' });
    expect(ctx).toEqual({
      actor: { email: 'employee@ube.co.th', hasDevMode: false },
      userId: 'user-employee',
    });
    expect(db.prisma.$transaction.mock.invocationCallOrder[0]).toBeLessThan(
      mail.notifyTicketSubmitted.mock.invocationCallOrder[0]
    );
  });

  it('does not email anyone when the ticket was not saved', async () => {
    db.prisma.ticket.create.mockRejectedValue(new Error('db down'));
    await expect(submitTicket(payload)).rejects.toThrow('db down');
    expect(mail.notifyTicketSubmitted).not.toHaveBeenCalled();
  });

  it('hides the anonymous submitter in the timeline and alerts executives on direct tickets', async () => {
    db.prisma.ticket.create.mockImplementation(async ({ data }) => row({ ...data, timeline: [] }));

    await submitTicket({ ...payload, confidentiality: 'anonymous', isDirectToExecutive: true });

    const { data } = db.prisma.ticket.create.mock.calls[0][0];
    expect(data.isAnonymousMapped).toBe(true);
    expect(data.timeline.create.actor).toBe('พนักงานผู้ยื่นเรื่อง (ไม่ระบุตัวตน)');
    expect(data.timeline.create.notes).toContain('ยื่นเรื่องแบบไม่ระบุตัวตน');
    const notifs = db.prisma.notification.createMany.mock.calls[0][0].data;
    expect(notifs.map((n: { type: string }) => n.type)).toEqual(['new_ticket', 'direct_ceo_alert']);
  });

  it('writes the ticket and its notifications in one transaction', async () => {
    db.prisma.ticket.create.mockImplementation(async ({ data }) => row({ ...data, timeline: [] }));
    const order: string[] = [];
    db.prisma.$transaction.mockImplementation(async (fn: (tx: typeof db.prisma) => unknown) => {
      order.push('begin');
      const result = await fn(db.prisma);
      order.push('commit');
      return result;
    });
    db.prisma.notification.createMany.mockImplementation(async () => order.push('notifications'));

    await submitTicket(payload);

    expect(order).toEqual(['begin', 'notifications', 'commit']);
  });

  it('retries a tracking-code collision', async () => {
    const collision = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
    });
    db.prisma.ticket.create
      .mockRejectedValueOnce(collision)
      .mockImplementation(async ({ data }) => row({ ...data, timeline: [] }));

    await submitTicket(payload);

    expect(db.prisma.ticket.create).toHaveBeenCalledTimes(2);
  });

  it('rejects values outside the src/types.ts unions', async () => {
    await expect(
      submitTicket({ ...payload, category: 'Environment' as unknown as 'HR' })
    ).rejects.toThrow();
    expect(db.prisma.ticket.create).not.toHaveBeenCalled();
  });

  it('refuses a role without the submit tab', async () => {
    access.requireTicketViewer.mockResolvedValue(viewer('gatekeeper'));
    await expect(submitTicket(payload)).rejects.toThrow('FORBIDDEN');
    expect(db.prisma.ticket.create).not.toHaveBeenCalled();
  });
});

describe('updateTicketWorkflow', () => {
  const note = { actorName: 'สมชาย', actorRole: 'Employee', actionNote: 'ขอสอบถาม' };

  it('returns null for a ticket outside the viewer scope', async () => {
    access.findVisibleTicket.mockResolvedValue(null);
    expect(await updateTicketWorkflow('tk1', note)).toBeNull();
    expect(db.prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('lets the employee add a note but not change the status', async () => {
    access.findVisibleTicket.mockResolvedValue(row());
    db.prisma.ticket.update.mockResolvedValue(row());

    await updateTicketWorkflow('tk1', note);
    await expect(updateTicketWorkflow('tk1', { ...note, status: 'closed' })).rejects.toThrow(
      'FORBIDDEN'
    );

    expect(db.prisma.ticket.update).toHaveBeenCalledTimes(1);
    expect(db.prisma.notification.create.mock.calls[0][0].data).toMatchObject({
      type: 'status_update',
      recipientEmail: 'somchai@ube.co.th',
    });
  });

  it('never lets the client choose the timeline actor', async () => {
    // employee (the submitter) claims to be staff
    access.findVisibleTicket.mockResolvedValue(row());
    db.prisma.ticket.update.mockResolvedValue(row());
    await updateTicketWorkflow('tk1', {
      actorName: 'Gatekeeper Supervisor',
      actorRole: 'Gatekeeper Lead',
      actionNote: 'ปิดเรื่องแล้ว',
    });
    expect(db.prisma.ticket.update.mock.calls[0][0].data.timeline.create).toMatchObject({
      actor: 'สมชาย',
      actorRole: 'Employee',
    });

    // a gatekeeper's plain note is signed with their session name, not the submitter's
    access.requireTicketViewer.mockResolvedValue(viewer('gatekeeper'));
    await updateTicketWorkflow('tk1', note);
    expect(db.prisma.ticket.update.mock.calls[1][0].data.timeline.create).toMatchObject({
      actor: 'Session gatekeeper',
      actorRole: 'Gatekeeper',
    });

    // triage always carries upstream's triage label
    await updateTicketWorkflow('tk1', { status: 'in_progress', actorName: 'สมชาย' });
    expect(db.prisma.ticket.update.mock.calls[2][0].data.timeline.create).toMatchObject({
      actor: 'Gatekeeper Supervisor',
      actorRole: 'Gatekeeper Lead',
    });
  });

  it('keeps upstream labels for the submitter (TH/EN) and protects a confidential name', async () => {
    access.findVisibleTicket.mockResolvedValue(row({ confidentiality: 'anonymous' }));
    db.prisma.ticket.update.mockResolvedValue(row());
    await updateTicketWorkflow('tk1', { actorName: 'Employee (Anonymous)', actionNote: 'x' });
    expect(db.prisma.ticket.update.mock.calls[0][0].data.timeline.create.actor).toBe(
      'Employee (Anonymous)'
    );

    access.findVisibleTicket.mockResolvedValue(row({ confidentiality: 'confidential_restricted' }));
    await updateTicketWorkflow('tk1', note);
    expect(db.prisma.notification.create.mock.calls[1][0].data.message).toContain(
      'โดย พนักงานผู้ร้องเรียน (ปกปิดตัวตน)'
    );
  });

  it('returns the ticket redacted for the caller', async () => {
    access.requireTicketViewer.mockResolvedValue(viewer('gatekeeper'));
    access.findVisibleTicket.mockResolvedValue(row({ confidentiality: 'anonymous' }));
    db.prisma.ticket.update.mockResolvedValue(row({ confidentiality: 'anonymous', timeline: [] }));

    const updated = await updateTicketWorkflow('tk1', note);

    expect(updated?.loginEmail).toBeUndefined();
    expect(updated?.submitterEmployeeId).toBeUndefined();
  });

  it('lets a gatekeeper resolve and asks the submitter for a CSAT', async () => {
    access.requireTicketViewer.mockResolvedValue(viewer('gatekeeper'));
    access.findVisibleTicket.mockResolvedValue(row());
    db.prisma.ticket.update.mockResolvedValue(row({ status: 'resolved' }));

    const updated = await updateTicketWorkflow('tk1', {
      status: 'resolved',
      urgency: 'High',
      actorName: 'Gatekeeper Supervisor',
      actorRole: 'Gatekeeper Lead',
    });

    const { data } = db.prisma.ticket.update.mock.calls[0][0];
    expect(data).toMatchObject({
      status: 'resolved',
      urgency: 'High',
      updatedBy: 'user-gatekeeper',
    });
    expect(data.resolvedAt).toBeInstanceOf(Date);
    expect(data.timeline.create.action).toBe('ดำเนินการแก้ไขแล้วเสร็จ พร้อมส่งมอบงาน');
    expect(db.prisma.notification.create.mock.calls[0][0].data.type).toBe('satisfaction_pending');
    expect(db.prisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'tickets.update' }),
    });
    expect(updated?.status).toBe('resolved');
  });
});

describe('updateTicketWorkflow — resolved email', () => {
  const resolve = { status: 'resolved' as const, resolutionSummary: 'แก้แล้ว' };

  beforeEach(() => {
    access.requireTicketViewer.mockResolvedValue(viewer('gatekeeper'));
    access.findVisibleTicket.mockResolvedValue(row({ status: 'in_progress' }));
    db.prisma.ticket.update.mockResolvedValue(row({ status: 'resolved' }));
  });

  it('emails the submitter once, when the ticket becomes resolved', async () => {
    await updateTicketWorkflow('tk1', resolve);

    expect(mail.notifyTicketResolved).toHaveBeenCalledTimes(1);
    const [notified, details, ctx] = mail.notifyTicketResolved.mock.calls[0];
    expect(notified).toMatchObject({ id: 'tk1', status: 'resolved' });
    // the real officer's name, as upstream's mail showed — not the generic triage label
    expect(details).toEqual({ resolvedBy: 'Session gatekeeper', resolutionNotes: 'แก้แล้ว' });
    expect(ctx.userId).toBe('user-gatekeeper');
  });

  it('falls back to the action note, then to the default summary', async () => {
    await updateTicketWorkflow('tk1', { status: 'resolved', actionNote: 'หมายเหตุ' });
    expect(mail.notifyTicketResolved.mock.calls[0][1].resolutionNotes).toBe('หมายเหตุ');

    await updateTicketWorkflow('tk1', { status: 'resolved' });
    expect(mail.notifyTicketResolved.mock.calls[1][1].resolutionNotes).toContain(
      'ตามมาตรฐานการปฏิบัติงาน'
    );
  });

  it('does not email for other status changes', async () => {
    db.prisma.ticket.update.mockResolvedValue(row({ status: 'in_progress' }));
    await updateTicketWorkflow('tk1', { status: 'in_progress' });
    expect(mail.notifyTicketResolved).not.toHaveBeenCalled();
  });

  it('does not email again for a later note on an already resolved ticket', async () => {
    access.requireTicketViewer.mockResolvedValue(viewer('employee'));
    access.findVisibleTicket.mockResolvedValue(row({ status: 'resolved' }));
    db.prisma.ticket.update.mockResolvedValue(row({ status: 'resolved' }));

    await updateTicketWorkflow('tk1', { actorName: 'สมชาย', actionNote: 'ขอบคุณ' });
    access.requireTicketViewer.mockResolvedValue(viewer('gatekeeper'));
    await updateTicketWorkflow('tk1', resolve); // re-saving 'resolved' is not a new transition
    expect(mail.notifyTicketResolved).not.toHaveBeenCalled();
  });
});

describe('sendAnonymousChatMessage', () => {
  it('refuses posting as a role the caller does not hold', async () => {
    await expect(sendAnonymousChatMessage('tk1', 'hi', 'gatekeeper')).rejects.toThrow('FORBIDDEN');
  });

  it('writes the message, timeline entry and counterpart notification, never logging the body', async () => {
    access.requireTicketViewer.mockResolvedValue(viewer('gatekeeper'));
    access.findVisibleTicket.mockResolvedValue(row());
    db.prisma.ticket.update.mockResolvedValue(row());

    await sendAnonymousChatMessage('tk1', '  ขอรายละเอียดเพิ่ม  ', 'gatekeeper');

    const { data } = db.prisma.ticket.update.mock.calls[0][0];
    expect(data.anonymousMessages.create).toMatchObject({
      message: 'ขอรายละเอียดเพิ่ม',
      isStaff: true,
      isReadByStaff: true,
      senderDisplayName: 'Gatekeeper ประจำฝ่าย Human Resources',
    });
    expect(data.timeline.create.notes).toBe('[Anonymous Q&A] ขอรายละเอียดเพิ่ม');
    expect(db.prisma.notification.create.mock.calls[0][0].data.recipientRole).toBe('employee');
    const audit = db.prisma.activityLog.create.mock.calls[0][0].data.detail as string;
    expect(audit).not.toContain('ขอรายละเอียดเพิ่ม');
  });

  it('returns null when the ticket is out of scope', async () => {
    access.findVisibleTicket.mockResolvedValue(null);
    expect(await sendAnonymousChatMessage('tk1', 'hi', 'employee')).toBeNull();
  });
});

describe('submitEvaluation', () => {
  const evaluation = {
    overallScore: 4,
    speedRating: 4,
    resolutionQualityRating: 4,
    serviceMannerRating: 4,
    clarityRating: 4,
    isResolvedPermanently: true,
    feedbackComment: '',
  };

  it('closes the ticket and upserts the evaluation', async () => {
    access.findVisibleTicket.mockResolvedValue(row({ confidentiality: 'anonymous' }));
    db.prisma.ticket.update.mockResolvedValue(row({ status: 'closed' }));

    await submitEvaluation('tk1', evaluation);

    expect(access.findVisibleTicket).toHaveBeenCalledWith(viewer('employee'), {
      AND: [
        { id: 'tk1' },
        {
          OR: [
            { loginEmail: 'employee@ube.co.th' },
            { loginEmail: null, submitterEmail: 'employee@ube.co.th' },
          ],
        },
        { status: 'resolved' },
      ],
    });
    const { data } = db.prisma.ticket.update.mock.calls[0][0];
    expect(data.status).toBe('closed');
    expect(data.evaluation.upsert.create.overallScore).toBe(4);
    expect(data.timeline.create).toMatchObject({
      actor: 'พนักงานผู้แจ้ง',
      notes: 'ส่งผลประเมินความพึงพอใจเสร็จสิ้น',
    });
  });

  it('rejects scores outside 1-5', async () => {
    access.findVisibleTicket.mockResolvedValue(row());
    await expect(submitEvaluation('tk1', { ...evaluation, overallScore: 6 })).rejects.toThrow();
    expect(db.prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('returns null when the ticket is out of scope', async () => {
    access.findVisibleTicket.mockResolvedValue(null);
    expect(await submitEvaluation('tk1', evaluation)).toBeNull();
  });
});
