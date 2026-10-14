// lib/email-notifications.ts — real delivery of upstream's two admin-editable ticket emails
// (rewiring slice 3, 2026-10-09): settings in AppSettings, one EmailDispatchLogs row per attempt,
// sent through lib/email.ts (SMTP + dev mode).
//
// Contract with the callers (lib/actions/tickets.ts): every notify* function runs AFTER the ticket
// transaction committed and NEVER throws — a mail problem is logged ('failed' row + console) and
// must not fail the user's save (.claude/rules/ugt-nextjs-mail.md).
//
// Privacy: only standard_named tickets put the submitter's identity into a mail or a log row.
// Anonymous / confidential_restricted tickets get the neutral labels below, and the submitter's own
// address is masked in the log and in the dev-mode banner (the log is readable by every roster
// admin; the banner by the tester).
import 'server-only';
import type { emailDispatchLog as DispatchLogRow } from '@prisma/client';
import { env } from '@/lib/env';
import { sendRenderedMail, type MailActor } from '@/lib/email';
import { emailSettingsInputSchema } from '@/lib/email-settings-schema';
import { permissionsFor } from '@/lib/get-user-permissions';
import { escapeHtml } from '@/lib/mail-templates';
import { PERMISSIONS } from '@/lib/permissions';
import { normalizeEmail } from '@/lib/email-identity';
import { prisma } from '@/lib/prisma';
import { PROTECTED_ACTOR_NAME, type TicketViewer } from '@/lib/ticket-scope';
import { CATEGORY_DEFINITIONS } from '@/mockData';
import { DEFAULT_EMAIL_SETTINGS, interpolateEmailTemplate } from '@/services/emailDefaults';
import type {
  EmailDispatchLog,
  EmailNotificationSettings,
  EmailNotificationTemplate,
  GrievanceCategory,
} from '@/types';

export const EMAIL_SETTINGS_KEY = 'email.notification-settings';
/** Same cap as upstream's localStorage log. */
export const DISPATCH_LOG_LIMIT = 100;
const DELIVERY_CHANNEL = 'SMTP / Enterprise Mail Gateway';
const MASKED_SUBMITTER_EMAIL = 'anonymous-submitter@voiceplatform.internal';
const ANONYMOUS_SENDER = 'ผู้ยื่นเรื่องนิรนาม (Anonymous)';
const ANONYMOUS_RECIPIENT = 'ผู้ยื่นเรื่อง (Anonymous Submitter)';
const HIDDEN_DEPARTMENT = 'ไม่เปิดเผยสังกัด';
const BANGKOK = { timeZone: 'Asia/Bangkok' } as const;

type Trigger = EmailDispatchLog['trigger'];

// ─── Settings (AppSettings) ────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Stored JSON → settings. Like upstream, missing fields fall back to the defaults; a row that is
 * corrupt or fails validation falls back to the defaults entirely (a bad admin edit must not stop
 * the mail), so this never throws.
 */
export function parseStoredSettings(
  raw: string,
  fallbackUpdatedAt: Date
): EmailNotificationSettings {
  let parsed: Record<string, unknown>;
  try {
    parsed = asRecord(JSON.parse(raw));
  } catch {
    return DEFAULT_EMAIL_SETTINGS;
  }
  const merged = {
    masterEnabled: parsed.masterEnabled ?? DEFAULT_EMAIL_SETTINGS.masterEnabled,
    onTicketSubmitted: {
      ...DEFAULT_EMAIL_SETTINGS.onTicketSubmitted,
      ...asRecord(parsed.onTicketSubmitted),
    },
    onTicketResolved: {
      ...DEFAULT_EMAIL_SETTINGS.onTicketResolved,
      ...asRecord(parsed.onTicketResolved),
    },
    onTicketEvaluated: {
      ...DEFAULT_EMAIL_SETTINGS.onTicketEvaluated,
      ...asRecord(parsed.onTicketEvaluated),
    },
  };
  const result = emailSettingsInputSchema.safeParse(merged);
  if (!result.success) return DEFAULT_EMAIL_SETTINGS;
  const updatedAt =
    typeof parsed.updatedAt === 'string' ? parsed.updatedAt : fallbackUpdatedAt.toISOString();
  return { ...result.data, updatedAt };
}

