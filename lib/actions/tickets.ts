'use server';

// src/lib/actions/tickets.ts — Prisma-backed replacement surface for the
// ticket-related functions in src/services/api.ts (getStoredTickets,
// getTicketByTrackingCode, submitTicket, updateTicketWorkflow,
// submitEvaluation). NOT yet wired into any component — see
// docs/project-context/architecture.md for call-site rewiring status.
//
// Session/permission checks are intentionally absent: there is no real
// authentication yet (SSO lands in ugt-nextjs-auth-setup). Once it does,
// every mutation here needs a session guard + permission check + real
// CreatedBy/UpdatedBy/actor id per .claude/rules/ugt-nextjs-database.md and
// references/raw-sql-and-sp.md's Server Action frame.
//
// ugt-nextjs-mail-setup (2026-09-02): this is where the workflow email hook
// plugs in. See docs/project-context/decisions.md for the scoping decision —
// in short: notifications the app already generates (below) also go out by
// email via sendTemplatedMail(), called right after the Notification row is
// written, in try/catch, so a mail outage never fails the ticket mutation.
// This module is NOT yet called by any component (still open — see
// docs/project-context/architecture.md's ⚠ deviation), so no real email
// goes out today; the wiring is correct and ready for when the call sites
// switch from src/services/api.ts's localStorage functions to these.
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { sendTemplatedMail, type MailActor } from '@/lib/email';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { mapTicket } from './mappers';
import type {
  ComplaintTicket,
  NotificationItem,
  SatisfactionEvaluation,
  TicketStatus,
} from '@/types';

const APP_NAME = env.NEXT_PUBLIC_APP_NAME ?? 'UGT VoiceCare';

/** Full URL for a link inside an email — email opens outside the app, so a
 *  relative path is useless there (org rule, .claude/rules/ugt-nextjs-mail.md). */
