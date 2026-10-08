'use client';

import * as React from 'react';
import { Loader2, Paperclip, Trash2, Upload } from 'lucide-react';

/**
 * Attachment widget for a ticket (and, optionally, one of its timeline
 * entries) — posts to `/api/files`, which scans before storing (see
 * .claude/rules/ugt-nextjs-upload.md). Downloads go through the guarded
 * route, so the link is a plain href to `/api/files/<id>` and the server
 * decides whether it is allowed.
 *
 * Hand-built Tailwind, matching this project's existing components — this
 * app has no shadcn/ui, org UI kit, or i18n catalog installed (standing
 * design decision, see docs/DESIGN.md §10 and .claude/rules/ugt-nextjs-design.md),
 * unlike the skill's default asset which assumes `components/ui/button`,
 * `components/ui/icon-action`, `lib/format.ts`, and `next-intl`.
 *
 * NOT wired into any page yet: EmployeeSubmitForm.tsx / TrackingTimelineModal.tsx
 * still use their original localStorage-era fake-attachment simulator
 * (Math.random()-generated names) — that call-site rewiring is the same
 * unresolved item every chunk since ugt-nextjs-database-setup has left open
 * (see docs/project-context/decisions.md). This component exists ready for
 * the day that rewiring happens.
 *
 * "Remove" below only edits the local list — this skill ships no DELETE
 * endpoint, so an uploaded row is never soft-deleted from here (same
 * limitation as the skill's own asset).
 */
export interface AttachmentSummary {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

const UPLOAD_ERROR_TH: Record<string, string> = {
  UNAUTHORIZED: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
  FORBIDDEN_UPLOAD: 'คุณไม่มีสิทธิ์แนบไฟล์',
  BAD_REQUEST: 'ข้อมูลไฟล์ไม่ถูกต้อง',
  TICKET_NOT_FOUND: 'ไม่พบคำร้องนี้ในระบบ',
  TIMELINE_LOG_NOT_FOUND: 'ไม่พบบันทึกไทม์ไลน์นี้',
  UPLOAD_FAILED: 'อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
};

/** No central lib/format.ts in this project (docs/DESIGN.md §5) — kept local. */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIdx]}`;
}

export const FileUpload: React.FC<{
  ticketId: string;
  timelineLogId?: string;
  items: AttachmentSummary[];
  onChange: (next: AttachmentSummary[]) => void;
  disabled?: boolean;
}> = ({ ticketId, timelineLogId, items, onChange, disabled }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  const upload = async (file: File) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('ticketId', ticketId);
      if (timelineLogId) body.append('timelineLogId', timelineLogId);

      const response = await fetch(`${basePath}/api/files`, { method: 'POST', body });
      // Check `ok` before parsing — a 500 returning an HTML error page would
      // otherwise surface as a confusing JSON parse failure.
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const code = payload?.error?.code as string | undefined;
        const maxMb = payload?.error?.maxMb as number | undefined;
        setErrorMessage(
          code === 'FILE_TOO_LARGE' && maxMb
            ? `ไฟล์มีขนาดเกิน ${maxMb} MB`
            : (code && UPLOAD_ERROR_TH[code]) || UPLOAD_ERROR_TH.UPLOAD_FAILED
        );
        return;
      }
      const payload = await response.json();
      onChange([...items, payload.data as AttachmentSummary]);
    } catch (error) {
      console.error('upload failed', error);
      setErrorMessage(UPLOAD_ERROR_TH.UPLOAD_FAILED);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={disabled || busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="flex w-fit items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
        ) : (
          <Upload className="h-3.5 w-3.5 text-indigo-600" />
        )}
        <span>{busy ? 'กำลังอัปโหลด...' : 'แนบไฟล์'}</span>
      </button>

      {errorMessage && <p className="text-[11px] text-rose-600">{errorMessage}</p>}

      {items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <a
                href={`${basePath}/api/files/${item.id}`}
                className="min-w-0 flex-1 truncate font-medium text-slate-800 underline-offset-2 hover:text-indigo-700 hover:underline"
              >
                {item.fileName}
              </a>
              <span className="shrink-0 text-[10px] text-slate-400">
                {formatFileSize(item.fileSize)}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((x) => x.id !== item.id))}
                  className="shrink-0 p-1 text-slate-400 hover:text-rose-600"
                  aria-label="นำไฟล์แนบออกจากรายการ"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
