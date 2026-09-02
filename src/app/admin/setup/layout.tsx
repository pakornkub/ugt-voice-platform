// app/admin/setup/layout.tsx — ugt-nextjs-auth-setup (2026-09-02). Any
// authenticated session may enter (permissions don't exist yet — this page
// creates the first one).
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export default async function AdminSetupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  return <>{children}</>;
}
