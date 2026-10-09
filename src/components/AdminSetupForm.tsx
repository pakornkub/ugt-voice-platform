'use client';

// components/AdminSetupForm.tsx — one-click first-admin bootstrap
// (ugt-nextjs-auth-setup, 2026-09-02). Hand-built Tailwind, matches this
// app's existing card pattern — no shadcn/ui.
import { useState, useTransition } from 'react';
import { Loader2, Settings } from 'lucide-react';
import { initializeAdminAction } from '@/lib/actions/admin-setup';
import { useTr } from '@/context/useTr';
import { AuthLanguageSwitch } from './AuthLanguageSwitch';

const ERROR_MESSAGES: Record<string, { th: string; en: string }> = {
  UNAUTHORIZED: {
    th: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    en: 'Your session has expired. Please sign in again.',
  },
  ALREADY_INITIALIZED: {
    th: 'ระบบมีผู้ดูแลระบบแล้ว',
    en: 'This system already has an administrator.',
  },
};

export function AdminSetupForm() {
  const { tr, lang } = useTr();
  const [isPending, startTransition] = useTransition();
  // Kept as the failure code, not the text, so the message follows a language switch.
  const [errorCode, setErrorCode] = useState<string | null>(null);

  function handleSetup() {
    setErrorCode(null);
    startTransition(async () => {
      // สำเร็จ = action redirect('/admin/users') เอง — โค้ดหลัง await ไม่ได้รันต่อ
      const result = await initializeAdminAction();
      if (result?.code) {
        setErrorCode(result.code);
      }
    });
  }

  const error = errorCode
    ? (ERROR_MESSAGES[errorCode]?.[lang] ??
      tr(`Setup failed (${errorCode})`, `ตั้งค่าไม่สำเร็จ (${errorCode})`))
    : null;

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex justify-end">
        <AuthLanguageSwitch idPrefix="btn-setup-lang" />
      </div>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
          <Settings className="h-7 w-7 text-indigo-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          {tr('Set up the first administrator', 'ตั้งค่าผู้ดูแลระบบคนแรก')}
        </h1>
        <p className="text-xs leading-relaxed text-slate-500">
          {tr(
            'There is no administrator in this system yet.',
            'ยังไม่มีผู้ดูแลระบบ (Administrator) ในระบบนี้'
          )}
          <br />
          {tr(
            'Press the button below to make your account the first administrator.',
            'กดปุ่มด้านล่างเพื่อกำหนดให้บัญชีของคุณเป็นผู้ดูแลระบบคนแรก'
          )}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      <button
        type="button"
        id="btn-initialize-admin"
        onClick={handleSetup}
        disabled={isPending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{tr('Setting up...', 'กำลังตั้งค่า...')}</span>
          </>
        ) : (
          <span>{tr('Set up as administrator', 'ตั้งค่าเป็นผู้ดูแลระบบ')}</span>
        )}
      </button>
    </div>
  );
}
