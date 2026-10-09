'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Eye,
  Info,
  Check,
  Trash2,
  Clock,
  Inbox,
  UserCheck,
  User,
} from 'lucide-react';
import { EmailNotificationSettings, EmailNotificationTemplate, EmailDispatchLog } from '../types';
import {
  clearEmailDispatchLogs,
  getEmailDispatchLogs,
  getEmailNotificationSettings,
  resetEmailNotificationSettings,
  saveEmailNotificationSettings,
  sendTestEmailNotification,
} from '@/lib/actions/email-settings';
import { interpolateEmailTemplate } from '../services/emailDefaults';
import { Language, useLanguage } from '../context/LanguageContext';
import { useConfirmDialog } from './ConfirmDialog';

type TemplateKey = 'onTicketSubmitted' | 'onTicketResolved';
type Tone = 'indigo' | 'emerald';

// Tailwind needs complete class names at build time, so each tone is spelled out.
interface ToneClasses {
  iconBox: string;
  caseBadge: string;
  toggleOn: string;
  recipientBox: string;
  recipientIcon: string;
  recipientBadge: string;
  focus: string;
  tagHover: string;
  previewBtn: string;
  previewTitle: string;
}

const TONES: Record<Tone, ToneClasses> = {
  indigo: {
    iconBox: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    caseBadge: 'bg-indigo-100/60 text-indigo-700',
    toggleOn: 'bg-indigo-600',
    recipientBox: 'border-indigo-100 bg-indigo-50/50 text-indigo-900',
    recipientIcon: 'text-indigo-600',
    recipientBadge: 'border-indigo-200 text-indigo-700',
    focus: 'focus:border-indigo-500 focus:ring-indigo-500',
    tagHover: 'hover:bg-indigo-50 hover:text-indigo-700',
    previewBtn: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    previewTitle: 'text-indigo-400',
  },
  emerald: {
    iconBox: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    caseBadge: 'bg-emerald-100/60 text-emerald-700',
    toggleOn: 'bg-emerald-600',
    recipientBox: 'border-emerald-100 bg-emerald-50/50 text-emerald-900',
    recipientIcon: 'text-emerald-600',
    recipientBadge: 'border-emerald-200 text-emerald-700',
    focus: 'focus:border-emerald-500 focus:ring-emerald-500',
    tagHover: 'hover:bg-emerald-50 hover:text-emerald-700',
    previewBtn: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    previewTitle: 'text-emerald-400',
  },
};

const SUBMITTED_TAGS = [
  '{ticketId}',
  '{categoryTh}',
  '{category}',
  '{title}',
  '{urgency}',
  '{senderName}',
  '{senderDept}',
  '{submissionDate}',
  '{description}',
  '{trackingUrl}',
];

const RESOLVED_TAGS = [
  '{ticketId}',
  '{title}',
  '{categoryTh}',
  '{recipientName}',
  '{resolvedBy}',
  '{resolvedDate}',
  '{resolutionNotes}',
  '{trackingUrl}',
];

type Translate = (en: string, th: string) => string;

const makeTranslate =
  (lang: Language): Translate =>
  (en, th) =>
    lang === 'en' ? en : th;

const localeOf = (lang: Language) => (lang === 'en' ? 'en-US' : 'th-TH');

/** Mock ticket data used by the live preview (same sample as upstream). */
function buildSampleVariables(lang: Language): Record<string, string> {
  const tr = makeTranslate(lang);
  const now = new Date().toLocaleString(localeOf(lang));
  const gatekeeper = tr('Wipawan Sodsai (Lead Gatekeeper)', 'คุณวิภาวรรณ สดใส (Lead Gatekeeper)');
  return {
    ticketId: 'TK-2026-0881',
    title: tr(
      'Proposal: Streamline medical expense claim and digital paperwork',
      'ข้อเสนอแนะปรับปรุงขั้นตอนการเบิกจ่ายและเอกสารดิจิทัล'
    ),
    category: 'HR',
    categoryTh: tr('Human Resources & Welfare', 'ทรัพยากรบุคคลและแรงงานสัมพันธ์'),
    senderName: tr('Pattarapol Nithithorn', 'คุณภัทรพล นิธิกร'),
    senderDept: tr('Strategy & Marketing Unit', 'ฝ่ายกลยุทธ์และการตลาด'),
    senderEmail: 'pattarapol.n@enterprise.co.th',
    recipientName: gatekeeper,
    urgency: 'Medium',
    description: tr(
      'Proposal to switch medical claims to 100% E-Claim to reduce processing time from 14 days to 3 days.',
      'เสนอให้ระบบเบิกจ่ายค่ารักษาพยาบาลปรับเป็นระบบ E-Claim 100% เพื่อลดระยะเวลาจาก 14 วันเหลือ 3 วัน'
    ),
    submissionDate: now,
    resolvedBy: gatekeeper,
    resolvedDate: now,
    resolutionNotes: tr(
      'HR department approved the E-Claim pilot project, scheduled to test with Strategy Unit next month.',
      'ฝ่ายบุคคลได้อนุมัติโครงการ E-Claim และจะเริ่มทดสอบนำร่องกับฝ่ายกลยุทธ์ในเดือนหน้า'
    ),
    trackingUrl: 'https://voiceplatform.enterprise.co.th/#tracking=TK-2026-0881',
  };
}

