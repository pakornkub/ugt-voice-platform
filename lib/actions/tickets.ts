'use server';

// lib/actions/tickets.ts — the ticket workflow, persisted in SQL Server (slice 1 of the
// localStorage → DB rewiring, 2026-10-09). Same rules and Thai strings as upstream's
// src/services/api.ts (tracking codes, timeline entries, one notification per event, anonymous
// mapping), plus what a multi-user server needs: every action runs
// session → permission/scope (lib/ticket-scope.ts) → action → audit log.
//
// Email (slice 3, 2026-10-09): after the transaction commits, submitTicket tells the category's
// Lead Gatekeeper and updateTicketWorkflow tells the submitter when a ticket becomes resolved —
// lib/email-notifications.ts honours the admin's settings, writes the dispatch log and never throws.
import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AUDIT_ACTIONS, type AuditAction } from '@/lib/audit-actions';
import {
  mailActorFor,
  notifyTicketResolved,
  notifyTicketSubmitted,
} from '@/lib/email-notifications';
import { prisma } from '@/lib/prisma';
import {
  findVisibleTicket,
  findVisibleTicketWithRelations,
  listVisibleTickets,
  requireTicketViewer,
  TICKET_INCLUDE,
} from '@/lib/ticket-access';
import {
  canSubmit,
  canTriage,
  isOwnTicket,
  ownTicketsWhere,
  PROTECTED_ACTOR_NAME,
  redactTicketForViewer,
  touchesTriageFields,
  type TicketViewer,
} from '@/lib/ticket-scope';
import { z } from 'zod';
import { mapTicket } from './mappers';
import type {
  ComplaintTicket,
  NotificationItem,
  SatisfactionEvaluation,
  TicketStatus,
  UrgencyLevel,
  UserRole,
} from '@/types';

function actionLabelForStatus(status: TicketStatus, note?: string): string {
  switch (status) {
    case 'submitted':
      return 'ยื่นเรื่องเข้าระบบ';
    case 'gatekeeper_triaged':
      return 'Gatekeeper รับเรื่องและคัดกรองผู้รับผิดชอบ';
    case 'in_progress':
      return 'อยู่ระหว่างลงพื้นที่และดำเนินการแก้ไข';
    case 'resolved':
      return 'ดำเนินการแก้ไขแล้วเสร็จ พร้อมส่งมอบงาน';
    case 'closed':
      return 'ปิดเรื่องและประเมินผลความพึงพอใจ';
    default:
      return note || 'อัปเดตข้อมูล';
  }
}

const STATUS_BADGE_TEXT: Record<TicketStatus, string> = {
  submitted: 'ยื่นเรื่องแล้ว (Submitted)',
  gatekeeper_triaged: 'หน่วยงานรับเรื่อง (Triaged)',
  in_progress: 'กำลังแก้ไข (In Progress)',
  resolved: 'แก้ไขเสร็จสิ้น (Resolved)',
  closed: 'ปิดเรื่องสมบูรณ์ (Closed)',
};

// Server Actions are public endpoints — the enum-shaped columns are plain NVARCHAR, so check them
// here (src/types.ts unions) before they reach the DB.
const TICKET_FIELDS = z.looseObject({
  type: z.enum(['complaint', 'suggestion']).optional(),
  category: z.enum(['HR', 'Compliance', 'Ethics', 'Fraud', 'Harassment', 'Quality']).optional(),
  confidentiality: z.enum(['anonymous', 'confidential_restricted', 'standard_named']).optional(),
  status: z
    .enum(['submitted', 'gatekeeper_triaged', 'in_progress', 'resolved', 'closed'])
    .optional(),
  urgency: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  riskSeverity: z.enum(['Low', 'Moderate', 'High', 'Severe']).optional(),
  rootCauseCategory: z
    .enum(['Process', 'People', 'Equipment/Tools', 'Policy/Governance', 'Workplace/Facilities'])
    .optional(),
});