export async function loadEmailSettings(): Promise<EmailNotificationSettings> {
  const row = await prisma.appSetting.findUnique({
    where: { key: EMAIL_SETTINGS_KEY },
    select: { value: true, updatedAt: true },
  });
  return row?.value ? parseStoredSettings(row.value, row.updatedAt) : DEFAULT_EMAIL_SETTINGS;
}

export async function storeEmailSettings(
  input: Omit<EmailNotificationSettings, 'updatedAt'>,
  userId: string
): Promise<EmailNotificationSettings> {
  const settings: EmailNotificationSettings = { ...input, updatedAt: new Date().toISOString() };
  const value = JSON.stringify(settings);
  await prisma.appSetting.upsert({
    where: { key: EMAIL_SETTINGS_KEY },
    create: { key: EMAIL_SETTINGS_KEY, value, updatedBy: userId },
    update: { value, updatedBy: userId },
  });
  return settings;
}

// ─── Dispatch log (EmailDispatchLogs) ─────────────────────────────────────────

export function mapDispatchLog(row: DispatchLogRow): EmailDispatchLog {
  return {
    id: row.id,
    timestamp: row.createdAt.toISOString(),
    trigger: row.triggerEvent as Trigger,
    ticketId: row.ticketId ?? '',
    trackingCode: row.trackingCode,
    recipientEmail: row.recipientEmail,
    recipientName: row.recipientName,
    recipientRole: row.recipientRole as EmailDispatchLog['recipientRole'],
    subject: row.subject,
    body: row.body,
    status: row.status as EmailDispatchLog['status'],
    deliveryChannel: row.deliveryChannel ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
  };
}

export async function listDispatchLogs(): Promise<EmailDispatchLog[]> {
  const rows = await prisma.emailDispatchLog.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: DISPATCH_LOG_LIMIT,
  });
  return rows.map(mapDispatchLog);
}

/** Soft delete (org rule) — the rows stay in the table, just out of the admin's list. */
export async function clearDispatchLogs(userId: string): Promise<void> {
  await prisma.emailDispatchLog.updateMany({
    where: { isDeleted: false },
    data: { isDeleted: true, isActive: false, updatedBy: userId },
  });
}

// ─── Rendering ──────────────────────────────────────────────────────────────────

/** The mail's actor: the signed-in user, with dev mode when their role holds `dev-mode:enable`. */
export function mailActorFor(viewer: Pick<TicketViewer, 'email' | 'role' | 'config'>): MailActor {
  const keys = permissionsFor(viewer.role, viewer.config?.allowedTabs ?? []);
  return { email: viewer.email, hasDevMode: keys.includes(PERMISSIONS.DEV_MODE) };
}

/** Absolute link for the mail (opened outside the app): the gatekeeper inbox for staff, the
 * tracking page for submitters. */
export function trackingUrlFor(page: '/gatekeeper' | '/my-tickets'): string {
  const base = env.APP_URL || env.BETTER_AUTH_URL;
  const origin = base ? new URL(base).origin : ''; // drops any trailing slash, no regex needed
  return `${origin}${env.NEXT_PUBLIC_BASE_PATH}${page}`;
}

/** Plain-text template → HTML. Every value (and the admin's text) is escaped; newlines kept. */
export function renderBodyHtml(text: string, trackingUrl?: string): string {
  let html = escapeHtml(text.replaceAll('\r\n', '\n')).replaceAll('\n', '<br>');
  if (trackingUrl) {
    const url = escapeHtml(trackingUrl);
    html = html.replaceAll(
      url,
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );
  }
  return `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151">${html}</div>`;
}

const singleLine = (text: string) => text.replaceAll(/\s+/g, ' ').trim();

const categoryTh = (category: string) =>
  CATEGORY_DEFINITIONS[category as GrievanceCategory]?.nameTh || category;

