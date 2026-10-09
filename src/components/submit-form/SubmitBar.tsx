import React from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { useTr } from './useTr';

/** Submit action bar at the bottom of the form. */
export const SubmitBar: React.FC = () => {
  const { tr } = useTr();
  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-100/80 p-3 sm:flex-row sm:p-3.5">
      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="text-[11px]">
          {tr(
            'Data protected under ISO 10002, PDPA and Whistleblower policy',
            'ข้อมูลได้รับการปกป้องตามมาตรฐาน PDPA และนโยบาย Whistleblower'
          )}
        </span>
      </div>

      <button
        type="submit"
        id="btn-submit-ticket-final"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow sm:w-auto sm:text-sm"
      >
        <Send className="h-4 w-4" />
        <span>{tr('Submit Record', 'ส่งข้อมูลเข้าระบบ (Submit Record)')}</span>
      </button>
    </div>
  );
};