const rating = z.number().int().min(1).max(5);
const EVALUATION_SCORES = z.looseObject({
  overallScore: rating,
  speedRating: rating,
  resolutionQualityRating: rating,
  serviceMannerRating: rating,
  clarityRating: rating,
});

async function auditLog(userId: string, action: AuditAction, detail: unknown) {
  await prisma.activityLog
    .create({ data: { userId, action, detail: JSON.stringify(detail) } })
    .catch(() => {});
}

export async function getTickets(): Promise<ComplaintTicket[]> {
  return listVisibleTickets(await requireTicketViewer());
}

/** Tracking-code lookup (Navbar search, notifications, recent searches) — scoped like the list. */
export async function getTicketByTrackingCode(
  trackingCode: string
): Promise<ComplaintTicket | null> {
  const viewer = await requireTicketViewer();
  return findVisibleTicketWithRelations(viewer, { trackingCode: trackingCode.trim() });
}

type SubmitPayload = Omit<
  ComplaintTicket,
  'id' | 'trackingCode' | 'createdAt' | 'updatedAt' | 'timeline' | 'status' | 'anonymousMessages'
>;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

type CreatedTicket = Prisma.ticketGetPayload<{ include: typeof TICKET_INCLUDE }>;

function submissionNotifications(created: CreatedTicket): Prisma.notificationCreateManyInput[] {
  const notifs: Prisma.notificationCreateManyInput[] = [
    {
      ticketId: created.id,
      trackingCode: created.trackingCode,
      title: `ยื่นเรื่องสำเร็จ: ${created.title.substring(0, 40)}...`,
      message: `รหัสติดตามของคุณคือ ${created.trackingCode} หน่วยงาน ${created.gatekeeperDepartment} ได้รับเรื่องเข้าสู่ระบบเรียบร้อยแล้ว`,
      type: 'new_ticket',
      recipientRole: 'employee',
      recipientEmail: created.submitterEmail,
    },
  ];
  if (created.isDirectToExecutive) {
    notifs.push({
      ticketId: created.id,
      trackingCode: created.trackingCode,
      title: '[CEO/EVP Alert] ข้อร้องเรียนสำคัญส่งตรงถึงผู้บริหาร',
      message: `เรื่อง: ${created.title} (หมวดหมู่: ${created.category}, ความเร่งด่วน: ${created.urgency})`,
      type: 'direct_ceo_alert',
      recipientRole: 'executive',
    });
  }
  return notifs;
}

/**
 * Ticket + its notifications in one transaction. TK-YYYY-NNNN is random (upstream format) and
 * unique-indexed — a collision rolls the transaction back and retries with a new code.
 */
async function createTicketWithNotifications(
  data: Omit<Prisma.ticketCreateInput, 'trackingCode'>,
  attemptsLeft = 5
): Promise<CreatedTicket> {
  const trackingCode = `TK-${new Date().getFullYear()}-${randomInt(1000, 10000)}`;
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: { ...data, trackingCode },
        include: TICKET_INCLUDE,
      });
      await tx.notification.createMany({ data: submissionNotifications(created) });
      return created;
    });
  } catch (error) {
    if (!isUniqueViolation(error) || attemptsLeft <= 1) throw error;
    return createTicketWithNotifications(data, attemptsLeft - 1);
  }
}