const formatDate = (date: Date) => date.toLocaleString('th-TH', BANGKOK);

function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return message.slice(0, 500);
}

// ─── Dispatch ──────────────────────────────────────────────────────────────────

interface Recipient {
  /** Where the mail goes; null/empty = nobody to send to. */
  email: string | null | undefined;
  name: string;
  role: EmailDispatchLog['recipientRole'];
  /** What the log (and the dev-mode banner) shows instead of `email` when it must stay hidden. */
  maskedEmail?: string;
  /** Copied in (e.g. the category Lead when someone else was assigned). */
  cc?: string;
}

interface DispatchSpec {
  trigger: Trigger;
  ticketId?: string;
  trackingCode: string;
  template: EmailNotificationTemplate;
  /** Master switch AND the trigger's own switch. */
  enabled: boolean;
  /** Set → logged as 'disabled' with this reason, nothing is sent. */
  skipReason?: string;
  vars: Record<string, string>;
  recipient: Recipient;
  actor: MailActor;
  createdBy?: string;
  subjectPrefix?: string;
}

const NOT_SENT_BODY = '(ไม่ได้ส่งอีเมลฉบับนี้ — ระบบไม่เก็บเนื้อหา)';

/** "a@x, B@y" → normalized, de-duplicated "a@x, b@y" (a recipient may be a whole team). */
function emailList(list: string | null | undefined): string {
  return [...new Set((list ?? '').split(',').map(normalizeEmail).filter(Boolean))].join(', ');
}

type Outcome = Pick<EmailDispatchLog, 'status'> & { errorMessage?: string };

async function deliver(spec: DispatchSpec, subject: string, bodyText: string): Promise<Outcome> {
  if (!spec.enabled) return { status: 'disabled' };
  if (spec.skipReason) return { status: 'disabled', errorMessage: spec.skipReason };
  const to = emailList(spec.recipient.email);
  if (!to) return { status: 'failed', errorMessage: 'No recipient email address' };
  try {
    await sendRenderedMail({
      subject,
      html: renderBodyHtml(bodyText, spec.vars.trackingUrl),
      to,
      cc: spec.recipient.cc,
      bannerTo: spec.recipient.maskedEmail,
      actor: spec.actor,
    });
    return { status: 'sent' };
  } catch (error) {
    console.error('email dispatch failed', { trigger: spec.trigger, error });
    return { status: 'failed', errorMessage: errorText(error) };
  }
}

/** Renders, sends (when allowed) and records one email. Throws only if the log write fails. */
async function dispatch(spec: DispatchSpec): Promise<EmailDispatchLog> {
  const subject = singleLine(
    `${spec.subjectPrefix ?? ''}${interpolateEmailTemplate(spec.template.subject, spec.vars)}`
  ).slice(0, 1000);
  const bodyText = interpolateEmailTemplate(spec.template.body, spec.vars);
  const outcome = await deliver(spec, subject, bodyText);
  const row = await prisma.emailDispatchLog.create({
    data: {
      triggerEvent: spec.trigger,
      ticketId: spec.ticketId,
      trackingCode: spec.trackingCode,
      recipientEmail: (spec.recipient.maskedEmail || emailList(spec.recipient.email) || '-').slice(
        0,
        200
      ),
      recipientName: spec.recipient.name.slice(0, 200),
      recipientRole: spec.recipient.role,
      subject,
      // A skipped/failed mail keeps no ticket text — the log must not reveal what was withheld.
      body: outcome.status === 'sent' ? bodyText : NOT_SENT_BODY,
      status: outcome.status,
      deliveryChannel: DELIVERY_CHANNEL,
      errorMessage: outcome.errorMessage,
      createdBy: spec.createdBy,
    },
  });
  return mapDispatchLog(row);
}

// ─── Ticket events ─────────────────────────────────────────────────────────────

