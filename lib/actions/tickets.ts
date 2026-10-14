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
import { Prisma } from '@prisma/client';
import { autoAssignOfficer, gatekeepersSeeDirectTickets } from '@/lib/auto-assign';
import { normalizeEmail } from '@/lib/email-identity';
import { AUDIT_ACTIONS, type AuditAction } from '@/lib/audit-actions';
import {
  mailActorFor,
  notifyTicketEvaluated,
  notifyTicketResolved,
  notifyTicketSubmitted,
} from '@/lib/email-notifications';
import { prisma } from '@/lib/prisma';
import { SERVER_TEMPLATES as TEXT_TEMPLATES, SERVER_TEXT as TEXT } from '@/lib/server-text';
import {
  evaluationRow,
  chatMessageRow,
  statusChangeRow,
  submissionRows,
} from '@/lib/ticket-events';
import { timelineActionText } from '@/lib/ticket-status';
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
  SatisfactionEvaluation,
  TicketStatus,
  UrgencyLevel,
  UserRole,
} from '@/types';

function actionLabelForStatus(status: TicketStatus, note?: string): string {
  return timelineActionText(status, 'th') ?? (note || TEXT.infoUpdated.th);
}

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
  // One plain address (the resolved mail may go here for legacy rows) — no lists, no headers.
  submitterEmail: z.union([z.literal(''), z.email().max(200)]).optional(),
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
  | 'id'
  | 'trackingCode'
  | 'createdAt'
  | 'updatedAt'
  | 'timeline'
  | 'status'
  | 'anonymousMessages'
  | 'attachments'
>;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

type CreatedTicket = Prisma.ticketGetPayload<{ include: typeof TICKET_INCLUDE }>;

/**
 * Next running number of the year — TK-YYYY-0001, 0002, … (owner 2026-10-09; upstream used a
 * random 4-digit code, which read like a continuation of the test tickets). One counter row per
 * year in AppSettings, bumped by MERGE under HOLDLOCK so concurrent submits never get the same
 * number; numbers already taken (the old random codes, demo data) are skipped.
 */