function detailUrl(path: string): string {
  const base = env.APP_URL?.replace(/\/$/, '') ?? '';
  const prefix = env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${base}${prefix}${path}`;
}

/**
 * The user whose action triggered this mutation, as a mail actor (dev mode
 * redirect — see lib/email.ts). No session yet reaching this module in
 * practice (see the module header), so this degrades to "no dev mode" rather
 * than throwing — a Server Action must not 500 just because it was called
 * outside a request context that happens to lack a session.
 */
async function resolveMailActor(): Promise<MailActor> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { email: null, hasDevMode: false };
    const perms = await getUserPermissions(session.user.id);
    return { email: session.user.email, hasDevMode: perms.includes(PERMISSIONS.DEV_MODE) };
  } catch {
    return { email: null, hasDevMode: false };
  }
}

/** Send one notification's matching workflow email — never lets a mail
 * failure fail the caller's ticket mutation (org rule: send after commit,
 * catch + log). No-op for notification types this project has no template
 * for (e.g. a future type added without a matching mail template yet). */
async function sendNotificationMail(
  notif: {
    trackingCode: string;
    title: string;
    message: string;
    type: NotificationItem['type'];
  },
  recipients: { to?: string | string[] | null; recipientName?: string | null }
): Promise<void> {
  const to = recipients.to;
  if (!to || (Array.isArray(to) && to.length === 0)) return;

  const templateKey =
    notif.type === 'new_ticket'
      ? ('ticket.new_ticket' as const)
      : notif.type === 'status_update'
        ? ('ticket.status_update' as const)
        : notif.type === 'satisfaction_pending'
          ? ('ticket.satisfaction_pending' as const)
          : notif.type === 'direct_ceo_alert'
            ? ('ticket.direct_ceo_alert' as const)
            : notif.type === 'sla_warning'
              ? ('ticket.sla_warning' as const)
              : null;
  if (!templateKey) return;

  try {
    const actor = await resolveMailActor();
    await sendTemplatedMail({
      templateKey,
      to,
      actor: actor,
      vars: {
        appName: APP_NAME,
        recipientName: recipients.recipientName || 'ผู้เกี่ยวข้อง',
        trackingCode: notif.trackingCode,
        notificationTitle: notif.title,
        notificationMessage: notif.message,
        detailUrl: detailUrl(notif.type === 'direct_ceo_alert' ? '/executive' : '/my-tickets'),
      },
    });
  } catch (error) {
    console.error('sendNotificationMail failed', { templateKey, error });
  }
}

const TICKET_INCLUDE = {
  timeline: { orderBy: { createdAt: 'asc' as const } },
  evaluation: true,
} as const;

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

function statusBadgeText(status: TicketStatus): string {
  switch (status) {
    case 'submitted':
      return 'ยื่นเรื่องแล้ว (Submitted)';
    case 'gatekeeper_triaged':
      return 'หน่วยงานรับเรื่อง (Triaged)';
    case 'in_progress':
      return 'กำลังแก้ไข (In Progress)';
    case 'resolved':
      return 'แก้ไขเสร็จสิ้น (Resolved)';
    case 'closed':
      return 'ปิดเรื่องสมบูรณ์ (Closed)';
  }
}

export async function getTickets(): Promise<ComplaintTicket[]> {
  const rows = await prisma.ticket.findMany({
    where: { isDeleted: false },
    include: TICKET_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapTicket);
}

export async function getTicketByTrackingCode(
  trackingCode: string
): Promise<ComplaintTicket | null> {
  const row = await prisma.ticket.findFirst({
    where: { trackingCode: trackingCode.trim() },
    include: TICKET_INCLUDE,
  });
  return row ? mapTicket(row) : null;
}

export async function submitTicket(
  payload: Omit<
    ComplaintTicket,
    | 'id'
    | 'trackingCode'
    | 'createdAt'
    | 'updatedAt'
    | 'timeline'
    | 'status'
    | 'slaDueDate'
    | 'slaStatus'
  >
): Promise<ComplaintTicket> {
  const year = new Date().getFullYear();
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const trackingCode = `TK-${year}-${randomCode}`;
  const now = new Date();
  const slaDueDate = new Date(now.getTime() + payload.slaTargetHours * 60 * 60 * 1000);

  const created = await prisma.ticket.create({
    data: {
      trackingCode,
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
      submitterEmail: payload.submitterEmail,
      submitterPhone: payload.submitterPhone,
      gatekeeperDepartment: payload.gatekeeperDepartment,
      assignedOfficerName: payload.assignedOfficerName,
      assignedOfficerEmail: payload.assignedOfficerEmail,
      slaTargetHours: payload.slaTargetHours,
      slaDueDate,
      slaStatus: 'on_track',
      status: 'submitted',
      urgency: payload.urgency,
      riskSeverity: payload.riskSeverity,
      sentiment: payload.sentiment,
      attachmentsJson: JSON.stringify(payload.attachments ?? []),
      timeline: {
        create: {
          status: 'submitted',
          actor: payload.submitterName || 'พนักงานผู้ยื่นเรื่อง',
          actorRole: 'Employee',
          action: payload.isDirectToExecutive
            ? 'ยื่นเรื่องส่งตรงถึงผู้บริหารระดับสูง (CEO/EVP Whistleblower Channel)'
            : 'ยื่นเรื่องเข้าระบบสำเร็จ',
          notes: payload.isDirectToExecutive
            ? 'ติดแท็กสำคัญพิเศษ: ส่งตรงถึงโต๊ะทำงานผู้บริหารระดับสูง'
            : 'ระบบได้รับเรื่องและเข้าสู่คิวคัดกรองของ Gatekeeper',
        },
      },
    },
    include: TICKET_INCLUDE,
  });

  const notifs: Array<{
    ticketId: string;
    trackingCode: string;
    title: string;
    message: string;
    type: NotificationItem['type'];
    recipientRole: 'employee' | 'executive';
    recipientEmail?: string | null;
  }> = [
    {
      ticketId: created.id,
      trackingCode: created.trackingCode,
      title: `ยื่นเรื่องสำเร็จ: ${created.title.substring(0, 40)}...`,
      message: `รหัสติดตามของคุณคือ ${created.trackingCode} หน่วยงาน ${created.gatekeeperDepartment} จะคัดกรองภายใน SLA ${created.slaTargetHours} ชม.`,
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
  await prisma.notification.createMany({ data: notifs });

  // Workflow email — after the ticket + notifications commit, never blocking
  // the response (see sendNotificationMail's own try/catch).
  for (const notif of notifs) {
    const to =
      notif.type === 'direct_ceo_alert'
        ? (
            await prisma.executiveMember.findMany({
              where: { isActive: true, isDeleted: false, receiveAlertNotifications: true },
              select: { email: true },
            })
          ).map((e) => e.email)
        : notif.recipientEmail;
    await sendNotificationMail(notif, {
      to,
      recipientName: notif.type === 'direct_ceo_alert' ? 'ผู้บริหาร' : created.submitterName,
    });
  }

  return mapTicket(created);
}

export async function updateTicketWorkflow(
  ticketId: string,
  updates: {
    status?: TicketStatus;
    assignedOfficerName?: string;
    assignedOfficerEmail?: string;
    gatekeeperDepartment?: string;
    resolutionSummary?: string;
    actionNote?: string;
    actorName: string;
    actorRole: string;
    attachmentName?: string;
    rootCauseCategory?: ComplaintTicket['rootCauseCategory'];
    preventiveActionPlan?: string;
    clusterGroup?: string;
  }
): Promise<ComplaintTicket | null> {
  const current = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!current) return null;

  const newStatus = updates.status ?? (current.status as TicketStatus);
  const now = new Date();

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: newStatus,
      assignedOfficerName: updates.assignedOfficerName,
      assignedOfficerEmail: updates.assignedOfficerEmail,
      gatekeeperDepartment: updates.gatekeeperDepartment,
      resolutionSummary: updates.resolutionSummary,
      rootCauseCategory: updates.rootCauseCategory,
      preventiveActionPlan: updates.preventiveActionPlan,
      clusterGroup: updates.clusterGroup,
      resolvedAt: newStatus === 'resolved' ? now : undefined,
      closedAt: newStatus === 'closed' ? now : undefined,
      timeline: {
        create: {
          status: newStatus,
          action: actionLabelForStatus(newStatus, updates.actionNote),
          actor: updates.actorName,
          actorRole: updates.actorRole,
          notes: updates.actionNote,
          attachmentName: updates.attachmentName,
        },
      },
    },
    include: TICKET_INCLUDE,
  });

  let notifType: NotificationItem['type'] = 'status_update';
  let notifTitle = `อัปเดตความคืบหน้า (${updated.trackingCode})`;
  let notifMsg = `เรื่องของคุณมีการเปลี่ยนสถานะเป็น "${statusBadgeText(newStatus)}" โดย ${updates.actorName}`;
  if (newStatus === 'resolved') {
    notifType = 'satisfaction_pending';
    notifTitle = `แก้ไขเสร็จสิ้น: รหัส ${updated.trackingCode}`;
    notifMsg =
      'หน่วยงานได้ดำเนินการแก้ไขปัญหาเรียบร้อยแล้ว กรุณาให้คะแนนประเมินความพึงพอใจเพื่อพัฒนาองค์กร';
  }
  await prisma.notification.create({
    data: {
      ticketId: updated.id,
      trackingCode: updated.trackingCode,
      title: notifTitle,
      message: notifMsg,
      type: notifType,
      recipientRole: 'employee',
      recipientEmail: updated.submitterEmail,
    },
  });

  await sendNotificationMail(
    { trackingCode: updated.trackingCode, title: notifTitle, message: notifMsg, type: notifType },
    { to: updated.submitterEmail, recipientName: updated.submitterName }
  );

  return mapTicket(updated);
}

export async function submitEvaluation(
  ticketId: string,
  evaluationData: Omit<SatisfactionEvaluation, 'id' | 'ticketId' | 'evaluatedAt'>
): Promise<ComplaintTicket | null> {
  const current = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!current) return null;
  const now = new Date();

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: 'closed',
      closedAt: now,
      evaluation: {
        create: {
          overallScore: evaluationData.overallScore,
          speedRating: evaluationData.speedRating,
          resolutionQualityRating: evaluationData.resolutionQualityRating,
          serviceMannerRating: evaluationData.serviceMannerRating,
          clarityRating: evaluationData.clarityRating,
          isResolvedPermanently: evaluationData.isResolvedPermanently,
          feedbackComment: evaluationData.feedbackComment,
          improvementSuggestions: evaluationData.improvementSuggestions,
        },
      },
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

  return mapTicket(updated);
}