/** The ticket columns the two emails read (a Prisma `ticket` row satisfies this). */
export interface NotifiableTicket {
  id: string;
  trackingCode: string;
  category: string;
  title: string;
  description: string;
  urgency: string;
  confidentiality: string;
  isDirectToExecutive: boolean;
  submitterName: string | null;
  submitterDepartment: string | null;
  submitterEmail: string | null;
  loginEmail: string | null;
  createdAt: Date;
  /** Set when lib/auto-assign.ts picked an officer at submit time. */
  assignedOfficerName?: string | null;
  assignedOfficerEmail?: string | null;
}

export interface NotifyContext {
  actor: MailActor;
  /** User id written to CreatedBy of the log row. */
  userId: string;
}

/**
 * Every active GK of the category, Lead included, all on the To line (owner 2026-10-14 — one rule for
 * every category, no single assignee mail). No officers → the department's escalation address.
 */
async function gatekeeperRecipient(category: string): Promise<Recipient> {
  const config = await prisma.departmentGatekeeperConfig.findFirst({
    where: { category, isDeleted: false },
    include: {
      officers: { where: { isActive: true, isDeleted: false }, orderBy: { createdAt: 'asc' } },
    },
  });
  const team = emailList(config?.officers.map((o) => o.email).join(','));
  return {
    email: team || config?.escalationEmail,
    name: `ทีมงาน Gatekeeper ประจำฝ่าย ${categoryTh(category)}`,
    role: 'gatekeeper',
  };
}

/** Active executives whose type is CEO or EVP — copied on direct-to-executive tickets. */
async function ceoAndEvpEmails(): Promise<string[]> {
  const rows = await prisma.executiveMember.findMany({
    where: { roleType: { in: ['CEO', 'EVP'] }, status: 'active', isActive: true, isDeleted: false },
    select: { email: true },
  });
  return rows.map((r) => normalizeEmail(r.email)).filter(Boolean);
}

/** One comma-separated CC line, without duplicates or anyone already on the To line. */
function ccLine(to: string | null | undefined, addresses: string[]): string | undefined {
  const toList = new Set(emailList(to).split(', '));
  const seen = new Set<string>();
  for (const address of addresses) {
    const email = normalizeEmail(address);
    if (email && !toList.has(email)) seen.add(email);
  }
  return seen.size > 0 ? [...seen].join(', ') : undefined;
}

function senderIdentity(ticket: NotifiableTicket) {
  if (ticket.confidentiality === 'anonymous') {
    return { name: ANONYMOUS_SENDER, dept: HIDDEN_DEPARTMENT, email: '-' };
  }
  if (ticket.confidentiality === 'confidential_restricted') {
    return { name: PROTECTED_ACTOR_NAME, dept: HIDDEN_DEPARTMENT, email: '-' };
  }
  return {
    name: ticket.submitterName || 'พนักงานผู้ยื่นเรื่อง',
    dept: ticket.submitterDepartment || 'ทั่วไป',
    email: ticket.submitterEmail || '-',
  };
}

/**
 * "Ticket submitted": tell every GK of the category. A direct-to-executive ticket goes to the same
 * team with every active CEO/EVP in CC and a subject tag (owner
 * 2026-10-14 — the gatekeeper role needs the RBAC "direct CEO/EVP inbox" right to open it). Never throws.
 */
export async function notifyTicketSubmitted(
  ticket: NotifiableTicket,
  ctx: NotifyContext
): Promise<void> {
  try {
    const settings = await loadEmailSettings();
    const gatekeeper = await gatekeeperRecipient(ticket.category);
    const recipient = ticket.isDirectToExecutive
      ? { ...gatekeeper, cc: ccLine(gatekeeper.email, await ceoAndEvpEmails()) }
      : gatekeeper;
    const sender = senderIdentity(ticket);
    await dispatch({
      trigger: 'ticket_submitted',
      ticketId: ticket.id,
      trackingCode: ticket.trackingCode,
      template: settings.onTicketSubmitted,
      enabled: settings.masterEnabled && settings.onTicketSubmitted.enabled,
      subjectPrefix: ticket.isDirectToExecutive ? '[ส่งตรงผู้บริหาร] ' : undefined,
      recipient,
      actor: ctx.actor,
      createdBy: ctx.userId,
      vars: {
        ticketId: ticket.trackingCode || ticket.id,
        title: ticket.title || '-',
        category: ticket.category,
        categoryTh: categoryTh(ticket.category),
        senderName: sender.name,
        senderDept: sender.dept,
        senderEmail: sender.email,
        recipientName: recipient.name,
        urgency: ticket.urgency,
        description: ticket.description || '-',
        submissionDate: formatDate(ticket.createdAt),
        trackingUrl: trackingUrlFor('/gatekeeper'),
      },
    });
  } catch (error) {
    console.error('ticket-submitted email failed', { ticketId: ticket.id, error });
  }
}

