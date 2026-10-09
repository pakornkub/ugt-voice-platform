'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Shield,
  Crown,
  Star,
  Send,
  Paperclip,
  AlertTriangle,
  User,
  Mail,
  ArrowLeft,
  Lock,
  EyeOff,
  Check,
  ChevronRight,
  MessageSquare,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { ComplaintTicket, RolePermissionConfig, TicketStatus, UserRole } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import {
  getStatusBadgeText,
  getStatusColor,
  getUrgencyBadgeText,
  getUrgencyColor,
  getRiskSeverityBadgeText,
  getRiskSeverityColor,
} from '../services/api';
import { sendAnonymousChatMessage, updateTicketWorkflow } from '@/lib/actions/tickets';
import { useShell } from '../app/shell-context';
import { useLanguage } from '../context/LanguageContext';
import { InvestigationReportModal } from './InvestigationReportModal';

interface TrackingTimelineModalProps {
  ticket: ComplaintTicket | null;
  currentRole?: UserRole;
  onClose: () => void;
  onOpenSatisfactionModal: (ticket: ComplaintTicket) => void;
  onTicketUpdated: (ticket: ComplaintTicket) => void;
}

type RoleConfig = RolePermissionConfig | undefined;
type ChatMessage = NonNullable<ComplaintTicket['anonymousMessages']>[number];
type TimelineLog = ComplaintTicket['timeline'][number];

// Bilingual text helper: `tr(en, th)` picks by the active language.
function useTr() {
  const { lang } = useLanguage();
  return { lang, tr: (en: string, th: string) => (lang === 'en' ? en : th) };
}

const isProtectedIdentity = (ticket: ComplaintTicket) =>
  ticket.confidentiality === 'anonymous' || ticket.confidentiality === 'confidential_restricted';

const getRoleShortName = (roleConfig: RoleConfig, currentRole: UserRole) =>
  roleConfig?.roleTitleTh?.split(' ')[0] || currentRole;

const getStepIndex = (status: TicketStatus) => {
  switch (status) {
    case 'submitted':
      return 0;
    case 'gatekeeper_triaged':
      return 1;
    case 'in_progress':
      return 2;
    case 'resolved':
      return 3;
    case 'closed':
      return 4;
    default:
      return 0;
  }
};

function getStepCircleClass(isPassed: boolean, isCurrent: boolean) {
  if (isPassed) return 'bg-emerald-600 text-white';
  if (isCurrent) return 'animate-pulse bg-indigo-600 text-white ring-4 ring-indigo-100';
  return 'bg-slate-200 text-slate-500';
}

function getStepLabelClass(isPassed: boolean, isCurrent: boolean) {
  if (isCurrent) return 'text-indigo-700';
  if (isPassed) return 'text-slate-800';
  return 'text-slate-400';
}

function getChatBubbleClass(isCurrentUserSender: boolean, isFromComplainant: boolean) {
  if (isCurrentUserSender) return 'rounded-br-xs bg-indigo-600 text-white';
  if (isFromComplainant) {
    return 'rounded-bl-xs border border-purple-200 bg-purple-50 text-purple-950';
  }
  return 'rounded-bl-xs border border-slate-200 bg-white text-slate-800';
}

// ---------------------------------------------------------------------------------------------
// Access Restricted screen (Gatekeeper without the direct-CEO permission)
// ---------------------------------------------------------------------------------------------
const RestrictedAccessScreen: React.FC<
  Readonly<{ ticket: ComplaintTicket; onClose: () => void }>
