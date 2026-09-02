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
  MessageSquare
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
      case 'submitted': return 0;
      case 'gatekeeper_triaged': return 1;
      case 'in_progress': return 2;
      case 'resolved': return 3;
      case 'closed': return 4;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(ticket.status);

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryText.trim()) return;

    setIsSubmittingNote(true);
    const updated = updateTicketWorkflow(ticket.id, {
      actorName: ticket.confidentiality === 'anonymous' ? 'พนักงาน (ไม่เปิดเผยตัวตน)' : (ticket.submitterName || 'พนักงาน'),
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-close-tracking-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {ticket.trackingCode}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(ticket.status)}`}>
                  {getStatusBadgeText(ticket.status)}
                </span>
                {ticket.isDirectToExecutive && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    <Crown className="w-3 h-3 text-purple-600" />
                    ส่งตรงถึง CEO/EVP
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-1 line-clamp-1">
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
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 animate-bounce"
              >
                <Star className="w-4 h-4 fill-white" />
                <span>ประเมินความพึงพอใจ</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Stepper Progress Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">
              ขั้นตอนการติดตามสถานะแบบเรียลไทม์ (Real-time Progress Tracker)
            </h3>
            
            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              {steps.map((step, idx) => {
                const isPassed = idx < currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-semibold mt-2 line-clamp-1 ${isCurrent ? 'text-indigo-700' : isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.labelTh}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 hidden md:block">
                      {step.subTh}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* If Resolved: CSAT Satisfaction Callout Banner */}
          {ticket.status === 'resolved' && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Star className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    ปัญหาได้รับการแก้ไขแล้ว! กรุณาประเมินความพึงพอใจเพื่อพัฒนาองค์กร
                  </h4>
                  <p className="text-xs text-amber-900/80 mt-0.5">
                    เสียงสะท้อนของคุณมีคุณค่าอย่างยิ่งในการพัฒนามาตรฐานการบริการและการบริหารจัดการอย่างยั่งยืน
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-open-csat-banner"
                onClick={() => onOpenSatisfactionModal(ticket)}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition shrink-0 flex items-center justify-center gap-2"
              >
                <span>เริ่มการประเมิน CSAT (5 ดาว)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* If Closed: Evaluation Feedback Summary */}
          {ticket.status === 'closed' && ticket.evaluation && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 border-b border-emerald-200/60 pb-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ผลการประเมินความพึงพอใจการให้บริการ (CSAT Completed)</span>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{ticket.evaluation.overallScore} / 5 คะแนน</span>
                </div>
              </div>
              <p className="text-xs text-slate-700 italic mb-2">
                "{ticket.evaluation.feedbackComment}"
              </p>
              {ticket.evaluation.improvementSuggestions && (
                <div className="text-[11px] text-emerald-900 bg-white/70 p-2 rounded-lg border border-emerald-100">
                  <span className="font-semibold">ข้อเสนอแนะเพิ่มเติม:</span> {ticket.evaluation.improvementSuggestions}
                </div>
              )}
            </div>
          )}

          {/* Ticket Information Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Left Col: Core Details (2 cols) */}
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                ข้อมูลรายละเอียดข้อร้องเรียน
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">หมวดหมู่เรื่อง:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {categoryInfo?.nameTh}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">ประเภท:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {ticket.type === 'complaint' ? '⚠️ ข้อร้องเรียน (Grievance)' : '💡 ข้อเสนอแนะ (Suggestion)'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">สถานที่ / หน่วยงาน:</span>
                  <div className="font-medium text-slate-800 mt-0.5">
                    {ticket.locationOrUnit || 'สำนักงานใหญ่'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">ระดับความเร่งด่วน:</span>
                  <div className="font-semibold text-indigo-700 mt-0.5">
                    {ticket.urgency} ({ticket.riskSeverity} Risk)
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 block mb-1">เนื้อหาและข้อเท็จจริง:</span>
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 leading-relaxed border border-slate-100">
                  {ticket.description}
                </div>
              </div>

              {/* Resolution statement if resolved */}
              {ticket.resolutionSummary && (
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs">
                  <span className="font-bold text-emerald-900 block mb-1">
                    สรุปผลการแก้ไขปัญหา (Resolution Summary):
                  </span>
                  <p className="text-slate-700">{ticket.resolutionSummary}</p>
                </div>
              )}

              {/* Attachments list */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 block mb-1">เอกสารแนบประกอบ:</span>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700">
                        <Paperclip className="w-3 h-3 text-slate-500" />
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
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 pb-2 border-b border-slate-200">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Gatekeeper ผู้รับผิดชอบ</span>
                </div>
                <div>
                  <span className="text-slate-500">หน่วยงานรับเรื่อง:</span>
                  <div className="font-semibold text-indigo-900 mt-0.5">
                    {ticket.gatekeeperDepartment}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">เจ้าหน้าที่ผู้รับผิดชอบ:</span>
                  <div className="font-medium text-slate-800 mt-0.5">
                    {ticket.assignedOfficerName || 'อยู่ระหว่างมอบหมายเจ้าหน้าที่'}
                  </div>
                </div>
                {ticket.assignedOfficerEmail && (
                  <div>
                    <span className="text-slate-500">อีเมลติดต่อ:</span>
                    <div className="text-slate-700 mt-0.5 truncate font-mono text-[11px]">
                      {ticket.assignedOfficerEmail}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500">SLA กำหนดเสร็จ:</span>
                  <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>ภายใน {ticket.slaTargetHours} ชม. ({new Date(ticket.slaDueDate).toLocaleDateString('th-TH')})</span>
                  </div>
                </div>
              </div>

              {/* Submitter Identification Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-800 pb-2 border-b border-slate-100">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>ข้อมูลพนักงานผู้ยื่นเรื่อง (Identified Submitter)</span>
                </div>
                <div>
                  <span className="text-slate-500">ผู้ยื่นเรื่อง:</span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {ticket.submitterName || 'ไม่ระบุชื่อ'} {ticket.submitterEmployeeId ? `(${ticket.submitterEmployeeId})` : ''}
                  </div>
                </div>
                {ticket.submitterDepartment && (
                  <div>
                    <span className="text-slate-500">ฝ่าย/สังกัด:</span>
                    <div className="text-slate-700 mt-0.5">
                      {ticket.submitterDepartment}
                    </div>
                  </div>
                )}
                {ticket.submitterEmail && (
                  <div>
                    <span className="text-slate-500">อีเมลติดต่อ:</span>
                    <div className="text-slate-700 mt-0.5 font-mono text-[11px] truncate">
                      {ticket.submitterEmail}
                    </div>
                  </div>
                )}
                {ticket.submitterPhone && (
                  <div>
                    <span className="text-slate-500">เบอร์โทรศัพท์:</span>
                    <div className="text-slate-700 mt-0.5 font-mono text-[11px]">
                      {ticket.submitterPhone}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Timeline Audit Logs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>ประวัติการดำเนินงานและบันทึกความคืบหน้า (Audit Trail & Activity Log)</span>
            </h4>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {ticket.timeline.map((log) => (
                <div key={log.id} className="relative group">
                  <div className="absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-xs" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{log.actor}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        {log.actorRole}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString('th-TH')}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-indigo-900 mt-1">
                    {log.action}
                  </div>
                  {log.notes && (
                    <div className="mt-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {log.notes}
                    </div>
                  )}
                  {log.attachmentName && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      <Paperclip className="w-3 h-3" />
                      <span>{log.attachmentName}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Employee Follow-up Note Form */}
            <form onSubmit={handleSendInquiry} className="mt-6 pt-4 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>ส่งข้อความสอบถาม / แจ้งข้อมูลเพิ่มเติมถึงเจ้าหน้าที่ Gatekeeper:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="พิมพ์ข้อความบันทึกลง Timeline..."
                  value={inquiryText}
                  onChange={(e) => setInquiryText(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmittingNote || !inquiryText.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
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