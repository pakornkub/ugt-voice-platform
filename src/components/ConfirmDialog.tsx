'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  readonly dialog: ConfirmOptions | null;
  readonly onClose: () => void;
}

/**
 * In-app replacement for window.confirm (ported from upstream's admin screens —
 * browsers block native dialogs inside iframes). The dialog markup/classes are
 * upstream's; the hook below owns the open/close state so callers just call
 * `askConfirm({...})` and never have to close the dialog themselves.
 *
 * Keyboard/a11y: Escape closes, focus starts on the (safe) cancel button and returns to the
 * element that opened the dialog, and the message is the dialog's accessible description.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ dialog, onClose }) => {
  const { lang } = useLanguage();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const messageId = useId();
  const isOpen = dialog !== null;

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!dialog) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs duration-150">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={dialog.title}
        aria-describedby={messageId}
        className="animate-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl duration-150"
      >
        <div className="mb-4 flex items-start gap-3.5">
          <div
            className={`shrink-0 rounded-2xl p-3 ${dialog.isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}
          >
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base leading-snug font-bold text-slate-900">{dialog.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {lang === 'en'
                ? 'Please confirm to continue.'
                : 'โปรดยืนยันการทำรายการเพื่อดำเนินการต่อ'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'en' ? 'Close' : 'ปิด'}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p
          id={messageId}
          className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-600"
        >
          {dialog.message}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {dialog.cancelLabel || (lang === 'en' ? 'Cancel' : 'ยกเลิก')}
          </button>
          <button
            type="button"
            onClick={dialog.onConfirm}
            className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-xs transition ${
              dialog.isDestructive
                ? 'bg-rose-600 shadow-rose-200 hover:bg-rose-700'
                : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'
            }`}
          >
            {dialog.isDestructive && <Trash2 className="h-3.5 w-3.5" />}
            <span>{dialog.confirmLabel || (lang === 'en' ? 'Confirm' : 'ยืนยัน')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/** `askConfirm(opts)` opens the dialog; confirming runs `opts.onConfirm` then closes it. */
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);

  const askConfirm = useCallback((opts: ConfirmOptions) => {
    setDialog({
      ...opts,
      onConfirm: () => {
        opts.onConfirm();
        setDialog(null);
      },
    });
  }, []);

  const close = useCallback(() => setDialog(null), []);

  const confirmDialog = useMemo(
    () => <ConfirmDialog dialog={dialog} onClose={close} />,
    [dialog, close]
  );

  return { askConfirm, confirmDialog };
}