function submissionTimeline(payload: SubmitPayload, isAnonymous: boolean) {
  let notes = 'ระบบได้รับเรื่องและเข้าสู่คิวคัดกรองของ Gatekeeper';
  if (isAnonymous) {
    notes =
      'ยื่นเรื่องแบบไม่ระบุตัวตน (ระบบเชื่อมโยงอีเมลล็อกอินหลังบ้านจากฐานข้อมูลพนักงานเรียบร้อยแล้ว)';
  } else if (payload.isDirectToExecutive) {
    notes = 'ติดแท็กสำคัญพิเศษ: ส่งตรงถึงโต๊ะทำงานผู้บริหารระดับสูง';
  }
  return {
    status: 'submitted',
    actor: isAnonymous
      ? 'พนักงานผู้ยื่นเรื่อง (ไม่ระบุตัวตน)'
      : payload.submitterName || 'พนักงานผู้ยื่นเรื่อง',
    actorRole: 'Employee',
    action: payload.isDirectToExecutive
      ? 'ยื่นเรื่องส่งตรงถึงผู้บริหารระดับสูง (CEO/EVP Whistleblower Channel)'
      : 'ยื่นเรื่องเข้าระบบสำเร็จ',
    notes,
  };
}

/**
 * The login email is always the signed-in user's — it is what "my tickets" and the anonymous
 * mapping key on. The submitter fields stay whatever the form sent (the employee-directory mock
 * until slice 4). Simulated attachments are not persisted (slice 5 wires real uploads).
 */
export async function submitTicket(payload: SubmitPayload): Promise<ComplaintTicket> {
  const viewer = await requireTicketViewer();
  if (!canSubmit(viewer)) throw new Error('FORBIDDEN');
  TICKET_FIELDS.parse(payload);

  const isAnonymous = payload.confidentiality === 'anonymous';
  const data: Omit<Prisma.ticketCreateInput, 'trackingCode'> = {
    type: payload.type,
    category: payload.category,
    title: payload.title,
    description: payload.description,
    locationOrUnit: payload.locationOrUnit,
    isDirectToExecutive: payload.isDirectToExecutive,
    confidentiality: payload.confidentiality,
    submitterName: payload.submitterName,
    submitterEmployeeId: payload.submitterEmployeeId,
    submitterDepartment: payload.submitterDepartment,
    submitterEmail: payload.submitterEmail || viewer.email,
    submitterPhone: payload.submitterPhone,
    loginEmail: viewer.email,
    isAnonymousMapped: isAnonymous || !!payload.isAnonymousMapped,
    gatekeeperDepartment: payload.gatekeeperDepartment,
    assignedOfficerName: payload.assignedOfficerName,
    assignedOfficerEmail: payload.assignedOfficerEmail,
    status: 'submitted',
    urgency: payload.urgency,
    riskSeverity: payload.riskSeverity,
    sentiment: payload.sentiment,
    createdBy: viewer.userId,
    timeline: { create: submissionTimeline(payload, isAnonymous) },
  };

  const created = await createTicketWithNotifications(data);

  await auditLog(viewer.userId, AUDIT_ACTIONS.TICKETS_SUBMIT, {
    ticketId: created.id,
    trackingCode: created.trackingCode,
  });
  // Not awaited: SMTP latency must not hold up the submitter (notify* never rejects).
  notifyTicketSubmitted(created, { actor: mailActorFor(viewer), userId: viewer.userId }).catch(
    () => {}
  );
  return redactTicketForViewer(viewer, mapTicket(created));
}

interface WorkflowUpdates {
  status?: TicketStatus;
  assignedOfficerName?: string;
  assignedOfficerEmail?: string;
  gatekeeperDepartment?: string;
  resolutionSummary?: string;
  actionNote?: string;
  /** Hint only — the server derives the timeline actor (workflowActor). */
  actorName?: string;
  /** Ignored — kept so the upstream call sites stay unchanged. */
  actorRole?: string;
  attachmentName?: string;
  urgency?: UrgencyLevel;
  riskSeverity?: ComplaintTicket['riskSeverity'];
  rootCauseCategory?: ComplaintTicket['rootCauseCategory'];
  preventiveActionPlan?: string;
  clusterGroup?: string;
}

