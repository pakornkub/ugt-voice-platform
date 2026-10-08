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
  Calendar,
  Building2,
  User,
  Mail,
  Phone,
  ArrowLeft,
  Download,
  Share2,
  Lock,
  EyeOff,
  Sparkles,
  Check,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { ComplaintTicket, TicketStatus } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { getStatusBadgeText, getStatusColor, updateTicketWorkflow } from '../services/api';

interface TrackingTimelineModalProps {
  ticket: ComplaintTicket | null;
  onClose: () => void;
  onOpenSatisfactionModal: (ticket: ComplaintTicket) => void;
  onTicketUpdated: (ticket: ComplaintTicket) => void;
}

export const TrackingTimelineModal: React.FC<TrackingTimelineModalProps> = ({
  ticket,
  onClose,
  onOpenSatisfactionModal,
  onTicketUpdated,
}) => {
  const [inquiryText, setInquiryText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  if (!ticket) return null;

  const categoryInfo = CATEGORY_DEFINITIONS[ticket.category];

  const steps: { key: TicketStatus; labelTh: string; subTh: string }[] = [
    { key: 'submitted', labelTh: 'ยื่นเรื่องแล้ว', subTh: 'Submitted to queue' },
    { key: 'gatekeeper_triaged', labelTh: 'หน่วยงานรับเรื่อง', subTh: 'Gatekeeper assigned' },
    { key: 'in_progress', labelTh: 'กำลังดำเนินการแก้ไข', subTh: 'Action in progress' },
    { key: 'resolved', labelTh: 'แก้ไขแล้วเสร็จ', subTh: 'Resolution implemented' },
    { key: 'closed', labelTh: 'ประเมินผลและปิดเรื่อง', subTh: 'Evaluated & Closed' },
  ];

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

  const currentStepIdx = getStepIndex(ticket.status);

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryText.trim()) return;

    setIsSubmittingNote(true);
    const updated = updateTicketWorkflow(ticket.id, {
      actorName:
        ticket.confidentiality === 'anonymous'
          ? 'พนักงาน (ไม่เปิดเผยตัวตน)'
          : ticket.submitterName || 'พนักงาน',
      actorRole: 'Employee',
      actionNote: inquiryText,
    });

    if (updated) {
      onTicketUpdated(updated);
      setInquiryText('');
    }
    setIsSubmittingNote(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-xs sm:p-6">
      <div className="animate-in fade-in zoom-in-95 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-close-tracking-modal"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              title="ย้อนกลับ"
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
                  {getStatusBadgeText(ticket.status)}
                </span>
                {ticket.isDirectToExecutive && (
                  <span className="hidden items-center gap-1 rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 sm:inline-flex">
                    <Crown className="h-3 w-3 text-purple-600" />
                    ส่งตรงถึง CEO/EVP
                  </span>
                )}
              </div>
              <h2 className="mt-1 line-clamp-1 text-sm font-bold text-slate-900 sm:text-base">
                {ticket.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct CSAT trigger if resolved */}
            {ticket.status === 'resolved' && (
              <button
                type="button"
                id="btn-open-csat-top"
                onClick={() => onOpenSatisfactionModal(ticket)}
                className="flex animate-bounce items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-600"
              >
                <Star className="h-4 w-4 fill-white" />
                <span>ประเมินความพึงพอใจ</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          {/* Stepper Progress Bar */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h3 className="mb-4 text-xs font-bold tracking-wider text-slate-600 uppercase">
              ขั้นตอนการติดตามสถานะแบบเรียลไทม์ (Real-time Progress Tracker)
            </h3>

            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              {steps.map((step, idx) => {
                const isPassed = idx < currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition sm:h-9 sm:w-9 ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                            ? 'animate-pulse bg-indigo-600 text-white ring-4 ring-indigo-100'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isPassed ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span
                      className={`mt-2 line-clamp-1 text-[10px] font-semibold sm:text-xs ${isCurrent ? 'text-indigo-700' : isPassed ? 'text-slate-800' : 'text-slate-400'}`}
                    >
                      {step.labelTh}
                    </span>
                    <span className="hidden text-[9px] text-slate-400 sm:text-[10px] md:block">
                      {step.subTh}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* If Resolved: CSAT Satisfaction Callout Banner */}
          {ticket.status === 'resolved' && (
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Star className="h-6 w-6 fill-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    ปัญหาได้รับการแก้ไขแล้ว! กรุณาประเมินความพึงพอใจเพื่อพัฒนาองค์กร
                  </h4>
                  <p className="mt-0.5 text-xs text-amber-900/80">
                    เสียงสะท้อนของคุณมีคุณค่าอย่างยิ่งในการพัฒนามาตรฐานการบริการและการบริหารจัดการอย่างยั่งยืน
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-open-csat-banner"
                onClick={() => onOpenSatisfactionModal(ticket)}
                className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-amber-700 sm:w-auto"
              >
                <span>เริ่มการประเมิน CSAT (5 ดาว)</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* If Closed: Evaluation Feedback Summary */}
          {ticket.status === 'closed' && ticket.evaluation && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 sm:text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>ผลการประเมินความพึงพอใจการให้บริการ (CSAT Completed)</span>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
                  <Star className="h-4 w-4 fill-amber-400" />
                  <span>{ticket.evaluation.overallScore} / 5 คะแนน</span>
                </div>
              </div>
              <p className="mb-2 text-xs text-slate-700 italic">
                &quot;{ticket.evaluation.feedbackComment}&quot;
              </p>
              {ticket.evaluation.improvementSuggestions && (
                <div className="rounded-lg border border-emerald-100 bg-white/70 p-2 text-[11px] text-emerald-900">
                  <span className="font-semibold">ข้อเสนอแนะเพิ่มเติม:</span>{' '}
                  {ticket.evaluation.improvementSuggestions}
                </div>
              )}
            </div>
          )}

          {/* Ticket Information Breakdown */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Left Col: Core Details (2 cols) */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
              <h4 className="border-b border-slate-100 pb-2 text-xs font-bold tracking-wider text-slate-700 uppercase">
                ข้อมูลรายละเอียดข้อร้องเรียน
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">หมวดหมู่เรื่อง:</span>
                  <div className="mt-0.5 font-semibold text-slate-800">{categoryInfo?.nameTh}</div>
                </div>
                <div>
                  <span className="text-slate-500">ประเภท:</span>
                  <div className="mt-0.5 font-semibold text-slate-800">
                    {ticket.type === 'complaint'
                      ? '⚠️ ข้อร้องเรียน (Grievance)'
                      : '💡 ข้อเสนอแนะ (Suggestion)'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">สถานที่ / หน่วยงาน:</span>
                  <div className="mt-0.5 font-medium text-slate-800">
                    {ticket.locationOrUnit || 'สำนักงานใหญ่'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">ระดับความเร่งด่วน:</span>
                  <div className="mt-0.5 font-semibold text-indigo-700">
                    {ticket.urgency} ({ticket.riskSeverity} Risk)
                  </div>
                </div>
              </div>

              <div>
                <span className="mb-1 block text-xs text-slate-500">เนื้อหาและข้อเท็จจริง:</span>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                  {ticket.description}
                </div>
              </div>

              {/* Resolution statement if resolved */}
              {ticket.resolutionSummary && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
                  <span className="mb-1 block font-bold text-emerald-900">
                    สรุปผลการแก้ไขปัญหา (Resolution Summary):
                  </span>
                  <p className="text-slate-700">{ticket.resolutionSummary}</p>
                </div>
              )}

              {/* Attachments list */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <span className="mb-1 block text-xs text-slate-500">เอกสารแนบประกอบ:</span>
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

            {/* Right Col: Gatekeeper & Submitter Meta (1 col) */}
            <div className="space-y-4">
              {/* Gatekeeper Card */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 font-bold text-slate-800">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span>Gatekeeper ผู้รับผิดชอบ</span>
                </div>
                <div>
                  <span className="text-slate-500">หน่วยงานรับเรื่อง:</span>
                  <div className="mt-0.5 font-semibold text-indigo-900">
                    {ticket.gatekeeperDepartment}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">เจ้าหน้าที่ผู้รับผิดชอบ:</span>
                  <div className="mt-0.5 font-medium text-slate-800">
                    {ticket.assignedOfficerName || 'อยู่ระหว่างมอบหมายเจ้าหน้าที่'}
                  </div>
                </div>
                {ticket.assignedOfficerEmail && (
                  <div>
                    <span className="text-slate-500">อีเมลติดต่อ:</span>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-slate-700">
                      {ticket.assignedOfficerEmail}
                    </div>
                  </div>
                )}
              </div>

              {/* Submitter Identification Card */}
              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 text-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 font-bold text-slate-800">
                  <User className="h-4 w-4 text-indigo-600" />
                  <span>ข้อมูลพนักงานผู้ยื่นเรื่อง (Identified Submitter)</span>
                </div>
                <div>
                  <span className="text-slate-500">ผู้ยื่นเรื่อง:</span>
                  <div className="mt-0.5 font-semibold text-slate-900">
                    {ticket.submitterName || 'ไม่ระบุชื่อ'}{' '}
                    {ticket.submitterEmployeeId ? `(${ticket.submitterEmployeeId})` : ''}
                  </div>
                </div>
                {ticket.submitterDepartment && (
                  <div>
                    <span className="text-slate-500">ฝ่าย/สังกัด:</span>
                    <div className="mt-0.5 text-slate-700">{ticket.submitterDepartment}</div>
                  </div>
                )}
                {ticket.submitterEmail && (
                  <div>
                    <span className="text-slate-500">อีเมลติดต่อ:</span>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-slate-700">
                      {ticket.submitterEmail}
                    </div>
                  </div>
                )}
                {ticket.submitterPhone && (
                  <div>
                    <span className="text-slate-500">เบอร์โทรศัพท์:</span>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-700">
                      {ticket.submitterPhone}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Audit Logs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>ประวัติการดำเนินงานและบันทึกความคืบหน้า (Audit Trail & Activity Log)</span>
            </h4>

            <div className="relative space-y-6 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2 before:w-0.5 before:bg-slate-200">
              {ticket.timeline.map((log) => (
                <div key={log.id} className="group relative">
                  <div className="absolute top-0.5 -left-6 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-xs" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{log.actor}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {log.actorRole}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString('th-TH')}
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
              ))}
            </div>

            {/* Quick Employee Follow-up Note Form */}
            <form onSubmit={handleSendInquiry} className="mt-6 border-t border-slate-100 pt-4">
              <label className="mb-1.5 block flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                <span>ส่งข้อความสอบถาม / แจ้งข้อมูลเพิ่มเติมถึงเจ้าหน้าที่ Gatekeeper:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="พิมพ์ข้อความบันทึกลง Timeline..."
                  value={inquiryText}
                  onChange={(e) => setInquiryText(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmittingNote || !inquiryText.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>ส่งบันทึก</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
