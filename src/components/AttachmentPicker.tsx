'use client';

import React, { useRef } from 'react';
import { FileText, Loader2, Paperclip, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatFileSize } from '@/lib/format-file-size';
import { uploadErrorMessage, type UploadFailure } from '@/lib/upload-client';

/** A file chosen in the submit form — kept in memory until the ticket exists (upload needs a ticketId). */
export interface PendingFile {
  id: string;
  file: File;
}

const FILE_INPUT_ID = 'input-ticket-attachments';

/**
 * Evidence picker of the submit form: a real hidden file input behind upstream's attach button, with
 * the chosen files listed (name, size, remove). Nothing is uploaded here — EmployeeSubmitForm uploads
 * them to /api/files once submitTicket has returned the ticket id.
 */
export const AttachmentPicker: React.FC<
  Readonly<{
    files: PendingFile[];
    disabled?: boolean;
    onAdd: (added: PendingFile[]) => void;
    onRemove: (id: string) => void;
  }>
> = ({ files, disabled, onAdd, onRemove }) => {
  const { lang } = useLanguage();
  const tr = (en: string, th: string) => (lang === 'en' ? en : th);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const openPicker = () => inputRef.current?.click();

  const handleChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    // Reset so choosing the same file again (after removing it) still fires onChange.
    event.target.value = '';
    if (chosen.length === 0) return;
    onAdd(
      chosen.map((file) => {
        seq.current += 1;
        return { id: `pending-${seq.current}`, file };
      })
    );
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={FILE_INPUT_ID} className="block text-xs font-semibold text-slate-700">
          {tr('Attach Evidence / Documents', 'แนบไฟล์หลักฐาน / เอกสารประกอบ')}
        </label>
        <button
          type="button"
          id="btn-attach-file"
          disabled={disabled}
          onClick={openPicker}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          <Paperclip className="h-3 w-3" />
          {tr('+ Attach file', '+ แนบไฟล์')}
        </button>
        <input
          ref={inputRef}
          id={FILE_INPUT_ID}
          type="file"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={handleChosen}
        />
      </div>

      {files.length === 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 p-2.5 text-center text-xs text-slate-500 transition hover:border-indigo-400 hover:bg-slate-50/50 disabled:opacity-50"
        >
          <Paperclip className="h-4 w-4 text-slate-400" />
          <span>
            {tr(
              'Click to attach evidence (PNG, JPG, PDF, DOCX up to 25 MB)',
              'คลิกเพื่อแนบไฟล์หลักฐาน (PNG, JPG, PDF, DOCX ขนาดไม่เกิน 25 MB)'
            )}
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {files.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                <span className="truncate text-[11px] font-medium text-slate-800">
                  {item.file.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({formatFileSize(item.file.size)})
                </span>
              </div>
              <button
                type="button"
                aria-label={tr('Remove file', 'ลบไฟล์')}
                disabled={disabled}
                onClick={() => onRemove(item.id)}
                className="p-1 text-slate-400 hover:text-rose-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Shown on the success screen when some files could not be attached. The ticket itself is already
 * saved, so this only lists what failed (and why) and offers another try with the same files.
 */
export const AttachmentFailureNotice: React.FC<
  Readonly<{
    failures: UploadFailure[];
    isRetrying: boolean;
    onRetry: () => void;
  }>
> = ({ failures, isRetrying, onRetry }) => {
  const { lang } = useLanguage();
  const tr = (en: string, th: string) => (lang === 'en' ? en : th);
  return (
    <div
      role="alert"
      className="mx-auto mb-6 max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-4 text-left text-xs text-amber-900"
    >
      <p className="mb-1.5 font-bold">
        {tr(
          'Your record was saved, but some files could not be attached:',
          'บันทึกคำร้องเรียบร้อยแล้ว แต่แนบไฟล์บางรายการไม่สำเร็จ:'
        )}
      </p>
      <ul className="mb-2.5 space-y-1">
        {failures.map((failure) => (
          <li key={failure.id}>
            <span className="font-semibold">
              {tr('Could not attach: ', 'แนบไฟล์ไม่สำเร็จ: ')}
              {failure.file.name}
            </span>{' '}
            <span className="text-amber-800">— {uploadErrorMessage(failure, lang)}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        id="btn-retry-attachments"
        disabled={isRetrying}
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
      >
        {isRetrying && <Loader2 className="h-3 w-3 animate-spin" />}
        {tr('Try attaching again', 'ลองแนบไฟล์อีกครั้ง')}
      </button>
    </div>
  );
};
