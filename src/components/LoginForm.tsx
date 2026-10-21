'use client';

// ugt-nextjs-auth-setup (2026-09-02) — SSO (Keycloak) only login form,
// hand-built Tailwind matching this app's existing pattern (see
// docs/DESIGN.md §1/§4, .claude/rules/ugt-nextjs-design.md) — no shadcn/ui,
// no next-intl.
import Link from 'next/link';
import { useState } from 'react';
import { Building2, Loader2, PenLine, Search, Shield, TriangleAlert } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useTr } from '@/context/useTr';
import { AuthLanguageSwitch } from './AuthLanguageSwitch';

// กัน open redirect: `from` มาจาก searchParams — รับเฉพาะ path ภายในแอป
// (ขึ้นต้น '/' และไม่ใช่ '//' หรือ '/\\') ค่าอื่นทิ้งเงียบ ๆ กลับหน้าแรก
function sanitizeFrom(from: string | undefined): string {
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\')) {
    return '/';
  }
  return from;
}

const SSO_ERROR_MESSAGES: Record<string, { th: string; en: string }> = {
  unable_to_create_user: {
    th: 'ไม่สามารถสร้างบัญชีผู้ใช้จากข้อมูล SSO ได้ กรุณาติดต่อผู้ดูแลระบบ',
    en: 'Could not create a user account from the SSO data. Please contact the system administrator.',
  },
  account_not_linked: {
    th: 'บัญชีนี้ยังไม่ได้เชื่อมโยงกับ SSO กรุณาติดต่อผู้ดูแลระบบ',
    en: 'This account is not linked to SSO yet. Please contact the system administrator.',
  },
};

export function LoginForm({
  sessionExpired = false,
  ssoError,
  from,
}: Readonly<{
  sessionExpired?: boolean;
  ssoError?: string;
  from?: string;
}>) {
  const { tr, lang } = useTr();
  const [isLoading, setIsLoading] = useState(false);
  const returnTo = sanitizeFrom(from);

  const errorBanner = ssoError
    ? {
        tone: 'danger' as const,
        text:
          SSO_ERROR_MESSAGES[ssoError]?.[lang] ??
          tr(`Sign-in failed (${ssoError})`, `เข้าสู่ระบบไม่สำเร็จ (${ssoError})`),
      }
    : null;
  const banner = sessionExpired
    ? {
        tone: 'warning' as const,
        text: tr(
          'Your session has expired. Please sign in again.',
          'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'
        ),
      }
    : errorBanner;

  async function handleSsoLogin() {
    setIsLoading(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      const { error } = await authClient.signIn.social({
        provider: 'keycloak',
        callbackURL: `${basePath}${returnTo}`,
      });
      if (error) throw error;
      // สำเร็จ = เบราว์เซอร์ถูก redirect ไป Keycloak ต่อ — ปล่อย spinner ค้างไว้
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex w-full justify-end">
        <AuthLanguageSwitch idPrefix="btn-login-lang" />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm shadow-indigo-200">
          <Shield className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">UGT VoiceCare</h1>
        <p className="text-xs text-slate-500">
          {tr(
            'Grievance, suggestion and real-time tracking system',
            'ระบบบันทึกข้อร้องเรียน ข้อเสนอแนะ และติดตามผลเรียลไทม์'
          )}
        </p>
      </div>

      {banner && (
        <div
          className={`flex w-full items-start gap-2.5 rounded-xl border p-3 text-xs ${
            banner.tone === 'danger'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}

      {/* Employees need no account (no-login portal, owner 2026-10-21). */}
      <div className="flex w-full flex-col gap-2">
        <Link
          id="link-portal-report"
          href="/report"
          className="flex w-full flex-col rounded-xl border-2 border-indigo-200 bg-indigo-50/60 px-4 py-3 transition hover:border-indigo-400 hover:bg-indigo-50"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-indigo-700">
            <PenLine className="h-4 w-4" />
            {tr(
              'Employees: submit a grievance / suggestion',
              'พนักงาน: ยื่นเรื่องร้องเรียน / ข้อเสนอแนะ'
            )}
          </span>
          <span className="mt-0.5 text-[11px] text-slate-500">
            {tr(
              'No sign-in needed · identified or anonymous',
              'ไม่ต้องเข้าสู่ระบบ · ระบุตัวตนหรือไม่ก็ได้'
            )}
          </span>
        </Link>
        <Link
          id="link-portal-track"
          href="/track"
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-700 hover:underline"
        >
          <Search className="h-3.5 w-3.5" />
          {tr('Have a tracking code? Track your ticket', 'มีเลขที่เรื่องแล้ว? ติดตามเรื่อง')}
        </Link>
      </div>

      <div className="flex w-full items-center gap-2 text-[11px] text-slate-400">
        <span className="flex-1 border-t border-slate-200" />
        {tr('For staff', 'สำหรับเจ้าหน้าที่')}
        <span className="flex-1 border-t border-slate-200" />
      </div>

      <div className="flex w-full flex-col gap-3">
        <p className="text-center text-xs text-slate-500">
          {tr(
            'Gatekeepers, executives and administrators sign in with the company account (SSO)',
            'Gatekeeper ผู้บริหาร และผู้ดูแลระบบ เข้าสู่ระบบด้วยบัญชีองค์กร (SSO)'
          )}
        </p>
        <button
          type="button"
          id="btn-sso-login"
          onClick={handleSsoLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{tr('Connecting to Keycloak...', 'กำลังเชื่อมต่อ Keycloak...')}</span>
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4" />
              <span>
                {tr('Sign in with company account (SSO)', 'เข้าสู่ระบบด้วยบัญชีองค์กร (SSO)')}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
