// lib/types/mail-templates.ts — ugt-nextjs-mail-setup (2026-09-02).
// Adapted from the skill's generic request/approve/reject example to this
// project's actual domain: NotificationItem['type'] in src/types.ts
// ('new_ticket' | 'status_update' | 'satisfaction_pending' |
// 'direct_ceo_alert') — one mail template per in-app
// notification type, so every notification the app already generates can
// also go out by email. No 'auth.password-reset' key: this project is
// SSO-only (Keycloak), no local accounts to reset a password for — see
// docs/project-context/decisions.md (ugt-nextjs-auth-setup, 2026-09-02).
import { z } from 'zod';

/**
 * Master mail templates — subject + editable HTML body per workflow email,
 * editable from `/admin/mail-templates`. Defaults live in code
 * (`DEFAULT_MAIL_TEMPLATES`); an admin override is stored as one `AppSettings`
 * row keyed `mailTemplate:<key>`. With no override the in-code default is used,
 * so mail works the moment this chunk is installed — nothing to seed.
 *
 * Bodies use `{{token}}` placeholders substituted at send time. Values are
 * HTML-escaped, so a user-typed reason can never inject markup into an email.
 */

// ─── Keys ───────────────────────────────────────────────────────────────────
// 1:1 with NotificationItem['type'] (src/types.ts) — every in-app
// notification kind gets a matching email template.

export const MAIL_TEMPLATE_KEYS = [
  'ticket.new_ticket',
  'ticket.status_update',
  'ticket.satisfaction_pending',
  'ticket.direct_ceo_alert',
] as const;

export type MailTemplateKey = (typeof MAIL_TEMPLATE_KEYS)[number];

