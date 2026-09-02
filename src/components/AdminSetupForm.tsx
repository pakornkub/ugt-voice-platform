'use client';

// components/AdminSetupForm.tsx — one-click first-admin bootstrap
// (ugt-nextjs-auth-setup, 2026-09-02). Hand-built Tailwind, matches this
// app's existing card pattern — no shadcn/ui.
import { useState, useTransition } from 'react';
import { Loader2, Settings } from 'lucide-react';
import { initializeAdminAction } from '@/lib/actions/admin-setup';

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
  ALREADY_INITIALIZED: 'ระบบมีผู้ดูแลระบบแล้ว',
};

export function AdminSetupForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSetup() {
    setError(null);
    startTransition(async () => {
      // สำเร็จ = action redirect('/admin/users') เอง — โค้ดหลัง await ไม่ได้รันต่อ
      const result = await initializeAdminAction();
      if (result?.code) {
        setError(ERROR_MESSAGES[result.code] ?? `ตั้งค่าไม่สำเร็จ (${result.code})`);
      }
    });
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
          <Settings className="h-7 w-7 text-indigo-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">ตั้งค่าผู้ดูแลระบบคนแรก</h1>
        <p className="text-xs leading-relaxed text-slate-500">
          ยังไม่มีผู้ดูแลระบบ (Administrator) ในระบบนี้
          <br />
          กดปุ่มด้านล่างเพื่อกำหนดให้บัญชีของคุณเป็นผู้ดูแลระบบคนแรก
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
            <span>กำลังตั้งค่า...</span>
          </>
        ) : (
          <span>ตั้งค่าเป็นผู้ดูแลระบบ</span>
        )}
      </button>
    </div>
  );
}
