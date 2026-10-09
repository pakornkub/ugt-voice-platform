// app/login/page.tsx — ugt-nextjs-auth-setup (2026-09-02). Public route
// (listed in AUTH_ONLY_PATHS in src/proxy.ts) — no shell/Navbar chrome.
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';
import { LoginHero } from './LoginHero';

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
    // Two columns from lg (owner request 2026-10-09): hero image + pitch left, sign-in card right.
    <div className="grid min-h-screen bg-slate-50 font-sans antialiased lg:grid-cols-2">
      <LoginHero />
      <main className="flex items-center justify-center p-4 sm:p-8">
        <LoginForm
          sessionExpired={sp.reason === 'session_expired'}
          ssoError={sp.error}
          from={sp.from}
        />
      </main>
    </div>
  );
}