interface ToggleSwitchProps {
  readonly id: string;
  readonly checked: boolean;
  readonly onToggle: () => void;
  readonly onClass: string;
  readonly size: 'md' | 'lg';
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, checked, onToggle, onClass, size }) => {
  const large = size === 'lg';
  const trackSize = large ? 'h-7 w-14' : 'h-6 w-11';
  const knobSize = large ? 'h-6 w-6' : 'h-5 w-5';
  const knobOn = large ? 'translate-x-7' : 'translate-x-5';
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative inline-flex ${trackSize} shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? onClass : 'bg-slate-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block ${knobSize} transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? knobOn : 'translate-x-0'
        }`}
      />
    </button>
  );
};

/** Static copy of one template card (already translated). */
interface TemplateCopy {
  readonly caseLabel: string;
  readonly title: string;
  readonly description: string;
  readonly recipientLabel: string;
  readonly recipientBadge: string;
  readonly subjectPlaceholder: string;
  readonly bodyPlaceholder: string;
}

/** Live-preview pane state of one template card. */
interface TemplatePreview {
  readonly open: boolean;
  readonly title: string;
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}

interface TemplateCardProps {
  readonly tone: Tone;
  readonly idKey: 'submitted' | 'resolved';
  readonly icon: React.ReactNode;
  readonly recipientIcon: React.ReactNode;
  readonly copy: TemplateCopy;
  readonly tags: string[];
  readonly template: EmailNotificationTemplate;
  readonly onChange: (patch: Partial<EmailNotificationTemplate>) => void;
  readonly preview: TemplatePreview;
  readonly onTogglePreview: () => void;
  readonly onTestDispatch: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = (props) => {
  const { tone, idKey, template, onChange, copy, preview } = props;
  const previewOpen = preview.open;
  const { lang } = useLanguage();
  const tr = makeTranslate(lang);
  const c = TONES[tone];
  const inputBase = `border border-slate-300 bg-slate-50 font-mono transition focus:bg-white focus:ring-2 ${c.focus}`;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 rounded-xl border p-2.5 ${c.iconBox}`}>{props.icon}</div>
          <div>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${c.caseBadge}`}
            >
              {copy.caseLabel}
            </span>
            <h3 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">{copy.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{copy.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-600">
            {template.enabled ? tr('Active', 'เปิด') : tr('Disabled', 'ปิด')}
          </span>
          <ToggleSwitch
            id={`toggle-ticket-${idKey}-email`}
            checked={template.enabled}
            onToggle={() => onChange({ enabled: !template.enabled })}
            onClass={c.toggleOn}
            size="md"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col space-y-5 p-5 sm:p-6">
        <div
          className={`flex items-center justify-between rounded-xl border p-3 text-xs ${c.recipientBox}`}
        >
          <span className="flex items-center gap-1.5 font-medium">
            <span className={c.recipientIcon}>{props.recipientIcon}</span>
            {tr('Recipient: ', 'ผู้รับ: ')}
            <strong>{copy.recipientLabel}</strong>
          </span>
          <span
            className={`rounded border bg-white px-2 py-0.5 font-mono text-[11px] ${c.recipientBadge}`}
          >
            {copy.recipientBadge}
          </span>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor={`input-${idKey}-subject`}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
            >
              <span>{tr('Email Subject', 'หัวข้ออีเมล (Email Subject)')}</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {tr('Fully customizable', 'แก้ไขได้อิสระ')}
            </span>
          </div>
          <input
            type="text"
            id={`input-${idKey}-subject`}
            value={template.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            placeholder={copy.subjectPlaceholder}
            className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm ${inputBase}`}
          />
        </div>

        <div className="flex flex-1 flex-col">
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor={`textarea-${idKey}-body`}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
            >
              <span>{tr('Email Message Body', 'เนื้อหาข้อความอีเมล (Email Message Body)')}</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {tr('Supports Thai/Eng & Dynamic Tags', 'รองรับข้อความภาษาไทย & ตัวแปร')}
            </span>
          </div>
          <textarea
            id={`textarea-${idKey}-body`}
            rows={12}
            value={template.body}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder={copy.bodyPlaceholder}
            className={`w-full flex-1 resize-y rounded-xl p-3.5 text-xs leading-relaxed ${inputBase}`}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-[11px] font-bold text-slate-500">
            {tr(
              'Click to insert dynamic tags:',
              'คลิกเพื่อแทรกตัวแปรลงในเนื้อหา (Available Dynamic Tags):'
            )}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {props.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onChange({ body: `${template.body} ${tag} ` })}
                className={`cursor-pointer rounded-md border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700 transition ${c.tagHover}`}
                title={tr('Click to insert', 'คลิกเพื่อแทรกตัวแปร')}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            id={`btn-preview-${idKey}-email`}
            onClick={props.onTogglePreview}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${c.previewBtn}`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>
              {previewOpen
                ? tr('Close Preview', 'ปิดตัวอย่าง')
                : tr('Preview Email', 'ดูตัวอย่างอีเมล (Preview)')}
            </span>
          </button>

          <button
            type="button"
            id={`btn-test-${idKey}-email`}
            onClick={props.onTestDispatch}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <Send className="h-3.5 w-3.5 text-slate-500" />
            <span>{tr('Send Test Dispatch', 'ทดสอบส่งจำลอง')}</span>
          </button>
        </div>

        {previewOpen && (
          <div className="animate-fadeIn mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-xs text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className={`font-bold ${c.previewTitle}`}>{preview.title}</span>
              <span className="text-[10px] text-slate-400">Mock Data Applied</span>
            </div>
            <div>
              <span className="text-slate-400">To:</span> {preview.to}
            </div>
            <div>
              <span className="text-slate-400">Subject:</span>{' '}
              <strong className="text-emerald-300">{preview.subject}</strong>
            </div>
            <div className="border-t border-slate-800/80 pt-2 font-sans text-xs leading-relaxed whitespace-pre-wrap text-slate-300">
              {preview.body}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TRIGGER_BADGES: Record<
  EmailDispatchLog['trigger'],
  { className: string; icon: React.ReactNode; en: string; th: string }
> = {
  ticket_submitted: {
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: <Inbox className="h-3 w-3" />,
    en: 'New Submission',
    th: 'ยื่นเรื่องใหม่',
  },
  ticket_resolved: {
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: <CheckCircle2 className="h-3 w-3" />,
    en: 'Resolution Complete',
    th: 'แก้ไขเสร็จสิ้น',
  },
  test_dispatch: {
    className: 'border-purple-200 bg-purple-50 text-purple-700',
    icon: <Send className="h-3 w-3" />,
    en: 'Test Simulation',
    th: 'เคสทดสอบ',
  },
};

interface DispatchLogTableProps {
  readonly logs: EmailDispatchLog[];
  readonly onClear: () => void;
  readonly onView: (log: EmailDispatchLog) => void;
}

const DispatchLogTable: React.FC<DispatchLogTableProps> = ({ logs, onClear, onView }) => {
  const { lang } = useLanguage();
  const tr = makeTranslate(lang);
  const headers: [string, string, string][] = [
    ['Timestamp', 'วัน-เวลา', ''],
    ['Trigger Event', 'เหตุการณ์ (Trigger)', ''],
    ['Ticket Code', 'รหัสเคส', ''],
    ['Recipient', 'ผู้รับ (Recipient)', ''],
    ['Subject', 'หัวข้อ (Subject)', ''],
    ['Status', 'สถานะ', 'text-center'],
    ['Action', 'รายละเอียด', 'text-right'],
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
            <Clock className="h-5 w-5 text-indigo-600" />
            <span>
              {tr(
                'System Email Dispatch History (Sent Email Logs & Outbox)',
                'ประวัติการส่งอีเมลของระบบ (Sent Email Logs & Outbox)'
              )}
            </span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {tr(
              `Records all automated notification dispatches from both live user cases and simulations (${logs.length} entries)`,
              `บันทึกประวัติการส่งอีเมลแจ้งเตือนทุกรายการ ทั้งเคสจริงที่เกิดจากผู้ใช้งานและเคสทดสอบ (${logs.length} รายการ)`
            )}
          </p>
        </div>

        <button
          type="button"
          id="btn-clear-email-logs"
          onClick={onClear}
          disabled={logs.length === 0}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>{tr('Clear Logs', 'ล้างประวัติ')}</span>
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="p-10 text-center text-slate-400">
          <Mail className="mx-auto mb-2 h-10 w-10 opacity-30" />
          <p className="text-xs">
            {tr('No email dispatch records yet.', 'ยังไม่มีประวัติการส่งอีเมลในรอบนี้')}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {tr(
              'When a new ticket is submitted, resolved, or test simulated, records will appear here.',
              'เมื่อมีการยื่นเรื่องใหม่ หรือปิดเคส หรือกดปุ่ม "ทดสอบส่งจำลอง" รายการจะปรากฏที่นี่'
            )}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 uppercase">
              <tr>
                {headers.map(([en, th, align]) => (
                  <th key={en} className={`px-4 py-3 ${align}`}>
                    {tr(en, th)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.map((log) => {
                const badge = TRIGGER_BADGES[log.trigger];
                return (
                  <tr key={log.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-slate-500">
                      {new Date(log.timestamp).toLocaleString(localeOf(lang))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {badge && (
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.icon} {tr(badge.en, badge.th)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap text-slate-900">
                      {log.trackingCode}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{log.recipientName}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {log.recipientEmail}
                      </div>
                    </td>
                    <td
                      className="max-w-xs truncate px-4 py-3 font-medium text-slate-800"
                      title={log.subject}
                    >
                      {log.subject}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {log.status === 'sent' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <Check className="h-3 w-3" /> {tr('Sent', 'ส่งแล้ว (Sent)')}
                        </span>
                      )}
                      {log.status === 'disabled' && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                          title={log.errorMessage}
                        >
                          {tr('Disabled', 'ระบบปิด (Disabled)')}
                        </span>
                      )}
                      {log.status === 'failed' && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700"
                          title={log.errorMessage}
                        >
                          {tr('Failed', 'ส่งไม่สำเร็จ (Failed)')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onView(log)}
                        className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{tr('View', 'เปิดดู')}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface LogDetailModalProps {
  readonly log: EmailDispatchLog;
  readonly onClose: () => void;
}

const STATUS_TEXT_CLASS: Record<EmailDispatchLog['status'], string> = {
  sent: 'text-emerald-600',
  disabled: 'text-slate-500',
  failed: 'text-rose-600',
};

const LogDetailModal: React.FC<LogDetailModalProps> = ({ log, onClose }) => {
  const { lang } = useLanguage();
  const tr = makeTranslate(lang);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const facts: [string, string, string][] = [
    [tr('Tracking ID:', 'รหัสติดตาม:'), log.trackingCode, 'font-bold font-mono'],
    [
      tr('Dispatched At:', 'เวลาส่งออก:'),
      new Date(log.timestamp).toLocaleString(localeOf(lang)),
      'font-mono',
    ],
    [tr('Recipient:', 'ผู้รับ:'), log.recipientName, 'font-semibold'],
    [tr('Recipient Email:', 'อีเมลปลายทาง:'), log.recipientEmail, 'font-mono'],
  ];

  return (
    <div className="animate-fadeIn fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <dialog
        open
        className="static m-0 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl"
      >
        <div className="flex items-center justify-between bg-slate-900 p-5 text-white">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-400" />
            <h4 className="text-sm font-bold sm:text-base">
              {tr('Dispatched Email Details', 'รายละเอียดอีเมลที่ส่งออกจากระบบ')}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('Close', 'ปิด')}
            className="cursor-pointer rounded-lg p-1 text-slate-400 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6 text-xs">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            {facts.map(([label, value, valueClass]) => (
              <div key={label}>
                <span className="block text-[11px] text-slate-400">{label}</span>
                <span className={`text-slate-800 ${valueClass}`}>{value}</span>
              </div>
            ))}
          </div>

          <div>
            <span className="mb-1 block font-bold text-slate-700">
              {tr('Subject:', 'หัวข้ออีเมล (Subject):')}
            </span>
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 font-medium text-slate-900">
              {log.subject}
            </div>
          </div>

          <div>
            <span className="mb-1 block font-bold text-slate-700">
              {tr('Body Content:', 'เนื้อหาข้อความ (Body Content):')}
            </span>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 leading-relaxed whitespace-pre-wrap text-slate-800">
              {log.body}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>
              {tr('Delivery Channel: ', 'ช่องทางส่ง: ')} {log.deliveryChannel || 'SMTP Gateway'}
            </span>
            <span className={`font-semibold ${STATUS_TEXT_CLASS[log.status]}`}>
              {tr('Status: ', 'สถานะ: ')} {log.status}
            </span>
          </div>
          {log.errorMessage && (
            <p className="text-[11px] text-slate-500">
              {tr('Reason: ', 'สาเหตุ: ')}
              {log.errorMessage}
            </p>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-300"
          >
            {tr('Close Window', 'ปิดหน้าต่าง')}
          </button>
        </div>
      </dialog>
    </div>
  );
};

/** A message that clears itself after `ms`; the timer is dropped with the component. */
function useTimedMessage(ms: number) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = (text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), ms);
  };
  return [message, flash] as const;
}

interface PanelProps {
  readonly initialSettings: EmailNotificationSettings;
  readonly initialLogs: EmailDispatchLog[];
}

const EmailSettingsPanel: React.FC<PanelProps> = ({ initialSettings, initialLogs }) => {
  const { lang } = useLanguage();
  const tr = makeTranslate(lang);
  const { askConfirm, confirmDialog } = useConfirmDialog();
  const [settings, setSettings] = useState<EmailNotificationSettings>(initialSettings);
  const [logs, setLogs] = useState<EmailDispatchLog[]>(initialLogs);
  const [saveSuccess, flashSaved] = useTimedMessage(3000);
  const [testSuccessMessage, flashTestSuccess] = useTimedMessage(4000);
  const [errorMessage, flashError] = useTimedMessage(4000);
  const [activePreview, setActivePreview] = useState<'submitted' | 'resolved' | null>(null);
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<EmailDispatchLog | null>(null);
  const busy = useRef(false);

  /** One Server Action at a time; production masks error messages, so any failure is generic. */
  const run = async <T,>(op: () => Promise<T>, apply: (result: T) => void) => {
    if (busy.current) return;
    busy.current = true;
    try {
      apply(await op());
    } catch {
      flashError(
        tr('⚠️ Could not save. Please try again.', '⚠️ บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      );
    } finally {
      busy.current = false;
    }
  };

  const updateTemplate = (key: TemplateKey, patch: Partial<EmailNotificationTemplate>) => {
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const applySaved = (saved: EmailNotificationSettings) => {
    setSettings(saved);
    flashSaved(tr('Settings saved successfully', 'บันทึกการตั้งค่าสำเร็จ'));
  };

  const handleSave = () => run(() => saveEmailNotificationSettings(settings), applySaved);

  const handleReset = () => {
    askConfirm({
      title: tr('Reset email settings', 'รีเซ็ตการตั้งค่าอีเมล'),
      message: tr(
        'Are you sure you want to reset all email templates and notification settings to default?',
        'คุณต้องการคืนค่าเทมเพลตและค่าคอนฟิกการแจ้งเตือน Email ทั้งหมดกลับสู่ค่ามาตรฐานใช่หรือไม่?'
      ),
      confirmLabel: tr('Reset to Default', 'รีเซ็ตเป็นค่าเริ่มต้น'),
      onConfirm: () => run(resetEmailNotificationSettings, applySaved),
    });
  };

  const applyTestLog = (type: 'ticket_submitted' | 'ticket_resolved', log: EmailDispatchLog) => {
    setLogs((prev) => [log, ...prev].slice(0, 100));
    if (log.status === 'failed') {
      flashError(
        tr(
          '⚠️ The test email could not be sent. See the reason in the logs below.',
          '⚠️ ส่งอีเมลทดสอบไม่สำเร็จ ดูสาเหตุได้ในตารางประวัติด้านล่าง'
        )
      );
      return;
    }
    const toGatekeeper = type === 'ticket_submitted';
    flashTestSuccess(
      tr(
        `Simulated email ${toGatekeeper ? 'alert to Gatekeeper' : 'resolution alert to Employee'} sent successfully! View in logs below.`,
        `จำลองการส่งอีเมล ${toGatekeeper ? 'แจ้งเตือนเคสใหม่หา Gatekeeper' : 'แจ้งผลการแก้ไขหาพนักงาน'} สำเร็จ! ตรวจสอบได้ในตารางประวัติด้านล่าง`
      )
    );
  };

  const handleTestDispatch = (type: 'ticket_submitted' | 'ticket_resolved') =>
    run(
      () => sendTestEmailNotification(type),
      (log) => applyTestLog(type, log)
    );

  const handleClearLogs = () => {
    askConfirm({
      title: tr('Clear email logs', 'ล้างประวัติการส่งอีเมล'),
      message: tr(
        'Are you sure you want to clear all sent email logs?',
        'คุณต้องการล้างประวัติการส่งอีเมล (Sent Email Logs) ทั้งหมดใช่หรือไม่?'
      ),
      confirmLabel: tr('Clear Logs', 'ล้างประวัติ'),
      isDestructive: true,
      onConfirm: () => run(clearEmailDispatchLogs, () => setLogs([])),
    });
  };

  const togglePreview = (which: 'submitted' | 'resolved') =>
    setActivePreview(activePreview === which ? null : which);

  const sample = buildSampleVariables(lang);
  const submitterName = tr('Pattarapol Nithithorn', 'คุณภัทรพล นิธิกร');
  const submitterVars = {
    ...sample,
    recipientName: tr(
      'Pattarapol Nithithorn (Submitter)',
      'คุณภัทรพล นิธิกร (พนักงานผู้ยื่นเรื่อง)'
    ),
  };
  const resolvedBodyVars = { ...sample, recipientName: submitterName };

  const glossary: [string, string, string][] = [
    ['{ticketId}', 'Tracking code e.g. TK-2026-0881', 'รหัสติดตาม เช่น TK-2026-0881'],
    ['{title}', 'Subject of grievance/suggestion', 'หัวข้อเรื่องที่พนักงานยื่น'],
    ['{categoryTh}', 'Category name in Thai (6 Categories)', 'ชื่อหมวดหมู่ภาษาไทย (6 หมวดหมู่)'],
    [
      '{category}',
      'Category code in English (HR, Quality...)',
      'รหัสหมวดหมู่ภาษาอังกฤษ (HR, Quality...)',
    ],
    [
      '{urgency}',
      'Urgency level (Low / Medium / High / Critical)',
      'ระดับความเร่งด่วน (Standard / Urgent...)',
    ],
    ['{senderName}', 'Submitter name', 'ชื่อผู้ยื่น (หรือ "ผู้ยื่นนิรนาม")'],
    ['{senderDept}', 'Submitter department', 'สังกัด/ฝ่ายของผู้ยื่น'],
    ['{recipientName}', 'Recipient name', 'ชื่อผู้รับอีเมล'],
    ['{submissionDate}', 'Date & time of submission', 'วันที่และเวลาที่ยื่นเรื่อง'],
    ['{description}', 'Detailed facts of grievance', 'ข้อความรายละเอียดเรื่องร้องเรียน'],
    ['{resolvedBy}', 'Officer who resolved the case', 'ชื่อเจ้าหน้าที่ผู้ดำเนินการปิดเคส'],
    ['{resolvedDate}', 'Date & time of resolution', 'วันที่และเวลาปิดเคส'],
    ['{resolutionNotes}', 'Summary of resolution actions', 'สรุปผลการแก้ไขและการดำเนินงาน'],
    ['{trackingUrl}', 'Direct URL link to track case', 'ลิงก์ตรงสำหรับตรวจสอบสถานะเคส'],
  ];

  return (
    <div className="space-y-8" id="admin-email-notifications-panel">
      {/* HEADER BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-indigo-600 uppercase">
              <Mail className="h-4 w-4" />
              <span>
                {tr(
                  'Enterprise Email Dispatch & Template Manager',
                  'ศูนย์บริหารจัดการการแจ้งเตือนทางอีเมลและเทมเพลต'
                )}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              {tr(
                'Automated Email Notifications System',
                'ระบบแจ้งเตือน Email อัตโนมัติ (Email Notifications)'
              )}
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600 sm:text-sm">
              {tr(
                'Administrators can toggle email notifications ON/OFF, customize the Subject and Body Content with Dynamic Tags when an employee submits a ticket (sent to Gatekeeper) and when a ticket is resolved (sent to Employee).',
                'ผู้ดูแลระบบ (Admin) สามารถ เปิด/ปิด ระบบแจ้งเตือนทางอีเมล, ปรับแต่งหัวข้อ (Subject) และเนื้อหาข้อความ (Body Content) พร้อมรองรับ Dynamic Tags เมื่อพนักงานยื่นข้อร้องเรียน (ส่งหา Gatekeeper) และเมื่อดำเนินการแก้ไขเสร็จสิ้น (ส่งหาพนักงาน)'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-right">
              <span className="block text-xs font-bold text-slate-900">
                {tr('Master Email System', 'ระบบส่งอีเมลหลัก')}
              </span>
              <span
                className={`text-[11px] font-semibold ${settings.masterEnabled ? 'text-emerald-600' : 'text-slate-400'}`}
              >
                {settings.masterEnabled
                  ? tr('● System Enabled', '● กำลังเปิดใช้งาน')
                  : tr('○ System Disabled', '○ ปิดการทำงานทั้งหมด')}
              </span>
            </div>
            <ToggleSwitch
              id="toggle-master-email-notifications"
              checked={settings.masterEnabled}
              onToggle={() =>
                setSettings((prev) => ({ ...prev, masterEnabled: !prev.masterEnabled }))
              }
              onClass="bg-indigo-600"
              size="lg"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {tr('Last updated: ', 'อัปเดตล่าสุด: ')}
              {new Date(settings.updatedAt).toLocaleString(localeOf(lang))}
            </span>
            {saveSuccess && (
              <span className="animate-fadeIn inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {saveSuccess}
              </span>
            )}
            {errorMessage && (
              <span
                role="alert"
                className="animate-fadeIn inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
              >
                {errorMessage}
              </span>
            )}
            {testSuccessMessage && (
              <span className="animate-fadeIn inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                <Check className="h-3.5 w-3.5" />
                {testSuccessMessage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="btn-reset-email-settings"
              onClick={handleReset}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{tr('Reset to Default', 'รีเซ็ตเป็นค่าเริ่มต้น')}</span>
            </button>
            <button
              type="button"
              id="btn-save-email-settings"
              onClick={handleSave}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" />
              <span>{tr('Save All Settings', 'บันทึกการตั้งค่าทั้งหมด')}</span>
            </button>
          </div>
        </div>
      </div>

      {!settings.masterEnabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-xs sm:text-sm">
            <strong>
              {tr(
                'Master Email System is Disabled (OFF): ',
                'ระบบส่งอีเมลหลักถูกปิดอยู่ (Master Switch OFF): '
              )}
            </strong>
            {tr(
              'New ticket submissions and resolutions will not dispatch live emails. Dispatch attempts will be logged with status "disabled" in Sent Email Logs for auditing.',
              'ทุกเคสที่ยื่นใหม่หรือแก้ไขเสร็จสิ้นจะไม่ส่งอีเมลจริงไปยังผู้รับ แต่ระบบจะบันทึกสถานะ "disabled" ลงใน Sent Email Logs เพื่อให้ผู้ดูแลระบบตรวจสอบได้'
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
        <TemplateCard
          tone="indigo"
          idKey="submitted"
          icon={<Inbox className="h-5 w-5" />}
          recipientIcon={<UserCheck className="h-4 w-4" />}
          copy={{
            caseLabel: tr('Case 1 • Ticket Submission', 'กรณีที่ 1 • Ticket Submission'),
            title: tr(
              'Notify Gatekeeper on New Ticket',
              'แจ้งเตือนเมื่อพนักงานยื่นข้อร้องเรียนใหม่'
            ),
            description: tr(
              'Dispatches an email alert to the Category Gatekeeper for triage and assignment.',
              'ส่งอีเมลแจ้งเตือนไปยัง Gatekeeper ประจำหมวดหมู่ เพื่อคัดกรองและดำเนินการ'
            ),
            recipientLabel: tr(
              'Lead Gatekeeper for Category ({categoryTh})',
              'Lead Gatekeeper ประจำหมวดหมู่ ({categoryTh})'
            ),
            recipientBadge: 'Auto-assigned by Category',
            subjectPlaceholder: tr(
              '[VoicePlatform Alert] {ticketId}: New Ticket ({categoryTh})',
              'เช่น [VoicePlatform แจ้งเรื่องใหม่] {ticketId}: มีข้อร้องเรียนใหม่ ({categoryTh})'
            ),
            bodyPlaceholder: tr(
              'Enter notification message to send to Gatekeeper...',
              'กรอกเนื้อหาข้อความที่ต้องการส่งถึง Gatekeeper...'
            ),
          }}
          tags={SUBMITTED_TAGS}
          template={settings.onTicketSubmitted}
          onChange={(patch) => updateTemplate('onTicketSubmitted', patch)}
          preview={{
            open: activePreview === 'submitted',
            title: tr(
              'LIVE PREVIEW: Email sent to Gatekeeper',
              'LIVE PREVIEW: อีเมลส่งหา Gatekeeper'
            ),
            to: `${sample.recipientName} <hr-gatekeeper@enterprise.co.th>`,
            subject: interpolateEmailTemplate(settings.onTicketSubmitted.subject, sample),
            body: interpolateEmailTemplate(settings.onTicketSubmitted.body, sample),
          }}
          onTogglePreview={() => togglePreview('submitted')}
          onTestDispatch={() => handleTestDispatch('ticket_submitted')}
        />

        <TemplateCard
          tone="emerald"
          idKey="resolved"
          icon={<CheckCircle2 className="h-5 w-5" />}
          recipientIcon={<User className="h-4 w-4" />}
          copy={{
            caseLabel: tr('Case 2 • Ticket Resolved', 'กรณีที่ 2 • Ticket Resolved'),
            title: tr(
              'Notify Employee on Resolution Completion',
              'แจ้งเตือนเมื่อแก้ไขเสร็จสิ้นเรียบร้อย'
            ),
            description: tr(
              'Dispatches summary and evaluation link to Employee upon case completion.',
              'ส่งอีเมลแจ้งผลสรุปและคำขอบคุณไปยัง พนักงานผู้ยื่นเรื่อง พร้อมลิงก์ประเมิน CSAT'
            ),
            recipientLabel: tr(
              'Ticket Submitter (Email: {senderEmail})',
              'พนักงานผู้ยื่นเรื่อง (Submitter Email: {senderEmail})'
            ),
            recipientBadge: 'Employee In-Box',
            subjectPlaceholder: tr(
              '[VoicePlatform Result] {ticketId}: Resolution complete',
              'เช่น [VoicePlatform แจ้งผลการแก้ไข] เรื่อง {ticketId}: ดำเนินการแก้ไขเสร็จสิ้นเรียบร้อยแล้ว'
            ),
            bodyPlaceholder: tr(
              'Enter notification message to send to employee upon resolution...',
              'กรอกเนื้อหาข้อความที่ต้องการส่งแจ้งเตือนกลับไปยังพนักงานเมื่อเคสเสร็จสิ้น...'
            ),
          }}
          tags={RESOLVED_TAGS}
          template={settings.onTicketResolved}
          onChange={(patch) => updateTemplate('onTicketResolved', patch)}
          preview={{
            open: activePreview === 'resolved',
            title: tr(
              'LIVE PREVIEW: Email sent to Submitter',
              'LIVE PREVIEW: อีเมลส่งหาพนักงานผู้ยื่น'
            ),
            to: `${submitterName} <pattarapol.n@enterprise.co.th>`,
            subject: interpolateEmailTemplate(settings.onTicketResolved.subject, submitterVars),
            body: interpolateEmailTemplate(settings.onTicketResolved.body, resolvedBodyVars),
          }}
          onTogglePreview={() => togglePreview('resolved')}
          onTestDispatch={() => handleTestDispatch('ticket_resolved')}
        />
      </div>

      {/* DYNAMIC VARIABLE GLOSSARY */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
          <Info className="h-4 w-4 text-indigo-600" />
          <span>
            {tr(
              'Dynamic Tags Reference Glossary for Email Templates',
              'ตารางอ้างอิงตัวแปร Dynamic Tags สำหรับตกแต่งเทมเพลตอีเมล'
            )}
          </span>
        </h4>
        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {glossary.map(([tag, en, th]) => (
            <div
              key={tag}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-2.5"
            >
              <code className="text-[11px] font-bold text-indigo-700">{tag}</code>
              <span className="mt-1 text-[11px] text-slate-500">{tr(en, th)}</span>
            </div>
          ))}
        </div>
      </div>

      <DispatchLogTable logs={logs} onClear={handleClearLogs} onView={setSelectedLogForDetail} />

      {selectedLogForDetail && (
        <LogDetailModal log={selectedLogForDetail} onClose={() => setSelectedLogForDetail(null)} />
      )}

      {confirmDialog}
    </div>
  );
};

interface AdminEmailNotificationSettingsProps {
  /** Server-provided first paint; without them the panel loads both through the Server Actions. */
  readonly initialSettings?: EmailNotificationSettings;
  readonly initialLogs?: EmailDispatchLog[];
}

interface LoadedData {
  settings: EmailNotificationSettings;
  logs: EmailDispatchLog[];
}

export const AdminEmailNotificationSettings: React.FC<AdminEmailNotificationSettingsProps> = ({
  initialSettings,
  initialLogs,
}) => {
  const { lang } = useLanguage();
  const tr = makeTranslate(lang);
  const [data, setData] = useState<LoadedData | null>(
    initialSettings && initialLogs ? { settings: initialSettings, logs: initialLogs } : null
  );
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (data) return;
    let cancelled = false;
    Promise.all([getEmailNotificationSettings(), getEmailDispatchLogs()])
      .then(([settings, logs]) => {
        if (!cancelled) setData({ settings, logs });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [data]);

  if (!data) {
    return (
      <div
        id="admin-email-notifications-panel"
        className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500 shadow-xs"
      >
        {loadFailed
          ? tr(
              '⚠️ Could not load the email settings. Please refresh the page.',
              '⚠️ โหลดการตั้งค่าอีเมลไม่สำเร็จ กรุณารีเฟรชหน้านี้'
            )
          : tr('Loading email settings…', 'กำลังโหลดการตั้งค่าอีเมล…')}
      </div>
    );
  }
  return <EmailSettingsPanel initialSettings={data.settings} initialLogs={data.logs} />;
};
