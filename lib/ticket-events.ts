// lib/ticket-events.ts — what a ticket event writes and who it reaches. Server-only.
//
// ONE place for "this happened to a ticket → which bell rows are stored and who is mailed":
//   • the Notification rows of each event (submit, status change, chat message, rating) — pure
//     functions, no I/O; lib/actions/tickets.ts stores them inside its own transaction;
//   • the category's gatekeeper roster, read once here — lib/auto-assign.ts takes the assignee from
//     it, lib/email-notifications.ts takes the To line from it (owner 2026-10-14: one rule for every
//     category — the Lead is on the ticket, every active GK is mailed).
// Who may SEE a stored row is a separate question (lib/ticket-scope.ts `isNotificationForViewer`).
import 'server-only';
import type { Prisma } from '@prisma/client';
import { emailList, normalizeEmail } from '@/lib/email-identity';
import { prisma } from '@/lib/prisma';
import { resolvedAnswer, SERVER_TEMPLATES, SERVER_TEXT } from '@/lib/server-text';
import { statusLabel } from '@/lib/ticket-status';
import type { TicketStatus } from '@/types';

// ─── Bell rows ─────────────────────────────────────────────────────────────────

export type NotificationRow = Prisma.notificationCreateManyInput;

interface TicketRef {
  id: string;
  trackingCode: string;
}

/** A new ticket: the submitter's receipt, plus an executive alert when it goes straight up. */
export function submissionRows(
  created: TicketRef & {
    title: string;
    category: string;
    urgency: string;
    gatekeeperDepartment: string;
    isDirectToExecutive: boolean;
    submitterEmail: string | null;
  }
): NotificationRow[] {
  const rows: NotificationRow[] = [
    {
      ticketId: created.id,
      trackingCode: created.trackingCode,
      title: SERVER_TEMPLATES.submittedTitle.th(created.title.substring(0, 40)),
      message: SERVER_TEMPLATES.submittedMessage.th(
        created.trackingCode,
        created.gatekeeperDepartment
      ),
      type: 'new_ticket',
      recipientRole: 'employee',
      recipientEmail: created.submitterEmail,
    },
  ];
  if (created.isDirectToExecutive) {
    rows.push({
      ticketId: created.id,
      trackingCode: created.trackingCode,
      title: SERVER_TEXT.directAlertTitle.th,
      message: SERVER_TEMPLATES.directAlertMessage.th(
        created.title,
        created.category,
        created.urgency
      ),
      type: 'direct_ceo_alert',
      recipientRole: 'executive',
    });
  }
  return rows;
}

/**
 * A workflow save: tells the submitter the new status (`satisfaction_pending` once resolved).
 * `actorName` is already the privacy-safe label — never a confidential submitter's own name.
 */
export function statusChangeRow(
  ticket: TicketRef & { submitterEmail: string | null },
  status: TicketStatus,
  actorName: string
): NotificationRow {
  const base = { ticketId: ticket.id, trackingCode: ticket.trackingCode };
  const recipient = { recipientRole: 'employee', recipientEmail: ticket.submitterEmail };
  if (status === 'resolved') {
    return {
      ...base,
      type: 'satisfaction_pending',
      title: SERVER_TEMPLATES.resolvedTitle.th(ticket.trackingCode),
      message: SERVER_TEXT.resolvedMessage.th,
      ...recipient,
    };
  }
  return {
    ...base,
    type: 'status_update',
    title: SERVER_TEMPLATES.progressTitle.th(ticket.trackingCode),
    message: SERVER_TEMPLATES.statusChangedMessage.th(
      statusLabel(status, 'serverNotice', 'th'),
      actorName
    ),
    ...recipient,
  };
}

/**
 * An anonymous-chat message, for the other side: staff → the submitter (by login email), the
 * submitter → the gatekeepers (no address). In-app only — chat is never mailed.
 */
export function chatMessageRow(
  ticket: TicketRef & { loginEmail: string | null; submitterEmail: string | null },
  message: { senderName: string; text: string; isStaff: boolean }
): NotificationRow {
  const { senderName, text, isStaff } = message;
  return {
    ticketId: ticket.id,
    trackingCode: ticket.trackingCode,
    title: (isStaff ? SERVER_TEMPLATES.chatStaffTitle : SERVER_TEMPLATES.chatComplainantTitle).th(
      ticket.trackingCode
    ),
    message: `${senderName}: ${text.substring(0, 75)}${text.length > 75 ? '...' : ''}`,
    type: 'chat_message',
    recipientRole: isStaff ? 'employee' : 'gatekeeper',
    recipientEmail: isStaff
      ? normalizeEmail(ticket.loginEmail || ticket.submitterEmail) || null
      : null,
  };
}

/** The submitter's CSAT rating, for the staff bell (never the submitter's own). */
export function evaluationRow(
  closed: TicketRef,
  rating: { overallScore: number; isResolvedPermanently: boolean }
): NotificationRow {
  const score = String(rating.overallScore);
  return {
    ticketId: closed.id,
    trackingCode: closed.trackingCode,
    type: 'evaluation_submitted',
    recipientRole: 'gatekeeper',
    title: SERVER_TEMPLATES.ratedTitle.th(closed.trackingCode, score),
    message: SERVER_TEMPLATES.ratedMessage.th(
      score,
      resolvedAnswer(rating.isResolvedPermanently).th
    ),
  };
}

// ─── Category gatekeeper roster ────────────────────────────────────────────────

export interface RosterOfficer {
  name: string;
  email: string;
  isLead: boolean;
}

export interface CategoryRoster {
  /** Active, not deleted, oldest first. */
  officers: RosterOfficer[];
  /** The department's fallback address; null when the category has no config row. */
  escalationEmail: string | null;
}

/** The one read of a category's gatekeeper team (assignee and mail recipients both start here). */
export async function readCategoryRoster(category: string): Promise<CategoryRoster> {
  const config = await prisma.departmentGatekeeperConfig.findFirst({
    where: { category, isDeleted: false },
    select: {
      escalationEmail: true,
      officers: {
        where: { isActive: true, isDeleted: false },
        select: { name: true, email: true, isLead: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  return { officers: config?.officers ?? [], escalationEmail: config?.escalationEmail ?? null };
}

/** Who goes on a new ticket: the category Lead, else the first active officer, else nobody. */
export function assigneeOf(roster: Pick<CategoryRoster, 'officers'>): RosterOfficer | null {
  return roster.officers.find((o) => o.isLead) ?? roster.officers[0] ?? null;
}

/** The To line: every active officer (Lead included), else the escalation address, else nothing. */
export function gatekeeperMailTo(roster: CategoryRoster): string | null {
  return emailList(roster.officers.map((o) => o.email).join(',')) || roster.escalationEmail;
}