> = ({ ticket, onClose }) => {
  const { lang, t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-lg space-y-4 overflow-hidden rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 shadow-xs">
          <Lock className="h-8 w-8" />
        </div>
        <div>
          <span className="rounded-full border border-purple-200 bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800">
            Whistleblower Escalation Restricted
          </span>
          <h3 className="mt-2.5 text-base font-bold text-slate-900 sm:text-lg">
            {lang === 'en' ? 'Access Restricted' : 'สิทธิ์การเข้าถึงถูกจำกัด (Access Restricted)'}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {lang === 'en' ? (
              `Ticket ${ticket.trackingCode} is directly escalated to Executive / CEO under Whistleblower Protection. Access is strictly isolated to top executives and the independent audit committee.`
            ) : (
              <>
                ข้อร้องเรียนรหัส{' '}
                <strong className="font-mono font-bold text-purple-700">
                  {ticket.trackingCode}
                </strong>{' '}
                ถูกยื่นส่งตรงถึงผู้บริหารระดับสูง (CEO / EVP) ตามช่องทางคุ้มครองความปลอดภัย
                Whistleblower Protection
                ซึ่งได้รับการแยกจัดเก็บและจำกัดสิทธิ์เฉพาะผู้บริหารระดับสูงและคณะกรรมการตรวจสอบอิสระ
              </>
            )}
          </p>
          <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[11px] text-slate-400">
            {lang === 'en' ? (
              'Your Gatekeeper role does not currently hold access permissions to CEO/EVP Whistleblower channel under RBAC policies.'
            ) : (
              <>
                บทบาท <strong>Gatekeeper</strong> ในปัจจุบันยังไม่ได้รับสิทธิ์{' '}
                <span className="font-semibold text-slate-700">
                  &quot;เข้าถึงกล่องข้อร้องเรียนสายตรง CEO/EVP&quot;
                </span>{' '}
                ในระบบ Security & Compliance Privileges (RBAC)
              </>
            )}
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            id="btn-close-restricted-modal"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Header + view-mode tabs
// ---------------------------------------------------------------------------------------------
const ModalHeader: React.FC<
  Readonly<{
    ticket: ComplaintTicket;
    onClose: () => void;
    onOpenReport: () => void;
    onOpenSatisfactionModal: (ticket: ComplaintTicket) => void;
  }>
> = ({ ticket, onClose, onOpenReport, onOpenSatisfactionModal }) => {
  const { t } = useLanguage();
  const { lang, tr } = useTr();
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          id="btn-close-tracking-modal"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          title={tr('Back', 'ย้อนกลับ')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">
              {ticket.trackingCode}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusColor(ticket.status)}`}
            >
              {getStatusBadgeText(ticket.status, lang)}
            </span>
            <span
              className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${getUrgencyColor(ticket.urgency)}`}
            >
              {getUrgencyBadgeText(ticket.urgency, lang)}
            </span>
            {ticket.isDirectToExecutive && (
              <span className="hidden items-center gap-1 rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 sm:inline-flex">
                <Crown className="h-3 w-3 text-purple-600" />
                {tr('Direct to CEO/EVP', 'ส่งตรงถึง CEO/EVP')}
              </span>
            )}
          </div>
          <h2 className="mt-1 line-clamp-1 text-sm font-bold text-slate-900 sm:text-base">
            {ticket.title}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Official Investigation & CAPA Report */}
        <button
          type="button"
          id="btn-open-investigation-report"
          onClick={onOpenReport}
          className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-xs transition hover:bg-indigo-100"
          title="ดูและพิมพ์รายงานสรุปผลการสอบสวนข้อเท็จจริง (Official Investigation Report)"
        >
          <FileText className="h-3.5 w-3.5 text-indigo-600" />
          <span className="hidden sm:inline">{tr('Report', 'รายงานผล')}</span>
        </button>

        {/* Direct CSAT trigger if resolved */}
        {ticket.status === 'resolved' && (
          <button
            type="button"
            id="btn-open-csat-top"
            onClick={() => onOpenSatisfactionModal(ticket)}
            className="flex animate-bounce items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-600"
          >
            <Star className="h-4 w-4 fill-white" />
            <span>{tr('Rate Satisfaction', 'ประเมินความพึงพอใจ')}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
};

const ViewModeTabs: React.FC<
  Readonly<{
    ticket: ComplaintTicket;
    mode: 'timeline' | 'chat';
    onChange: (mode: 'timeline' | 'chat') => void;
  }>
> = ({ ticket, mode, onChange }) => {
  const { tr } = useTr();
  const messageCount = ticket.anonymousMessages?.length ?? 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          id="tab-btn-timeline"
          onClick={() => onChange('timeline')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            mode === 'timeline'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{tr('Audit Trail & Details', 'ไทม์ไลน์กระบวนการและรายละเอียด')}</span>
        </button>

        <button
          type="button"
          id="tab-btn-chat"
          onClick={() => onChange('chat')}
          className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            mode === 'chat'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{tr('Anonymous 2-Way Chat', 'สื่อสารสองทางนิรนาม (Q&A Chat)')}</span>
          {messageCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                mode === 'chat' ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {messageCount}
            </span>
          )}
        </button>
      </div>

      <div className="hidden items-center gap-1.5 font-mono text-[11px] text-slate-500 md:flex">
        <Shield className="h-3.5 w-3.5 text-emerald-600" />
        <span>
          {ticket.confidentiality === 'anonymous'
            ? '100% Anonymous Protected'
            : 'Secure Case Channel'}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Anonymous 2-way chat
// ---------------------------------------------------------------------------------------------
const ChatBubble: React.FC<Readonly<{ msg: ChatMessage; currentRole: UserRole }>> = ({
  msg,
  currentRole,
}) => {
  const { lang } = useTr();
  const isFromComplainant = msg.senderRole === 'employee';
  const isCurrentUserSender =
    (currentRole === 'employee' && isFromComplainant) ||
    (currentRole !== 'employee' && !isFromComplainant);

  return (
    <div className={`flex flex-col ${isCurrentUserSender ? 'items-end' : 'items-start'}`}>
      <div className="mb-1 flex items-center gap-2 text-[11px]">
        <span
          className={`font-semibold ${isFromComplainant ? 'text-purple-700' : 'text-indigo-700'}`}
        >
          {msg.senderDisplayName}
        </span>
        <span className="text-[10px] text-slate-400">
          {new Date(msg.timestamp).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </span>
      </div>
      <div
        className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-line shadow-xs sm:max-w-[75%] ${getChatBubbleClass(isCurrentUserSender, isFromComplainant)}`}
      >
        {msg.message}
      </div>
    </div>
  );
};

const ChatPanel: React.FC<
  Readonly<{
    ticket: ComplaintTicket;
    currentRole: UserRole;
    chatMessage: string;
    isSending: boolean;
    onChatMessageChange: (value: string) => void;
    onSubmit: (e: React.SubmitEvent) => void;
  }>
> = ({ ticket, currentRole, chatMessage, isSending, onChatMessageChange, onSubmit }) => {
  const { tr } = useTr();
  const isProtected = isProtectedIdentity(ticket);
  const isEmployee = currentRole === 'employee';
  const messages = ticket.anonymousMessages ?? [];

  const calloutTitle = isProtected
    ? tr(
        'Protected Anonymous 2-Way Communication',
        'ช่องทางสื่อสารสองทางแบบไม่เปิดเผยตัวตน (Protected Anonymous Q&A)'
      )
    : tr(
        'Direct 2-Way Case Inquiry Channel',
        'ช่องทางสื่อสารสองทางระหว่างผู้ยื่นเรื่องและเจ้าหน้าที่ (Direct Q&A)'
      );
  const calloutBody = isProtected
    ? tr(
        'Identity is completely masked. Gatekeepers and Investigators communicate solely through this ticket channel without seeing your personal credentials.',
        'ระบบคุ้มครองพยานและผู้ร้องเรียน: เจ้าหน้าที่และคณะกรรมการสอบสวนจะไม่เห็นชื่อ นามสกุล หรืออีเมลของท่าน การสอบถามและการชี้แจงพยานหลักฐานจะส่งผ่านรหัสติดตามคำร้องอย่างปลอดภัยตามนโยบาย Whistleblower'
      )
    : tr(
        'You can ask questions, provide additional evidence, or request clarifications directly from the assigned Gatekeeper.',
        'พนักงานสามารถสอบถามความคืบหน้า ชี้แจงข้อเท็จจริง หรือส่งพยานหลักฐานเพิ่มเติมถึงเจ้าหน้าที่ผู้รับผิดชอบได้โดยตรง'
      );
  const emptyHint = isEmployee
    ? tr(
        'Send a message or inquiry below to communicate with the investigator anonymously.',
        'พิมพ์ข้อความเพื่อสอบถามความคืบหน้าหรือส่งข้อมูลเพิ่มเติมถึงเจ้าหน้าที่ได้ทันที'
      )
    : tr(
        'Send an inquiry or request more evidence from the complainant.',
        'ส่งคำถามหรือขอข้อมูลพยานหลักฐานเพิ่มเติมจากผู้ร้องเรียน'
      );
  const placeholder = isEmployee
    ? tr(
        'Type your message anonymously to the investigator...',
        'พิมพ์ข้อความสอบถามหรือชี้แจงเพิ่มเติมถึงเจ้าหน้าที่ (แบบนิรนาม)...'
      )
    : tr(
        'Type official inquiry to the complainant...',
        'พิมพ์ข้อความสอบถามข้อเท็จจริงหรือขอหลักฐานเพิ่มเติมจากผู้ร้องเรียน...'
      );

  return (
    <div className="animate-in fade-in-50 space-y-4">
      {/* Security & Anonymity Assurance Callout */}
      <div className="space-y-1.5 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-4 text-xs shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-purple-950">
            <Lock className="h-4 w-4 text-purple-600" />
            <span>{calloutTitle}</span>
          </div>
          <span className="rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
            E2E Case Tracking
          </span>
        </div>
        <p className="leading-relaxed text-slate-600">{calloutBody}</p>
      </div>

      {/* Chat Conversation Thread */}
      <div className="flex min-h-[380px] flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="max-h-[460px] flex-1 space-y-3.5 overflow-y-auto pr-2">
          {messages.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-2 p-6 text-center text-slate-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="text-xs font-medium text-slate-600">
                {tr('No messages in this case thread yet', 'ยังไม่มีข้อความในบทสนทนานี้')}
              </p>
              <p className="max-w-sm text-[11px] text-slate-400">{emptyHint}</p>
            </div>
          ) : (
            messages.map((msg) => <ChatBubble key={msg.id} msg={msg} currentRole={currentRole} />)
          )}
        </div>

        {/* Send Message Input Form */}
        <form onSubmit={onSubmit} className="mt-4 flex gap-2 border-t border-slate-200 pt-3.5">
          <input
            type="text"
            id="input-anonymous-chat"
            value={chatMessage}
            onChange={(e) => onChatMessageChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs shadow-inner transition focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            id="btn-send-anonymous-chat"
            disabled={isSending || !chatMessage.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{tr('Send', 'ส่งข้อความ')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Timeline view pieces
// ---------------------------------------------------------------------------------------------
const ProgressStepper: React.FC<Readonly<{ status: TicketStatus }>> = ({ status }) => {
  const { tr } = useTr();
  const steps: { key: TicketStatus; label: string; sub: string }[] = [
    {
      key: 'submitted',
      label: tr('Submitted', 'ยื่นเรื่องแล้ว'),
      sub: tr('Submitted to queue', 'เข้าสู่ระบบแล้ว'),
    },
    {
      key: 'gatekeeper_triaged',
      label: tr('Triaged', 'รับเรื่องแล้ว'),
      sub: tr('Gatekeeper assigned', 'ผู้รับผิดชอบคัดกรอง'),
    },
    {
      key: 'in_progress',
      label: tr('In Progress', 'กำลังดำเนินการแก้ไข'),
      sub: tr('Action in progress', 'อยู่ระหว่างการแก้ไข'),
    },
    {
      key: 'resolved',
      label: tr('Resolved', 'แก้ไขแล้วเสร็จ'),
      sub: tr('Resolution implemented', 'สรุปแนวทางแก้ไข'),
    },
    {
      key: 'closed',
      label: tr('Evaluated & Closed', 'ประเมินผลและปิดเรื่อง'),
      sub: tr('Completed', 'ปิดเคสเรียบร้อย'),
    },
  ];
  const currentStepIdx = getStepIndex(status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <h3 className="mb-4 text-xs font-bold tracking-wider text-slate-600 uppercase">
        {tr(
          'Real-time Progress Tracker',
          'ขั้นตอนการติดตามสถานะแบบเรียลไทม์ (Real-time Progress Tracker)'
        )}
      </h3>

      <div className="grid grid-cols-5 gap-1 sm:gap-2">
        {steps.map((step, idx) => {
          const isPassed = idx < currentStepIdx;
          const isCurrent = idx === currentStepIdx;
          return (
            <div key={step.key} className="flex flex-col items-center text-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition sm:h-9 sm:w-9 ${getStepCircleClass(isPassed, isCurrent)}`}
              >
                {isPassed ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={`mt-2 line-clamp-1 text-[10px] font-semibold sm:text-xs ${getStepLabelClass(isPassed, isCurrent)}`}
              >
                {step.label}
              </span>
              <span className="hidden text-[9px] text-slate-400 sm:text-[10px] md:block">
                {step.sub}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CsatBanner: React.FC<
  Readonly<{ ticket: ComplaintTicket; onOpen: (ticket: ComplaintTicket) => void }>
> = ({ ticket, onOpen }) => {
  const { tr } = useTr();
  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm sm:flex-row">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
          <Star className="h-6 w-6 fill-white" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-950">
            {tr(
              'Issue Resolved! Please evaluate your satisfaction to help us improve',
              'ปัญหาได้รับการแก้ไขแล้ว! กรุณาประเมินความพึงพอใจเพื่อพัฒนาองค์กร'
            )}
          </h4>
          <p className="mt-0.5 text-xs text-amber-900/80">
            {tr(
              'Your valuable feedback helps maintain organizational compliance and service quality.',
              'เสียงสะท้อนของคุณมีคุณค่าอย่างยิ่งในการพัฒนามาตรฐานการบริการและการบริหารจัดการอย่างยั่งยืน'
            )}
          </p>
        </div>
      </div>
      <button
        type="button"
        id="btn-open-csat-banner"
        onClick={() => onOpen(ticket)}
        className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-amber-700 sm:w-auto"
      >
        <span>{tr('Start CSAT Rating (5 Stars)', 'เริ่มการประเมิน CSAT (5 ดาว)')}</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

const EvaluationSummary: React.FC<
  Readonly<{ evaluation: NonNullable<ComplaintTicket['evaluation']> }>
> = ({ evaluation }) => {
  const { tr } = useTr();
  const resolvedText = evaluation.isResolvedPermanently ? tr('Yes', 'ใช่') : tr('No', 'ไม่ใช่');
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 sm:text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>
            {tr('CSAT Evaluation Result', 'ผลการประเมินความพึงพอใจการให้บริการ (CSAT Completed)')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            <span className="text-[11px] font-medium text-slate-500">
              {tr('Issue Resolved:', 'ปัญหาได้รับการแก้ไข:')}
            </span>
            <span
              className={
                evaluation.isResolvedPermanently
                  ? 'font-bold text-emerald-700'
                  : 'font-bold text-rose-700'
              }
            >
              {resolvedText}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
            <Star className="h-4 w-4 fill-amber-400" />
            <span>
              {evaluation.overallScore} / 5 {tr('Points', 'คะแนน')}
            </span>
          </div>
        </div>
      </div>
      {evaluation.feedbackComment && (
        <div className="mb-2 rounded-lg border border-emerald-100/60 bg-white/60 p-2 text-xs text-slate-700">
          <span className="mr-1 font-semibold text-slate-600">
            {tr('Feedback:', 'ความคิดเห็นเพิ่มเติม:')}
          </span>
          <span className="italic">&quot;{evaluation.feedbackComment}&quot;</span>
        </div>
      )}
      {evaluation.improvementSuggestions && (
        <div className="rounded-lg border border-emerald-100 bg-white/70 p-2 text-[11px] text-emerald-900">
          <span className="font-semibold">
            {tr(
              'Continuous Improvement Suggestions:',
              'ข้อเสนอแนะเพื่อการพัฒนาองค์กรอย่างต่อเนื่อง:'
            )}
          </span>{' '}
          {evaluation.improvementSuggestions}
        </div>
      )}
    </div>
  );
};

const TicketDetailsCard: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket }) => {
  const { getCategoryName } = useLanguage();
  const { lang, tr } = useTr();
  const categoryInfo = CATEGORY_DEFINITIONS[ticket.category];
  const categoryName = categoryInfo
    ? tr(categoryInfo.nameEn, categoryInfo.nameTh)
    : getCategoryName(ticket.category);
  const typeText =
    ticket.type === 'complaint'
      ? tr('⚠️ Grievance / Complaint', '⚠️ ข้อร้องเรียน (Grievance)')
      : tr('💡 Suggestion / Idea', '💡 ข้อเสนอแนะ (Suggestion)');

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
      <h4 className="border-b border-slate-100 pb-2 text-xs font-bold tracking-wider text-slate-700 uppercase">
        {tr('Complaint & Ticket Details', 'ข้อมูลรายละเอียดข้อร้องเรียน')}
      </h4>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-slate-500">{tr('Category:', 'หมวดหมู่เรื่อง:')}</span>
          <div className="mt-0.5 font-semibold text-slate-800">{categoryName}</div>
        </div>
        <div>
          <span className="text-slate-500">{tr('Type:', 'ประเภท:')}</span>
          <div className="mt-0.5 font-semibold text-slate-800">{typeText}</div>
        </div>
        <div>
          <span className="text-slate-500">{tr('Location / Unit:', 'สถานที่ / หน่วยงาน:')}</span>
          <div className="mt-0.5 font-medium text-slate-800">
            {ticket.locationOrUnit || tr('Headquarters', 'สำนักงานใหญ่')}
          </div>
        </div>
        <div>
          <span className="text-slate-500">
            {tr('Urgency & Risk:', 'ระดับความเร่งด่วน & ความเสี่ยง:')}
          </span>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded border px-2 py-0.5 text-[10.5px] font-semibold ${getUrgencyColor(ticket.urgency)}`}
            >
              {getUrgencyBadgeText(ticket.urgency, lang)}
            </span>
            <span
              className={`rounded border px-2 py-0.5 text-[10.5px] font-medium ${getRiskSeverityColor(ticket.riskSeverity)}`}
            >
              {getRiskSeverityBadgeText(ticket.riskSeverity, lang)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs text-slate-500">
          {tr('Description & Facts:', 'เนื้อหาและข้อเท็จจริง:')}
        </span>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
          {ticket.description}
        </div>
      </div>

      {/* Resolution statement if resolved */}
      {ticket.resolutionSummary && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
          <span className="mb-1 block font-bold text-emerald-900">
            {tr('Resolution Summary:', 'สรุปผลการแก้ไขปัญหา (Resolution Summary):')}
          </span>
          <p className="text-slate-700">{ticket.resolutionSummary}</p>
        </div>
      )}

      {/* Attachments list */}
      {!!ticket.attachments?.length && (
        <div>
          <span className="mb-1 block text-xs text-slate-500">
            {tr('Attachments:', 'เอกสารแนบประกอบ:')}
          </span>
          <div className="flex flex-wrap gap-2">
            {ticket.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
              >
                <Paperclip className="h-3 w-3 text-slate-500" />
                <span>{att.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const GatekeeperCard: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket }) => {
  const { lang, tr } = useTr();
  const categoryInfo = CATEGORY_DEFINITIONS[ticket.category];
  const categoryName = categoryInfo
    ? tr(categoryInfo.nameEn, categoryInfo.nameTh)
    : ticket.gatekeeperDepartment;
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 font-bold text-slate-800">
        <Shield className="h-4 w-4 text-blue-600" />
        <span>{tr('Assigned Gatekeeper', 'Gatekeeper ผู้รับผิดชอบ')}</span>
      </div>
      <div>
        <span className="text-slate-500">{tr('Category:', 'หมวดหมู่:')}</span>
        <div className="mt-0.5 font-semibold text-indigo-900">{categoryName}</div>
      </div>
      <div>
        <span className="text-slate-500">
          {tr('Responsible Officer:', 'เจ้าหน้าที่ผู้รับผิดชอบ:')}
        </span>
        <div className="mt-0.5 font-medium text-slate-800">
          {ticket.assignedOfficerName ||
            tr('Pending officer assignment', 'อยู่ระหว่างมอบหมายเจ้าหน้าที่')}
        </div>
      </div>
      {ticket.assignedOfficerEmail && (
        <div>
          <span className="text-slate-500">{tr('Contact Email:', 'อีเมลติดต่อ:')}</span>
          <div className="mt-0.5 truncate font-mono text-[11px] text-slate-700">
            {ticket.assignedOfficerEmail}
          </div>
        </div>
      )}
      <div className="border-t border-slate-200 pt-2">
        <span className="text-slate-500">{tr('Urgency Level:', 'ระดับความเร่งด่วน:')}</span>
        <div className="mt-0.5 flex items-center gap-1 font-bold text-slate-800">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span>{getUrgencyBadgeText(ticket.urgency, lang)}</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Submitter identification cards (strict RBAC confidentiality)
// ---------------------------------------------------------------------------------------------
const SubmitterFields: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket }) => {
  const { tr } = useTr();
  return (
    <>
      <div>
        <span className="text-slate-500">{tr('Submitter:', 'ผู้ยื่นเรื่อง:')}</span>
        <div className="mt-0.5 font-semibold text-slate-900">
          {ticket.submitterName || tr('Unnamed', 'ไม่ระบุชื่อ')}{' '}
          {ticket.submitterEmployeeId ? `(${ticket.submitterEmployeeId})` : ''}
        </div>
      </div>
      {ticket.submitterDepartment && (
        <div>
          <span className="text-slate-500">{tr('Department:', 'ฝ่าย/สังกัด:')}</span>
          <div className="mt-0.5 text-slate-700">{ticket.submitterDepartment}</div>
        </div>
      )}
      {ticket.submitterEmail && (
        <div>
          <span className="text-slate-500">{tr('Email:', 'อีเมลติดต่อ:')}</span>
          <div className="mt-0.5 truncate font-mono text-[11px] text-slate-700">
            {ticket.submitterEmail}
          </div>
        </div>
      )}
      {ticket.submitterPhone && (
        <div>
          <span className="text-slate-500">{tr('Phone:', 'เบอร์โทรศัพท์:')}</span>
          <div className="mt-0.5 font-mono text-[11px] text-slate-700">{ticket.submitterPhone}</div>
        </div>
      )}
    </>
  );
};

const AnonymousSubmitterCard: React.FC<
  Readonly<{ ticket: ComplaintTicket; roleConfig: RoleConfig; currentRole: UserRole }>
> = ({ ticket, roleConfig, currentRole }) => {
  const { tr } = useTr();
  const canViewAnonymousEmail = roleConfig?.canViewAnonymousSubmitterEmail ?? false;
  const roleShort = getRoleShortName(roleConfig, currentRole);
  // The server leaves the email out when this role may not see it (redactTicketForViewer).
  const activeLoginEmail = ticket.loginEmail || ticket.submitterEmail || '—';

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <EyeOff className="h-4 w-4 text-slate-500" />
          <span>
            {tr(
              'Submitter Details (Anonymous Whistleblower)',
              'ข้อมูลผู้ยื่นเรื่อง (ไม่ระบุตัวตน)'
            )}
          </span>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          🕵️ {tr('Anonymous', 'ไม่ระบุตัวตน')}
        </span>
      </div>

      {canViewAnonymousEmail ? (
        /* Case: HR Admin or Exec Rep has ticked to ALLOW visibility of login email */
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
              <Mail className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                {tr(
                  'Login Email (Mapped from Employee DB):',
                  'Email ที่ใช้ในการ Login (Mapping หลังบ้าน):'
                )}
              </span>
            </div>
            <span className="py-0.2 rounded bg-emerald-200 px-2 text-[10px] font-bold text-emerald-900">
              ✓ {tr('Visible for your Role', `ได้รับสิทธิ์ (Role: ${roleShort})`)}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-white p-2">
            <span className="font-mono text-xs font-bold text-indigo-950">{activeLoginEmail}</span>
            <span className="py-0.2 rounded border border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-700">
              {ticket.submitterEmployeeId
                ? `EMP DB: ${ticket.submitterEmployeeId}`
                : 'Mapped Active'}
            </span>
          </div>

          <p className="text-[10.5px] leading-tight text-emerald-900/90">
            {tr(
              'HR Admin & Executive Representatives have configured your role to view this mapped login email. Name and employee ID remain concealed.',
              'HR Admin & ตัวแทนผู้บริหาร ได้ tick อนุญาตให้บทบาทของคุณมองเห็น email ที่ใช้ในการ login นี้ได้ (โดยชื่อ นามสกุล และรหัสพนักงาน ยังคงได้รับการปกป้องตามนโยบายคุ้มครองพยาน)'
            )}
          </p>
        </div>
      ) : (
        /* Case: Role does NOT have permission to view login email */
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-100/80 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              <span>{tr('Login Email:', 'Email ที่ใช้ในการ Login:')}</span>
            </div>
            <span className="py-0.2 rounded bg-slate-200 px-2 text-[10px] font-bold text-slate-700">
              🔒 {tr('Shielded', `ปกปิดตามสิทธิ์ (Role: ${roleShort})`)}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs tracking-wider text-slate-400 select-none">
            ••••••••••••••••@••••••••••••
          </div>

          <p className="text-[10.5px] leading-tight text-slate-500">
            {tr(
              "Your role is not granted permission by HR Admin & Executive Reps to view this anonymous submitter's login email.",
              `บทบาทของคุณ (${roleShort}) ไม่ได้รับอนุญาตจาก HR Admin & ตัวแทนผู้บริหาร ให้มองเห็นอีเมลล็อกอินของผู้ยื่นเรื่องนิรนามนี้`
            )}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
        <span>{tr('Whistleblower Protection Policy', 'นโยบายคุ้มครองพยาน Whistleblower')}</span>
        <span>{tr('Configurable via RBAC', 'ปรับเปลี่ยนสิทธิ์ได้ในหน้าจัดการสิทธิ์ RBAC')}</span>
      </div>
    </div>
  );
};

const MaskedField: React.FC<Readonly<{ label: string; mask: string }>> = ({ label, mask }) => (
  <div>
    <span className="text-[11px] text-slate-500">{label}</span>
    <div className="mt-0.5 rounded bg-slate-100 px-2 py-1 text-center font-mono text-[11px] tracking-widest text-slate-400">
      {mask}
    </div>
  </div>
);

const RestrictedSubmitterCard: React.FC = () => {
  const { tr } = useTr();
  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-rose-50/50 p-4 text-xs shadow-xs">
      <div className="flex items-center justify-between border-b border-amber-200 pb-2">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <Lock className="h-4 w-4 text-amber-600" />
          <span>{tr('Submitter (Restricted)', 'ข้อมูลผู้ยื่นเรื่อง (จำกัดสิทธิ์การเข้าถึง)')}</span>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
          <Lock className="h-3 w-3 text-amber-700" />
          <span>Confidential Restricted</span>
        </span>
      </div>

      <div className="space-y-1 rounded-lg border border-amber-200/80 bg-white/90 p-2.5 text-[11px] leading-relaxed text-amber-950">
        <div className="flex items-center gap-1 font-bold text-amber-900">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
          <span>
            {tr('Access Restricted by RBAC', 'สิทธิ์การเข้าถึงถูกจำกัด (Restricted by RBAC)')}
          </span>
        </div>
        <p className="text-[10.5px] text-amber-800/90">
          {tr(
            'The submitter requested confidential identity protection. Your current role does not have permission to inspect confidential submitters.',
            'ผู้ยื่นเรื่องเลือกระดับความลับ "จำกัดสิทธิ์การเข้าถึงข้อมูลตัวตน" เพื่อความปลอดภัย ข้อมูลนี้ถูกซ่อนไว้เนื่องจากบทบาทของคุณไม่มีสิทธิ์ "ดูตัวตนผู้ร้องเรียนกรณีจำกัดสิทธิ์"'
          )}
        </p>
      </div>

      <div className="space-y-2 pt-1">
        <div>
          <span className="text-[11px] text-slate-500">{tr('Submitter:', 'ผู้ยื่นเรื่อง:')}</span>
          <div className="mt-0.5 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 font-mono text-slate-700">
            <EyeOff className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 italic">
              [
              {tr(
                'Confidential Whistleblower Identity Hidden',
                'พนักงานผู้ร้องเรียน - ปกปิดตัวตนตามนโยบายความลับ'
              )}
              ]
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MaskedField label={tr('Employee ID:', 'รหัสพนักงาน:')} mask="••••••••" />
          <MaskedField label={tr('Department:', 'ฝ่าย/สังกัด:')} mask="••••••••" />
        </div>
        <MaskedField
          label={tr('Contact (Email / Phone):', 'ช่องทางติดต่อ (Email / Phone):')}
          mask="••••••••••••••••••••"
        />
      </div>

      <div className="flex items-center gap-1 border-t border-amber-200 pt-2 text-[10px] text-amber-800/80">
        <span>💡</span>
        <span>
          {tr(
            'Confidential access can be granted in RBAC permissions.',
            'หากต้องการดูข้อมูลตัวตนเพื่อคุ้มครองพยาน สามารถเปิดสิทธิ์นี้ได้ในหน้า กำหนดสิทธิ์ (RBAC)'
          )}
        </span>
      </div>
    </div>
  );
};

const GrantedSubmitterCard: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket }) => {
  const { tr } = useTr();
  return (
    <div className="space-y-2.5 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-4 text-xs shadow-xs">
      <div className="flex items-center justify-between border-b border-blue-200 pb-2">
        <div className="flex items-center gap-2 font-bold text-blue-950">
          <User className="h-4 w-4 text-blue-600" />
          <span>
            {tr('Employee Submitter (Granted)', 'ข้อมูลพนักงานผู้ยื่นเรื่อง (Confidential Access)')}
          </span>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
          <CheckCircle2 className="h-3 w-3 text-blue-600" />
          <span>{tr('Unlocked', '🔓 สิทธิ์ปลดล็อก (Granted)')}</span>
        </span>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-100/60 p-2 text-[10.5px] leading-snug text-blue-900">
        {tr(
          'Your role has authorization to view confidential submitter identities for investigation and witness protection.',
          'สิทธิ์ของคุณได้รับอนุญาตให้เปิดเผยข้อมูลตัวตนผู้ยื่นเรื่อง (Confidential Restricted) เพื่อการสอบสวนและคุ้มครองพยาน'
        )}
      </div>

      <SubmitterFields ticket={ticket} />
    </div>
  );
};

const NamedSubmitterCard: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket }) => {
  const { tr } = useTr();
  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <User className="h-4 w-4 text-indigo-600" />
          <span>
            {tr('Submitter Information', 'ข้อมูลพนักงานผู้ยื่นเรื่อง (Identified Submitter)')}
          </span>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          Standard Named
        </span>
      </div>
      <SubmitterFields ticket={ticket} />
    </div>
  );
};

const SubmitterCard: React.FC<
  Readonly<{ ticket: ComplaintTicket; roleConfig: RoleConfig; currentRole: UserRole }>
> = ({ ticket, roleConfig, currentRole }) => {
  const hasConfidentialAccess = roleConfig?.canViewConfidentialIdentities ?? false;

  if (ticket.confidentiality === 'anonymous') {
    return (
      <AnonymousSubmitterCard ticket={ticket} roleConfig={roleConfig} currentRole={currentRole} />
    );
  }
  if (ticket.confidentiality === 'confidential_restricted') {
    return hasConfidentialAccess ? (
      <GrantedSubmitterCard ticket={ticket} />
    ) : (
      <RestrictedSubmitterCard />
    );
  }
  return <NamedSubmitterCard ticket={ticket} />;
};

// ---------------------------------------------------------------------------------------------
// Audit trail + follow-up form
// ---------------------------------------------------------------------------------------------
const TimelineRow: React.FC<
  Readonly<{ log: TimelineLog; ticket: ComplaintTicket; hasConfidentialAccess: boolean }>
> = ({ log, ticket, hasConfidentialAccess }) => {
  const { lang, tr } = useTr();
  const hideActor =
    ticket.confidentiality === 'confidential_restricted' &&
    !hasConfidentialAccess &&
    (log.actorRole === 'Employee' || log.actor === ticket.submitterName);
  const actorName = hideActor
    ? tr('Whistleblower (Protected)', 'พนักงานผู้ร้องเรียน (ปกปิดตัวตน)')
    : log.actor;

  return (
    <div className="group relative">
      <div className="absolute top-0.5 -left-6 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-xs" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900">{actorName}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            {log.actorRole}
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          {new Date(log.timestamp).toLocaleString(lang === 'en' ? 'en-US' : 'th-TH')}
        </span>
      </div>
      <div className="mt-1 text-xs font-semibold text-indigo-900">{log.action}</div>
      {log.notes && (
        <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600">
          {log.notes}
        </div>
      )}
      {log.attachmentName && (
        <div className="mt-1 inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600">
          <Paperclip className="h-3 w-3" />
          <span>{log.attachmentName}</span>
        </div>
      )}
    </div>
  );
};

const AuditTrailSection: React.FC<
  Readonly<{
    ticket: ComplaintTicket;
    hasConfidentialAccess: boolean;
    inquiryText: string;
    isSubmittingNote: boolean;
    onInquiryChange: (value: string) => void;
    onSubmitInquiry: (e: React.SubmitEvent) => void;
  }>
> = ({
  ticket,
  hasConfidentialAccess,
  inquiryText,
  isSubmittingNote,
  onInquiryChange,
  onSubmitInquiry,
}) => {
  const { tr } = useTr();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h4 className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase">
        <Clock className="h-4 w-4 text-slate-500" />
        <span>
          {tr(
            'Activity Log & Audit Trail',
            'ประวัติการดำเนินงานและบันทึกความคืบหน้า (Audit Trail & Activity Log)'
          )}
        </span>
      </h4>

      <div className="relative space-y-6 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2 before:w-0.5 before:bg-slate-200">
        {ticket.timeline.map((log) => (
          <TimelineRow
            key={log.id}
            log={log}
            ticket={ticket}
            hasConfidentialAccess={hasConfidentialAccess}
          />
        ))}
      </div>

      {/* Quick Employee Follow-up Note Form */}
      <form onSubmit={onSubmitInquiry} className="mt-6 border-t border-slate-100 pt-4">
        <label className="mb-1.5 block flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
          <span>
            {tr(
              'Add inquiry / follow-up message to timeline:',
              'ส่งข้อความสอบถาม / แจ้งข้อมูลเพิ่มเติมถึงเจ้าหน้าที่ Gatekeeper:'
            )}
          </span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={tr(
              'Type note or inquiry to append to timeline...',
              'พิมพ์ข้อความบันทึกลง Timeline...'
            )}
            value={inquiryText}
            onChange={(e) => onInquiryChange(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSubmittingNote || !inquiryText.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{tr('Send Note', 'ส่งบันทึก')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------------------------
export const TrackingTimelineModal: React.FC<Readonly<TrackingTimelineModalProps>> = ({
  ticket,
  currentRole = 'employee',
  onClose,
  onOpenSatisfactionModal,
  onTicketUpdated,
}) => {
  const { tr } = useTr();
  const [inquiryText, setInquiryText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'timeline' | 'chat'>('timeline');
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { rolePermissions } = useShell();

  if (!ticket) return null;

  // Strict RBAC security verification for Whistleblower / Direct to CEO complaints
  const currentRoleConfig: RoleConfig = rolePermissions[currentRole] || rolePermissions.employee;
  const canViewDirectCeo =
    currentRole === 'employee' ? true : (currentRoleConfig?.canViewDirectCeoTickets ?? false);

  if (ticket.isDirectToExecutive && currentRole === 'gatekeeper' && !canViewDirectCeo) {
    return <RestrictedAccessScreen ticket={ticket} onClose={onClose} />;
  }

  const handleSendInquiry = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!inquiryText.trim()) return;

    setIsSubmittingNote(true);
    const updates = {
      actorName:
        ticket.confidentiality === 'anonymous'
          ? tr('Employee (Anonymous)', 'พนักงาน (ไม่เปิดเผยตัวตน)')
          : ticket.submitterName || tr('Employee', 'พนักงาน'),
      actorRole: 'Employee',
      actionNote: inquiryText,
    };
    updateTicketWorkflow(ticket.id, updates)
      .then((updated) => {
        if (!updated) return;
        onTicketUpdated(updated);
        setInquiryText('');
      })
      .catch((error) => console.error('updateTicketWorkflow failed', error))
      .finally(() => setIsSubmittingNote(false));
  };

  const handleSendChatMessage = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setIsSendingChat(true);
    sendAnonymousChatMessage(ticket.id, chatMessage.trim(), currentRole)
      .then((updated) => {
        if (!updated) return;
        onTicketUpdated(updated);
        setChatMessage('');
      })
      .catch((error) => console.error('sendAnonymousChatMessage failed', error))
      .finally(() => setIsSendingChat(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-xs sm:p-6">
      <div className="animate-in fade-in zoom-in-95 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <ModalHeader
          ticket={ticket}
          onClose={onClose}
          onOpenReport={() => setShowReportModal(true)}
          onOpenSatisfactionModal={onOpenSatisfactionModal}
        />

        {/* Modal Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          {/* View Mode Toggle: Timeline Audit Trail vs Anonymous 2-Way Chat */}
          <ViewModeTabs ticket={ticket} mode={activeViewMode} onChange={setActiveViewMode} />

          {activeViewMode === 'chat' ? (
            <ChatPanel
              ticket={ticket}
              currentRole={currentRole}
              chatMessage={chatMessage}
              isSending={isSendingChat}
              onChatMessageChange={setChatMessage}
              onSubmit={handleSendChatMessage}
            />
          ) : (
            <>
              <ProgressStepper status={ticket.status} />

              {/* If Resolved: CSAT Satisfaction Callout Banner */}
              {ticket.status === 'resolved' && (
                <CsatBanner ticket={ticket} onOpen={onOpenSatisfactionModal} />
              )}

              {/* If Closed: Evaluation Feedback Summary */}
              {ticket.status === 'closed' && ticket.evaluation && (
                <EvaluationSummary evaluation={ticket.evaluation} />
              )}

              {/* Ticket Information Breakdown */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <TicketDetailsCard ticket={ticket} />

                {/* Right Col: Gatekeeper & Submitter Meta (1 col) */}
                <div className="space-y-4">
                  <GatekeeperCard ticket={ticket} />
                  <SubmitterCard
                    ticket={ticket}
                    roleConfig={currentRoleConfig}
                    currentRole={currentRole}
                  />
                </div>
              </div>

              {/* Timeline Audit Logs */}
              <AuditTrailSection
                ticket={ticket}
                hasConfidentialAccess={currentRoleConfig?.canViewConfidentialIdentities ?? false}
                inquiryText={inquiryText}
                isSubmittingNote={isSubmittingNote}
                onInquiryChange={setInquiryText}
                onSubmitInquiry={handleSendInquiry}
              />
            </>
          )}
        </div>

        {/* Official Investigation & CAPA Report Modal */}
        {showReportModal && (
          <InvestigationReportModal ticket={ticket} onClose={() => setShowReportModal(false)} />
        )}
      </div>
    </div>
  );
};
