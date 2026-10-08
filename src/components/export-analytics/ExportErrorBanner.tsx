import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ExportErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

/** Inline, dismissible failure notice shown next to the download button. */
export const ExportErrorBanner: React.FC<Readonly<ExportErrorBannerProps>> = ({
  message,
  onDismiss,
}) => (
  <div
    role="alert"
    className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800"
  >
    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
    <span className="flex-1 font-bold">{message}</span>
    <button
      type="button"
      aria-label="ปิดข้อความแจ้งเตือน"
      onClick={onDismiss}
      className="rounded-lg p-1 text-rose-600 transition hover:bg-rose-100"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
);