export interface ResolvedDetails {
  resolutionNotes: string;
  resolvedBy: string;
}

function submitterRecipient(ticket: NotifiableTicket): Recipient {
  // loginEmail is the signed-in submitter (server-set); the typed submitterEmail only for legacy rows.
  const email = ticket.loginEmail || ticket.submitterEmail;
  if (ticket.confidentiality === 'standard_named') {
    return { email, name: ticket.submitterName || 'พนักงานผู้ยื่นเรื่อง', role: 'employee' };
  }
  // Anonymous / restricted: the submitter is mailed, but nobody else may learn who they are.
  const name = ticket.confidentiality === 'anonymous' ? ANONYMOUS_RECIPIENT : PROTECTED_ACTOR_NAME;
  return { email, name, role: 'employee', maskedEmail: MASKED_SUBMITTER_EMAIL };
}

/** Upstream rule "ticket resolved": tell the submitter. Never throws. */
export async function notifyTicketResolved(
  ticket: NotifiableTicket,
  details: ResolvedDetails,
  ctx: NotifyContext
): Promise<void> {
  try {
    const settings = await loadEmailSettings();
    const recipient = submitterRecipient(ticket);
    await dispatch({
      trigger: 'ticket_resolved',
      ticketId: ticket.id,
      trackingCode: ticket.trackingCode,
      template: settings.onTicketResolved,
      enabled: settings.masterEnabled && settings.onTicketResolved.enabled,
      recipient,
      actor: ctx.actor,
      createdBy: ctx.userId,
      vars: {
        ticketId: ticket.trackingCode || ticket.id,
        title: ticket.title || '-',
        category: ticket.category,
        categoryTh: categoryTh(ticket.category),
        recipientName: recipient.name,
        resolvedBy: details.resolvedBy || 'เจ้าหน้าที่ผู้รับผิดชอบ',
        resolvedDate: formatDate(new Date()),
        resolutionNotes:
          details.resolutionNotes || 'ดำเนินการแก้ไขและปรับปรุงตามขั้นตอนเรียบร้อยแล้ว',
        trackingUrl: trackingUrlFor('/my-tickets'),
      },
    });
  } catch (error) {
    console.error('ticket-resolved email failed', { ticketId: ticket.id, error });
  }
}

export interface EvaluationDetails {
  overallScore: number;
  isResolvedPermanently: boolean;
  feedbackComment?: string | null;
  improvementSuggestions?: string | null;
}

/**
 * "Ticket evaluated": the submitter's CSAT goes to every GK of the category — same recipients as a
 * new ticket. Carries the
 * rating and the submitter's own words, never who they are. Never throws.
 */
export async function notifyTicketEvaluated(
  ticket: NotifiableTicket,
  evaluation: EvaluationDetails,
  ctx: NotifyContext
): Promise<void> {
  try {
    const settings = await loadEmailSettings();
    const recipient = await gatekeeperRecipient(ticket.category);
    await dispatch({
      trigger: 'ticket_evaluated',
      ticketId: ticket.id,
      trackingCode: ticket.trackingCode,
      template: settings.onTicketEvaluated,
      enabled: settings.masterEnabled && settings.onTicketEvaluated.enabled,
      recipient,
      actor: ctx.actor,
      createdBy: ctx.userId,
      vars: {
        ticketId: ticket.trackingCode || ticket.id,
        title: ticket.title || '-',
        category: ticket.category,
        categoryTh: categoryTh(ticket.category),
        recipientName: recipient.name,
        overallScore: String(evaluation.overallScore),
        resolvedText: evaluation.isResolvedPermanently ? 'ใช่' : 'ไม่ใช่',
        feedbackComment: evaluation.feedbackComment?.trim() || '-',
        improvementSuggestions: evaluation.improvementSuggestions?.trim() || '-',
        evaluatedDate: formatDate(new Date()),
        trackingUrl: trackingUrlFor('/gatekeeper'),
      },
    });
  } catch (error) {
    console.error('ticket-evaluated email failed', { ticketId: ticket.id, error });
  }
}