function statusNotification(trackingCode: string, status: TicketStatus, actorName: string) {
  if (status === 'resolved') {
    return {
      type: 'satisfaction_pending' as NotificationItem['type'],
      title: `แก้ไขเสร็จสิ้น: รหัส ${trackingCode}`,
      message:
        'หน่วยงานได้ดำเนินการแก้ไขปัญหาเรียบร้อยแล้ว กรุณาให้คะแนนประเมินความพึงพอใจเพื่อพัฒนาองค์กร',
    };
  }
  return {
    type: 'status_update' as NotificationItem['type'],
    title: `อัปเดตความคืบหน้า (${trackingCode})`,
    message: `เรื่องของคุณมีการเปลี่ยนสถานะเป็น "${STATUS_BADGE_TEXT[status]}" โดย ${actorName}`,
  };
}

// Upstream GatekeeperInbox's fixed triage label (the audit log records the real user).
const TRIAGE_ACTOR = { actor: 'Gatekeeper Supervisor', actorRole: 'Gatekeeper Lead' };

type ActorTicket = {
  confidentiality: string;
  submitterName: string | null;
  loginEmail: string | null;
  submitterEmail: string | null;
};

/**
 * Who a timeline entry is from — never taken from the client, so nobody can post as staff or as
 * the submitter. Triage → upstream's triage label. The submitter's own note → upstream
 * TrackingTimelineModal's label (the client's TH/EN pick is honoured only if it is one of them).
 * Anyone else's note → their session name + role.
 */
function workflowActor(
  viewer: TicketViewer,
  ticket: ActorTicket,
  triage: boolean,
  requested?: string
): { actor: string; actorRole: string } {
  if (triage) return TRIAGE_ACTOR;
  if (!isOwnTicket(viewer, ticket)) {
    return { actor: viewer.name, actorRole: TIMELINE_ACTOR_ROLE[viewer.role] };
  }
  let labels = ['พนักงาน', 'Employee'];
  if (ticket.confidentiality === 'anonymous') {
    labels = ['พนักงาน (ไม่เปิดเผยตัวตน)', 'Employee (Anonymous)'];
  } else if (ticket.submitterName) {
    labels = [ticket.submitterName];
  }
  const actor = requested && labels.includes(requested) ? requested : labels[0];
  return { actor, actorRole: 'Employee' };
}

/**
 * Gatekeeper triage (status / officer / urgency / CAPA) needs the gatekeeper tab in the RBAC
 * matrix; anyone who can see the ticket may add a plain note (the employee inquiry box).
 */
export async function updateTicketWorkflow(
  ticketId: string,
  updates: WorkflowUpdates
): Promise<ComplaintTicket | null> {
  const viewer = await requireTicketViewer();
  const current = await findVisibleTicket(viewer, { id: ticketId });
  if (!current) return null;
  const triage = touchesTriageFields(updates);
  if (triage && !canTriage(viewer)) throw new Error('FORBIDDEN');
  TICKET_FIELDS.parse(updates);

  const newStatus = updates.status ?? (current.status as TicketStatus);
  const now = new Date();
  const { actor, actorRole } = workflowActor(viewer, current, triage, updates.actorName);
  // A confidential submitter's own name must not travel in a notification other roles can read.
  const notifActor =
    current.confidentiality === 'confidential_restricted' && actorRole === 'Employee'
      ? PROTECTED_ACTOR_NAME
      : actor;
  const notif = statusNotification(current.trackingCode, newStatus, notifActor);

  const updated = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        assignedOfficerName: updates.assignedOfficerName,
        assignedOfficerEmail: updates.assignedOfficerEmail,
        gatekeeperDepartment: updates.gatekeeperDepartment,
        resolutionSummary: updates.resolutionSummary,
        urgency: updates.urgency,
        riskSeverity: updates.riskSeverity,
        rootCauseCategory: updates.rootCauseCategory,
        preventiveActionPlan: updates.preventiveActionPlan,
        clusterGroup: updates.clusterGroup,
        resolvedAt: newStatus === 'resolved' ? now : undefined,
        closedAt: newStatus === 'closed' ? now : undefined,
        updatedBy: viewer.userId,
        timeline: {
          create: {
            status: newStatus,
            action: actionLabelForStatus(newStatus, updates.actionNote),
            actor,
            actorRole,
            notes: updates.actionNote,
            attachmentName: updates.attachmentName,
          },
        },
      },
      include: TICKET_INCLUDE,
    });
    await tx.notification.create({
      data: {
        ticketId: ticket.id,
        trackingCode: ticket.trackingCode,
        ...notif,
        recipientRole: 'employee',
        recipientEmail: ticket.submitterEmail,
      },
    });
    return ticket;
  });

  await auditLog(viewer.userId, AUDIT_ACTIONS.TICKETS_UPDATE, {
    ticketId,
    trackingCode: updated.trackingCode,
    status: newStatus,
  });
  // Only the transition into 'resolved' mails the submitter — a later note on a resolved ticket
  // (updates.status undefined) must not send it again.
  if (newStatus === 'resolved' && current.status !== 'resolved') {
    notifyTicketResolved(
      updated,
      {
        resolvedBy: actor,
        resolutionNotes:
          updates.resolutionSummary ||
          updates.actionNote ||
          'ดำเนินการตรวจสอบและแก้ไขปัญหาเรียบร้อยตามมาตรฐานการปฏิบัติงาน',
      },
      { actor: mailActorFor(viewer), userId: viewer.userId }
    ).catch(() => {});
  }
  return redactTicketForViewer(viewer, mapTicket(updated));
}

