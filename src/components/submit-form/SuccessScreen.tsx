import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Crown } from 'lucide-react';
import type { ComplaintTicket } from '../../types';
import { CATEGORY_DEFINITIONS } from '../../mockData';
import { getUrgencyBadgeText } from '../../services/api';
import type { UploadFailure } from '@/lib/upload-client';
import { AttachmentFailureNotice } from '../AttachmentPicker';
import { useTr } from './useTr';

/** Tracking code, current status and urgency of the record that was just created. */
const TrackingCodeCard: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket }) => {
  const { lang, tr } = useTr();
  return (
    <div className="mx-auto mb-6 max-w-lg rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            {tr('Tracking Code', 'รหัสติดตามความคืบหน้า (Tracking Code)')}
          </span>
          <div className="mt-0.5 text-2xl font-black tracking-wider text-indigo-700">
            {ticket.trackingCode}
          </div>
        </div>
        <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {CATEGORY_DEFINITIONS[ticket.category]?.nameEn}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-slate-500">{tr('Current Status:', 'สถานะปัจจุบัน:')}</span>
          <div className="mt-0.5 flex items-center gap-1 font-medium text-blue-700">
            <span className="h-2 w-2 animate-ping rounded-full bg-blue-600" />
            {tr('Submitted', 'ยื่นเรื่องแล้ว (Submitted)')}
          </div>
        </div>
        <div>
          <span className="text-slate-500">{tr('Urgency Level:', 'ระดับความเร่งด่วน:')}</span>
          <div className="mt-0.5 flex items-center gap-1 font-medium text-slate-800">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            {getUrgencyBadgeText(ticket.urgency, lang)}
          </div>
        </div>
        {ticket.isDirectToExecutive && (
          <div className="col-span-2 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-2 text-xs text-purple-800">
            <Crown className="h-4 w-4 shrink-0 text-purple-600" />
            <span>
              {tr(
                'Special Route: Direct priority notification sent to executive management (CEO/EVP)',
                'บันทึกในช่องทางพิเศษ: ส่งแจ้งเตือนตรงถึงฝ่ายบริหารระดับสูง (CEO/EVP)'
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface SuccessScreenProps {
  ticket: ComplaintTicket;
  uploadFailures: UploadFailure[];
  isRetryingUploads: boolean;
  onRetryUploads: () => void;
  onOpenTracking: (trackingCode: string) => void;
  onSubmitAnother: () => void;
}

/** Shown after the record was saved. */
export const SuccessScreen: React.FC<Readonly<SuccessScreenProps>> = ({
  ticket,
  uploadFailures,
  isRetryingUploads,
  onRetryUploads,
  onOpenTracking,
  onSubmitAnother,
}) => {
  const { tr } = useTr();
  return (
    <div className="animate-in fade-in zoom-in-95 mx-auto max-w-3xl px-4 py-8 duration-200">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h2 className="mb-2 text-xl font-bold text-slate-900 sm:text-2xl">
          {ticket.type === 'complaint'
            ? tr('Grievance Recorded Successfully', 'บันทึกข้อร้องเรียนเรียบร้อยแล้ว')
            : tr('Suggestion Recorded Successfully', 'บันทึกข้อเสนอแนะเรียบร้อยแล้ว')}
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-slate-600">
          {tr(
            `The system has routed your submission to the ${ticket.gatekeeperDepartment} unit for screening and standard processing.`,
            `ระบบได้ส่งข้อมูลไปยังหน่วยงาน ${ticket.gatekeeperDepartment} เพื่อคัดกรองและดำเนินการตามขั้นตอน`
          )}
        </p>

        {/* Tracking Code Highlight Card */}
        <TrackingCodeCard ticket={ticket} />

        {uploadFailures.length > 0 && (
          <AttachmentFailureNotice
            failures={uploadFailures}
            isRetrying={isRetryingUploads}
            onRetry={onRetryUploads}
          />
        )}

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            id="btn-view-timeline-now"
            type="button"
            onClick={() => onOpenTracking(ticket.trackingCode)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto"
          >
            <span>{tr('View Real-time Timeline', 'เปิดดูไทม์ไลน์สถานะเรียลไทม์')}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            id="btn-submit-another"
            type="button"
            onClick={onSubmitAnother}
            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            {tr('Submit Another Record', 'ยื่นเรื่องใหม่อีกครั้ง')}
          </button>
        </div>
      </div>
    </div>
  );
};
