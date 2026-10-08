'use client';

// ugt-nextjs-auth-setup (2026-09-02) — SSO (Keycloak) only login form,
// hand-built Tailwind matching this app's existing pattern (see
// docs/DESIGN.md §1/§4, .claude/rules/ugt-nextjs-design.md) — no shadcn/ui,
// no next-intl.
import { useState } from 'react';
import { Building2, Loader2, Shield, TriangleAlert } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

// กัน open redirect: `from` มาจาก searchParams — รับเฉพาะ path ภายในแอป
// (ขึ้นต้น '/' และไม่ใช่ '//' หรือ '/\\') ค่าอื่นทิ้งเงียบ ๆ กลับหน้าแรก
function sanitizeFrom(from: string | undefined): string {
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\')) {
    return '/';
  }
  return from;
}

const SSO_ERROR_MESSAGES: Record<string, string> = {
  unable_to_create_user: 'ไม่สามารถสร้างบัญชีผู้ใช้จากข้อมูล SSO ได้ กรุณาติดต่อผู้ดูแลระบบ',
  account_not_linked: 'บัญชีนี้ยังไม่ได้เชื่อมโยงกับ SSO กรุณาติดต่อผู้ดูแลระบบ',
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
  const [isLoading, setIsLoading] = useState(false);
  const returnTo = sanitizeFrom(from);

  const banner = sessionExpired
    ? { tone: 'warning' as const, text: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง' }
    : ssoError
      ? {
          tone: 'danger' as const,
          text: SSO_ERROR_MESSAGES[ssoError] ?? `เข้าสู่ระบบไม่สำเร็จ (${ssoError})`,
        }
      : null;

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
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm shadow-indigo-200">
          <Shield className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">UGT VoicePlatform</h1>
        <p className="text-xs text-slate-500">
          ระบบบันทึกข้อร้องเรียน ข้อเสนอแนะ และติดตามผลเรียลไทม์
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

      <div className="flex w-full flex-col gap-3">
        <p className="text-center text-xs text-slate-500">
          เข้าสู่ระบบด้วยบัญชีองค์กร (Single Sign-On)
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
              <span>กำลังเชื่อมต่อ Keycloak...</span>
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4" />
              <span>เข้าสู่ระบบด้วยบัญชีองค์กร (SSO)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
