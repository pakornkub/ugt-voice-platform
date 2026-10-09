'use client';

// components/MissingAccountScreen.tsx — the screen app/(shell)/layout.tsx shows when the session's
// user row is gone. The layout is a Server Component and cannot see the UI language (it lives in
// localStorage), so the copy is here. Renders outside <Shell>: nothing else is safe to show.
import { ssoLogoutAction } from '@/lib/actions/auth';
import { useTr } from '@/context/useTr';

export function MissingAccountScreen({ email }: Readonly<{ email: string }>) {
  const { tr } = useTr();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center font-sans text-slate-900 antialiased">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm shadow-indigo-200">
        <span className="text-lg font-black">UGT</span>
      </div>
      <h1 className="text-lg font-bold text-slate-900">
        {tr('User account not found', 'ไม่พบบัญชีผู้ใช้งานในระบบ')}
      </h1>
      <p className="max-w-md text-sm text-slate-500">
        {tr('The account', 'บัญชี')}{' '}
        <strong className="font-semibold text-slate-700">{email}</strong>{' '}
        {tr(
          'was not found in the system. Please sign out and sign in again. If the problem continues, contact the system administrator.',
          'ไม่พบข้อมูลบัญชีนี้ในระบบ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่อีกครั้ง หากยังพบปัญหา กรุณาติดต่อผู้ดูแลระบบ'
        )}
      </p>
      <div className="flex items-center gap-2">
        <form action={ssoLogoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            {tr('Sign out', 'ออกจากระบบ')}
          </button>
        </form>
      </div>
    </div>
  );
}
