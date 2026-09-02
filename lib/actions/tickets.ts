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
import { prisma } from '@/lib/prisma';
import { mapTicket } from './mappers';
import type { ComplaintTicket, NotificationItem, SatisfactionEvaluation, TicketStatus } from '@/types';

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

export async function getTicketByTrackingCode(trackingCode: string): Promise<ComplaintTicket | null> {
  const row = await prisma.ticket.findFirst({
    where: { trackingCode: trackingCode.trim() },
    include: TICKET_INCLUDE,
  });
  return row ? mapTicket(row) : null;
}

export async function submitTicket(
  payload: Omit<
    ComplaintTicket,
    'id' | 'trackingCode' | 'createdAt' | 'updatedAt' | 'timeline' | 'status' | 'slaDueDate' | 'slaStatus'
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
    notifMsg = 'หน่วยงานได้ดำเนินการแก้ไขปัญหาเรียบร้อยแล้ว กรุณาให้คะแนนประเมินความพึงพอใจเพื่อพัฒนาองค์กร';
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
          actor: current.confidentiality === 'anonymous' ? 'พนักงานผู้แจ้ง' : current.submitterName || 'พนักงาน',
          actorRole: 'Employee',
          notes: evaluationData.feedbackComment || 'ส่งผลประเมินความพึงพอใจเสร็จสิ้น',
        },
      },
    },
    include: TICKET_INCLUDE,
  });

  return mapTicket(updated);
}