const STAFF_ROLES: ReadonlySet<UserRole> = new Set(['gatekeeper', 'executive', 'admin']);

type ChatTicket = Pick<
  ComplaintTicket,
  'confidentiality' | 'submitterName' | 'assignedOfficerName' | 'gatekeeperDepartment' | 'category'
>;

function defaultChatSenderName(ticket: ChatTicket, senderRole: UserRole): string {
  switch (senderRole) {
    case 'employee':
      return ticket.confidentiality === 'anonymous' ||
        ticket.confidentiality === 'confidential_restricted'
        ? 'ผู้ยื่นเรื่อง (ไม่เปิดเผยตัวตน / Anonymous)'
        : ticket.submitterName || 'ผู้ยื่นเรื่อง (Employee)';
    case 'gatekeeper':
      return ticket.assignedOfficerName
        ? `Gatekeeper (${ticket.assignedOfficerName})`
        : `Gatekeeper ประจำฝ่าย ${ticket.gatekeeperDepartment || ticket.category}`;
    case 'executive':
      return 'คณะกรรมการตรวจสอบ / ผู้บริหารระดับสูง (Audit Committee)';
    default:
      return 'เจ้าหน้าที่ผู้ดูแลระบบ (System Admin)';
  }
}

const TIMELINE_ACTOR_ROLE: Record<UserRole, string> = {
  employee: 'Employee',
  executive: 'Executive',
  gatekeeper: 'Gatekeeper',
  admin: 'Gatekeeper',
};

/**
 * Anonymous 2-way chat (complainant ↔ staff). The caller may only post as the role they hold, on
 * a ticket they can see. The message, its timeline entry and the counterpart notification are
 * written in one transaction.
 */