/** AppSettings row key holding a stored override. */
export function mailTemplateSettingKey(key: MailTemplateKey): string {
  return `mailTemplate:${key}`;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

/** Errors are CODES, not translated text — the UI translates them inline
 *  (no i18n catalog in this project — see docs/DESIGN.md §10). */
export const mailTemplateSchema = z.object({
  subject: z.string().min(1, 'SUBJECT_REQUIRED').max(300, 'SUBJECT_TOO_LONG'),
  html: z.string().min(1, 'BODY_REQUIRED').max(20000, 'BODY_TOO_LONG'),
});

export type MailTemplateErrorCode =
  'SUBJECT_REQUIRED' | 'SUBJECT_TOO_LONG' | 'BODY_REQUIRED' | 'BODY_TOO_LONG';

export type MailTemplate = z.infer<typeof mailTemplateSchema>;

// ─── Definitions (editor metadata + allowed tokens) ──────────────────────────

/** Status banner above the editable content. */
export interface MailBannerSpec {
  /** `{{token}}` whose value becomes the banner text. */
  token: string;
  tone: 'success' | 'danger';
}

/** Call-to-action button below the editable content. */
export interface MailCtaSpec {
  label: string;
  /** `{{token}}` whose value is the button href. */
  urlToken: string;
}

export interface MailTemplateDefinition {
  key: MailTemplateKey;
  /** Workflow this template belongs to — groups the editor's selector. */
  menu: string;
  label: string;
  description: string;
  /** Allowed `{{token}}` names — drives editor hints and the preview. */
  variables: string[];
  /**
   * Subset of `variables` whose value is pre-built, already-safe HTML and must
   * NOT be escaped at send time (e.g. a server-built table).
   * **Never put a user-controlled value in here.**
   */
  htmlVariables?: readonly string[];
  /** Overrides merged over the preview sample. */
  previewSample?: Record<string, string>;
  // ── Fixed chrome (assembled by composeEmail — not editable) ───────────────
  /** Topic in the email header (h1). */
  heading: string;
  banner?: MailBannerSpec;
  cta?: MailCtaSpec;
}

export const MAIL_TEMPLATE_DEFINITIONS: MailTemplateDefinition[] = [
  {
    key: 'ticket.new_ticket',
    menu: 'คำร้อง (Ticket)',
    label: 'ยื่นเรื่องสำเร็จ',
    description: 'ส่งถึงผู้ยื่นเรื่องทันทีที่ยื่นข้อร้องเรียน/ข้อเสนอแนะเข้าระบบสำเร็จ',
    heading: 'ยื่นเรื่องเข้าระบบสำเร็จ',
    variables: [
      'appName',
      'recipientName',
      'trackingCode',
      'notificationTitle',
      'notificationMessage',
      'detailUrl',
    ],
    cta: { label: 'ติดตามสถานะคำร้อง →', urlToken: 'detailUrl' },
  },
  {
    key: 'ticket.status_update',
    menu: 'คำร้อง (Ticket)',
    label: 'อัปเดตสถานะคำร้อง',
    description: 'ส่งถึงผู้ยื่นเรื่องทุกครั้งที่ Gatekeeper เปลี่ยนสถานะคำร้อง',
    heading: 'อัปเดตความคืบหน้าคำร้อง',
    variables: [
      'appName',
      'recipientName',
      'trackingCode',
      'notificationTitle',
      'notificationMessage',
      'detailUrl',
    ],
    cta: { label: 'ดูรายละเอียดความคืบหน้า →', urlToken: 'detailUrl' },
  },
  {
    key: 'ticket.satisfaction_pending',
    menu: 'คำร้อง (Ticket)',
    label: 'ขอประเมินความพึงพอใจ',
    description: 'ส่งถึงผู้ยื่นเรื่องเมื่อหน่วยงานแก้ไขปัญหาเสร็จสิ้น เชิญให้คะแนน CSAT',
    heading: 'แก้ไขเสร็จสิ้น — กรุณาประเมินความพึงพอใจ',
    variables: [
      'appName',
      'recipientName',
      'trackingCode',
      'notificationTitle',
      'notificationMessage',
      'detailUrl',
    ],
    banner: { token: 'notificationTitle', tone: 'success' },
    cta: { label: 'ให้คะแนนความพึงพอใจ →', urlToken: 'detailUrl' },
  },
  {
    key: 'ticket.direct_ceo_alert',
    menu: 'แจ้งเตือนผู้บริหาร (Executive)',
    label: 'แจ้งเตือน CEO/EVP ด่วน',
    description:
      'ส่งถึงผู้บริหาร/กรรมการที่เปิดรับการแจ้งเตือน (ExecutiveMembers.receiveAlertNotifications) ทันทีที่มีคำร้องส่งตรงถึงผู้บริหาร',
    heading: 'แจ้งเตือนข้อร้องเรียนสำคัญส่งตรงถึงผู้บริหาร',
    variables: [
      'appName',
      'recipientName',
      'trackingCode',
      'notificationTitle',
      'notificationMessage',
      'detailUrl',
    ],
    banner: { token: 'notificationTitle', tone: 'danger' },
    cta: { label: 'เปิด Dashboard ผู้บริหาร →', urlToken: 'detailUrl' },
  },
];

export const MAIL_TEMPLATE_DEFINITION_BY_KEY: Record<MailTemplateKey, MailTemplateDefinition> =
  Object.fromEntries(MAIL_TEMPLATE_DEFINITIONS.map((d) => [d.key, d])) as Record<
    MailTemplateKey,
    MailTemplateDefinition
  >;

/** Base sample values for the editor preview (per-template overrides merge on top). */
export const MAIL_TEMPLATE_PREVIEW_SAMPLE_BASE: Record<string, string> = {
  appName: 'UGT VoiceCare',
  recipientName: 'สมชาย ใจดี',
  trackingCode: 'TK-2026-0881',
  notificationTitle: 'อัปเดตความคืบหน้า (TK-2026-0881)',
  notificationMessage:
    'เรื่องของคุณมีการเปลี่ยนสถานะเป็น "กำลังแก้ไข (In Progress)" โดย ฝ่ายทรัพยากรบุคคล',
  detailUrl: 'https://voicecare.example.company.com/my-tickets',
};

// ─── Fixed chrome ────────────────────────────────────────────────────────────
// Card frame, header, greeting, banner, CTA, divider and footer are FIXED and
// assembled by `composeEmail` at render time — they are NOT part of the editable
// template, so an admin cannot break the layout or delete the disclaimer.
// Email clients do not support CSS variables: every colour here is literal hex.
// #4f46e5 = Tailwind indigo-600, this project's primary color (docs/DESIGN.md §1).

const HEADER_COLOR = '#4f46e5';
const PAGE_BG = '#f4f5f7';
const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

const EMAIL_HEADER = (heading: string) =>
  `<tr><td style="background-color:${HEADER_COLOR};padding:24px 32px">` +
  `<p style="margin:0;font-size:11px;color:#e0e7ff;letter-spacing:0.08em;text-transform:uppercase">{{appName}}</p>` +
  `<h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3">${heading}</h1>` +
  `</td></tr>`;

const GREETING = `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151">เรียนคุณ <strong>{{recipientName}}</strong>,</p>`;

// ต้องคงข้อความ "กรุณาอย่าตอบกลับ" ไว้เสมอ — admin แก้ได้แค่เนื้อหาข้างใน
// composeEmail ไม่ใช่ chrome นี้ (ดู .claude/rules/ugt-nextjs-mail.md)
const EMAIL_FOOTER =
  `<tr><td style="padding:0 32px"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0"></td></tr>` +
  `<tr><td style="padding:20px 32px 28px">` +
  `<p style="margin:0 0 4px;font-size:11px;color:#9ca3af">อีเมลฉบับนี้จัดส่งโดยอัตโนมัติจากระบบ {{appName}} — กรุณาอย่าตอบกลับอีเมลนี้โดยตรง</p>` +
  `<p style="margin:0;font-size:11px;color:#9ca3af">หากพบปัญหาหรือต้องการข้อมูลเพิ่มเติม กรุณาติดต่อทีม HR/IT Support (__SUPPORT_CONTACT_EMAIL__)</p>` +
  `</td></tr>`;

const BANNER_TONE = {
  success: { bg: '#f0fdf4', border: '#22c55e', color: '#16a34a' },
  danger: { bg: '#fef2f2', border: '#ef4444', color: '#dc2626' },
} as const;

function bannerHtml(banner: MailBannerSpec): string {
  const tone = BANNER_TONE[banner.tone];
  return (
    `<div style="margin:0 0 20px;padding:12px 16px;background:${tone.bg};border-left:4px solid ${tone.border};border-radius:6px">` +
    `<p style="margin:0;color:${tone.color};font-weight:600;font-size:15px">{{${banner.token}}}</p></div>`
  );
}

function ctaHtml(cta: MailCtaSpec): string {
  return (
    `<div style="margin-top:8px"><a href="{{${cta.urlToken}}}" target="_blank" ` +
    `style="display:inline-block;background:${HEADER_COLOR};color:#fff;text-decoration:none;padding:9px 18px;border-radius:6px;font-size:13px;font-weight:600">` +
    `${cta.label}</a></div>`
  );
}

/**
 * Assemble the full email from fixed chrome + editable content.
 * `{{token}}` placeholders survive composition and are substituted at send time.
 * Layout: page wrapper → card → header → body[greeting → banner → content → cta]
 *         → divider → footer.
 */
export function composeEmail(def: MailTemplateDefinition, contentHtml: string): string {
  return [
    `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAGE_BG};padding:32px 16px;font-family:${FONT};color:#1a1a2e">`,
    '<tr><td align="center">',
    `<table width="760" cellpadding="0" cellspacing="0" border="0" style="max-width:760px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.1)">`,
    EMAIL_HEADER(def.heading),
    `<tr><td style="padding:28px 32px 8px;font-size:14px;line-height:1.6;color:#374151">`,
    GREETING,
    def.banner ? bannerHtml(def.banner) : '',
    contentHtml,
    def.cta ? ctaHtml(def.cta) : '',
    '</td></tr>',
    EMAIL_FOOTER,
    '</table>',
    '</td></tr>',
    '</table>',
  ].join('');
}

// ─── Default templates (editable content only) ───────────────────────────────
// Body ใช้ {{notificationTitle}}/{{notificationMessage}} ซึ่งเป็นข้อความ
// เดียวกับที่ขึ้นในลิ้นชักแจ้งเตือนในแอป (ดู lib/actions/tickets.ts) — เนื้อหา
// ในอีเมลกับในแอปจึงตรงกันเสมอ ไม่ต้องดูแลสองชุด

export const DEFAULT_MAIL_TEMPLATES: Record<MailTemplateKey, MailTemplate> = {
  'ticket.new_ticket': {
    subject: '[{{appName}}] ยื่นเรื่องสำเร็จ — {{trackingCode}}',
    html: [
      '<p><strong>{{notificationTitle}}</strong></p>',
      '<p>{{notificationMessage}}</p>',
      '<p>กรุณาเก็บรหัสติดตาม <strong>{{trackingCode}}</strong> ไว้เพื่อใช้ตรวจสอบสถานะภายหลัง</p>',
    ].join(''),
  },

  'ticket.status_update': {
    subject: '[{{appName}}] อัปเดตสถานะคำร้อง {{trackingCode}}',
    html: ['<p><strong>{{notificationTitle}}</strong></p>', '<p>{{notificationMessage}}</p>'].join(
      ''
    ),
  },

  'ticket.satisfaction_pending': {
    subject: '[{{appName}}] แก้ไขเสร็จสิ้น กรุณาประเมินความพึงพอใจ — {{trackingCode}}',
    html: [
      '<p>{{notificationMessage}}</p>',
      '<p>ความคิดเห็นของคุณช่วยให้องค์กรพัฒนาการดำเนินการให้ดียิ่งขึ้น</p>',
    ].join(''),
  },

  'ticket.direct_ceo_alert': {
    subject: '[{{appName}}] [ด่วน] ข้อร้องเรียนสำคัญส่งตรงถึงผู้บริหาร — {{trackingCode}}',
    html: [
      '<p>{{notificationMessage}}</p>',
      '<p>คำร้องนี้ถูกจัดประเภทเป็นช่องทางส่งตรงถึงผู้บริหาร (CEO/EVP Whistleblower Channel) กรุณาตรวจสอบโดยเร็ว</p>',
    ].join(''),
  },
};