// ─── Test send ─────────────────────────────────────────────────────────────────

type TemplateTrigger = Exclude<Trigger, 'test_dispatch'>;

function testVars(trigger: TemplateTrigger): Record<string, string> {
  const now = formatDate(new Date());
  return {
    ticketId: 'TK-2026-TEST',
    title: 'ตัวอย่าง: ติดขัดขั้นตอนการส่งเอกสารและระบบเบิกจ่าย',
    category: 'HR',
    categoryTh: 'ทรัพยากรบุคคลและแรงงานสัมพันธ์',
    senderName: 'สมศักดิ์ มั่นคง',
    senderDept: 'ฝ่ายปฏิบัติการคลังสินค้า',
    senderEmail: 'somsak.m@enterprise.co.th',
    recipientName:
      trigger === 'ticket_resolved'
        ? 'สมศักดิ์ มั่นคง (พนักงาน)'
        : 'คุณวิภาวรรณ สดใส (Lead Gatekeeper)',
    urgency: 'Urgent',
    description:
      'ทดสอบส่งข้อความแจ้งเตือนทางระบบอีเมลอัตโนมัติ เพื่อตรวจสอบความถูกต้องของ Subject และ Body Template',
    submissionDate: now,
    resolvedBy: 'คุณนพดล เกียรติสกุล (HR Gatekeeper)',
    resolvedDate: now,
    resolutionNotes:
      'ได้ปรับปรุงแบบฟอร์มเบิกจ่ายออนไลน์และเพิ่มช่องทางยืนยันเอกสารผ่านระบบอัตโนมัติแล้ว',
    overallScore: '4',
    resolvedText: 'ใช่',
    feedbackComment: 'เจ้าหน้าที่ติดตามเรื่องและแจ้งความคืบหน้าอย่างสม่ำเสมอ',
    improvementSuggestions: 'อยากให้มีการแจ้งเตือนเมื่อสถานะเปลี่ยน',
    evaluatedDate: now,
    trackingUrl: trackingUrlFor(trigger === 'ticket_resolved' ? '/my-tickets' : '/gatekeeper'),
  };
}

const TEMPLATE_KEY: Record<
  TemplateTrigger,
  keyof Omit<EmailNotificationSettings, 'masterEnabled' | 'updatedAt'>
> = {
  ticket_submitted: 'onTicketSubmitted',
  ticket_resolved: 'onTicketResolved',
  ticket_evaluated: 'onTicketEvaluated',
};

/**
 * "Send Test Dispatch": renders the saved template with sample data and mails it to the admin who
 * pressed the button — never to a real gatekeeper/employee. Ignores the enabled switches (a test
 * of a switched-off template is still a test). Throws only if the log write fails.
 */
export async function sendTestNotification(
  trigger: TemplateTrigger,
  ctx: NotifyContext & { email: string }
): Promise<EmailDispatchLog> {
  const settings = await loadEmailSettings();
  const template = settings[TEMPLATE_KEY[trigger]];
  const vars = testVars(trigger);
  return dispatch({
    trigger: 'test_dispatch',
    ticketId: 'TK-2026-TEST',
    trackingCode: 'TK-2026-TEST',
    template,
    enabled: true,
    vars,
    recipient: { email: ctx.email, name: vars.recipientName, role: 'test' },
    actor: ctx.actor,
    createdBy: ctx.userId,
    subjectPrefix: '[TEST SIMULATION] ',
  });
}