export async function sendAnonymousChatMessage(
  ticketId: string,
  messageText: string,
  senderRole: UserRole
): Promise<ComplaintTicket | null> {
  const viewer = await requireTicketViewer();
  if (viewer.role !== senderRole) throw new Error('FORBIDDEN');
  const row = await findVisibleTicket(viewer, { id: ticketId });
  if (!row) return null;
  const current = mapTicket(row);

  const isStaff = STAFF_ROLES.has(senderRole);
  const text = messageText.trim();
  const finalSenderName = defaultChatSenderName(current, senderRole);

  const updated = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        anonymousMessages: {
          create: {
            senderRole,
            senderDisplayName: finalSenderName,
            message: text,
            isStaff,
            isReadByEmployee: !isStaff,
            isReadByStaff: isStaff,
            createdBy: viewer.userId,
          },
        },
        timeline: {
          create: {
            status: current.status,
            action: isStaff
              ? 'เจ้าหน้าที่ส่งข้อความสอบถาม/ชี้แจงผ่านช่องทางนิรนาม'
              : 'ผู้ยื่นเรื่องตอบกลับผ่านช่องทางสื่อสารนิรนาม',
            actor: finalSenderName,
            actorRole: TIMELINE_ACTOR_ROLE[senderRole],
            notes: `[Anonymous Q&A] ${text.length > 80 ? text.substring(0, 80) + '...' : text}`,
          },
        },
      },
      include: TICKET_INCLUDE,
    });

    await tx.notification.create({
      data: {
        ticketId: ticket.id,
        trackingCode: ticket.trackingCode,
        title: isStaff
          ? `[ข้อความใหม่จากเจ้าหน้าที่] ${ticket.trackingCode}`
          : `[ข้อความใหม่จากผู้ร้องเรียน] ${ticket.trackingCode}`,
        message: `${finalSenderName}: ${text.substring(0, 75)}${text.length > 75 ? '...' : ''}`,
        type: 'status_update',
        recipientRole: isStaff ? 'employee' : 'gatekeeper',
        recipientEmail: isStaff ? ticket.submitterEmail : null,
      },
    });

    return ticket;
  });

  // Never log the message body — anonymous submitters rely on it staying out of logs.
  await auditLog(viewer.userId, AUDIT_ACTIONS.TICKETS_CHAT_SEND, {
    ticketId,
    trackingCode: updated.trackingCode,
    senderRole,
  });

  return redactTicketForViewer(viewer, mapTicket(updated));
}

/**
 * CSAT — only the submitter, only on a resolved ticket; closes it. (The evaluation is upserted so
 * a row left from an earlier close of a reopened ticket doesn't trip the unique TicketId.)
 */
export async function submitEvaluation(
  ticketId: string,
  evaluationData: Omit<SatisfactionEvaluation, 'id' | 'ticketId' | 'evaluatedAt'>
): Promise<ComplaintTicket | null> {
  const viewer = await requireTicketViewer();
  EVALUATION_SCORES.parse(evaluationData);
  const current = await findVisibleTicket(viewer, {
    AND: [{ id: ticketId }, ownTicketsWhere(viewer.email), { status: 'resolved' }],
  });
  if (!current) return null;
  const now = new Date();
  const evaluation = {
    overallScore: evaluationData.overallScore,
    speedRating: evaluationData.speedRating,
    resolutionQualityRating: evaluationData.resolutionQualityRating,
    serviceMannerRating: evaluationData.serviceMannerRating,
    clarityRating: evaluationData.clarityRating,
    isResolvedPermanently: evaluationData.isResolvedPermanently,
    feedbackComment: evaluationData.feedbackComment,
    improvementSuggestions: evaluationData.improvementSuggestions,
    createdAt: now,
  };

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: 'closed',
      closedAt: now,
      updatedBy: viewer.userId,
      evaluation: { upsert: { create: evaluation, update: evaluation } },
      timeline: {
        create: {
          status: 'closed',
          action: `ประเมินความพึงพอใจ ${evaluationData.overallScore} ดาว และปิดเรื่อง (Closed)`,
          actor:
            current.confidentiality === 'anonymous'
              ? 'พนักงานผู้แจ้ง'
              : current.submitterName || 'พนักงาน',
          actorRole: 'Employee',
          notes: evaluationData.feedbackComment || 'ส่งผลประเมินความพึงพอใจเสร็จสิ้น',
        },
      },
    },
    include: TICKET_INCLUDE,
  });

  await auditLog(viewer.userId, AUDIT_ACTIONS.TICKETS_EVALUATE, {
    ticketId,
    trackingCode: updated.trackingCode,
    overallScore: evaluationData.overallScore,
  });
  return redactTicketForViewer(viewer, mapTicket(updated));
}
