// app/login/page.tsx — ugt-nextjs-auth-setup (2026-09-02). Public route
// (listed in AUTH_ONLY_PATHS in src/proxy.ts) — no shell/Navbar chrome.
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ reason?: string; error?: string; from?: string }>;
}>) {
  // Already signed in (a real session, not just a cookie — see src/proxy.ts) → into the app.
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect('/');

  const sp = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans antialiased">
      <LoginForm
        sessionExpired={sp.reason === 'session_expired'}
        ssoError={sp.error}
        from={sp.from}
      />
    </div>
  );
}