async function nextTrackingCode(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const key = `ticket.tracking-sequence.${year}`;
  // ponytail: skips taken numbers one at a time — fine while the old random codes are a handful.
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const rows = await tx.$queryRaw<{ value: string }[]>`
      MERGE [dbo].[AppSettings] WITH (HOLDLOCK) AS t
      USING (SELECT ${key} AS SettingKey) AS s ON t.[SettingKey] = s.SettingKey
      WHEN MATCHED THEN UPDATE SET
        [SettingValue] = CAST(CAST(t.[SettingValue] AS INT) + 1 AS NVARCHAR(20)),
        [UpdatedAt] = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT ([Id], [SettingKey], [SettingValue], [UpdatedAt])
        VALUES (LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')), s.SettingKey, N'1', SYSUTCDATETIME())
      OUTPUT INSERTED.[SettingValue] AS value;`;
    const code = `TK-${year}-${String(Number(rows[0]?.value)).padStart(4, '0')}`;
    const taken = await tx.ticket.findUnique({
      where: { trackingCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error('TRACKING_SEQUENCE_EXHAUSTED');
}

/** Ticket + its notifications in one transaction (unique-index race → retry). */
async function createTicketWithNotifications(
  data: Omit<Prisma.ticketCreateInput, 'trackingCode'>,
  attemptsLeft = 5
): Promise<CreatedTicket> {
  try {
    return await prisma.$transaction(async (tx) => {
      const trackingCode = await nextTrackingCode(tx);
      const created = await tx.ticket.create({
        data: { ...data, trackingCode },
        include: TICKET_INCLUDE,
      });
      await tx.notification.createMany({ data: submissionRows(created) });
      return created;
    });
  } catch (error) {
    if (!isUniqueViolation(error) || attemptsLeft <= 1) throw error;
    return createTicketWithNotifications(data, attemptsLeft - 1);
  }
}

function submissionTimeline(payload: SubmitPayload, isAnonymous: boolean) {
  let notes = TEXT.submittedNote.th;
  if (isAnonymous) {
    notes = TEXT.submittedAnonymousNote.th;
  } else if (payload.isDirectToExecutive) {
    notes = TEXT.submittedDirectNote.th;
  }
  return {
    status: 'submitted',
    actor: isAnonymous
      ? TEXT.anonymousSubmittingEmployee.th
      : payload.submitterName || TEXT.submittingEmployee.th,
    actorRole: 'Employee',
    action: payload.isDirectToExecutive ? TEXT.submittedDirectAction.th : TEXT.submittedAction.th,
    notes,
  };
}

function autoAssignTimeline(officerName: string) {
  return {
    status: 'submitted',
    actor: TEXT.autoAssignActor.th,
    actorRole: 'System',
    action: TEXT_TEMPLATES.autoAssignAction.th(officerName),
    notes: TEXT.leadGatekeeperNote.th,
  };
}

/**
 * The login email is always the signed-in user's — it is what "my tickets" and the anonymous
 * mapping key on. The submitter fields are the form's (prefilled from the HR view). Files are
 * uploaded by the client to /api/files once the ticket exists (lib/upload-client.ts).
 */
export async function submitTicket(payload: SubmitPayload): Promise<ComplaintTicket> {
  const viewer = await requireTicketViewer();
  if (!canSubmit(viewer)) throw new Error('FORBIDDEN');
  TICKET_FIELDS.parse(payload);

  const isAnonymous = payload.confidentiality === 'anonymous';
  // The server puts the category Lead on the ticket — never the client. Direct-to-
  // executive tickets stay unassigned: a gatekeeper must not be handed what RBAC may hide.
  const assignable = !payload.isDirectToExecutive || (await gatekeepersSeeDirectTickets());
  const officer = assignable ? await autoAssignOfficer(payload.category) : null;
  const timeline = [submissionTimeline(payload, isAnonymous)];
  if (officer) timeline.push(autoAssignTimeline(officer.name));
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
    submitterEmail: normalizeEmail(payload.submitterEmail || viewer.email),
    submitterPhone: payload.submitterPhone,
    loginEmail: normalizeEmail(viewer.email),
    isAnonymousMapped: isAnonymous || !!payload.isAnonymousMapped,
    gatekeeperDepartment: payload.gatekeeperDepartment,
    assignedOfficerName: officer?.name ?? null,
    assignedOfficerEmail: officer ? normalizeEmail(officer.email) : null,
    status: 'submitted',
    urgency: payload.urgency,
    riskSeverity: payload.riskSeverity,
    sentiment: payload.sentiment,
    createdBy: viewer.userId,
    timeline: { create: timeline },
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
  let labels = [TEXT.employee.th, TEXT.employee.en];
  if (ticket.confidentiality === 'anonymous') {
    labels = [TEXT.employeeAnonymous.th, TEXT.employeeAnonymous.en];
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
    await tx.notification.create({ data: statusChangeRow(ticket, newStatus, notifActor) });
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
        resolvedBy: viewer.name || actor,
        resolutionNotes:
          updates.resolutionSummary || updates.actionNote || TEXT.defaultResolutionNote.th,
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
        ? TEXT.chatSubmitterAnonymous.th
        : ticket.submitterName || TEXT.chatSubmitterEmployee.th;
    case 'gatekeeper':
      return ticket.assignedOfficerName
        ? `Gatekeeper (${ticket.assignedOfficerName})`
        : TEXT_TEMPLATES.gatekeeperOfDepartment.th(ticket.gatekeeperDepartment || ticket.category);
    case 'executive':
      return TEXT.chatAuditCommittee.th;
    default:
      return TEXT.chatSystemAdmin.th;
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
            action: isStaff ? TEXT.chatStaffAction.th : TEXT.chatSubmitterAction.th,
            actor: finalSenderName,
            actorRole: TIMELINE_ACTOR_ROLE[senderRole],
            notes: `[Anonymous Q&A] ${text.length > 80 ? text.substring(0, 80) + '...' : text}`,
          },
        },
      },
      include: TICKET_INCLUDE,
    });

    // In-app only (no mail); isNotificationForViewer keeps it from echoing back to the sender.
    await tx.notification.create({
      data: chatMessageRow(ticket, { senderName: finalSenderName, text, isStaff }),
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

  // Rating + staff bell in one transaction (owner 2026-10-14: the officer must learn of it at once;
  // lib/ticket-scope.ts keeps 'evaluation_submitted' off the submitter's own bell).
  const updated = await prisma.$transaction(async (tx) => {
    const closed = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'closed',
        closedAt: now,
        updatedBy: viewer.userId,
        evaluation: { upsert: { create: evaluation, update: evaluation } },
        timeline: {
          create: {
            status: 'closed',
            action: TEXT_TEMPLATES.csatClosedAction.th(String(evaluationData.overallScore)),
            actor:
              current.confidentiality === 'anonymous'
                ? TEXT.reportingEmployee.th
                : current.submitterName || TEXT.employee.th,
            actorRole: 'Employee',
            notes: evaluationData.feedbackComment || TEXT.evaluationDoneNote.th,
          },
        },
      },
      include: TICKET_INCLUDE,
    });
    await tx.notification.create({ data: evaluationRow(closed, evaluationData) });
    return closed;
  });

  await auditLog(viewer.userId, AUDIT_ACTIONS.TICKETS_EVALUATE, {
    ticketId,
    trackingCode: updated.trackingCode,
    overallScore: evaluationData.overallScore,
  });
  // Not awaited: SMTP latency must not hold up the submitter (notify* never rejects).
  notifyTicketEvaluated(updated, evaluationData, {
    actor: mailActorFor(viewer),
    userId: viewer.userId,
  }).catch(() => {});
  return redactTicketForViewer(viewer, mapTicket(updated));
}
