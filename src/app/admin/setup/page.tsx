// app/admin/setup/page.tsx — first-admin bootstrap page (ugt-nextjs-auth-setup,
// 2026-09-02). No pre-registered admin account by design — the first person
// to log in visits this page and becomes Administrator with one click.
import { redirect } from 'next/navigation';
import { isAdminInitialized } from '@/lib/get-user-permissions';
import { AdminSetupForm } from '@/components/AdminSetupForm';

export default async function AdminSetupPage() {
  const ready = await isAdminInitialized();
  if (ready) redirect('/admin/users');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans antialiased">
      <AdminSetupForm />
    </div>
  );
}
