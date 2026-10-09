// Server half of the RBAC page: the executive roster comes from the DB (rewiring slice 2) with
// each email's HR-view status; the matrix itself comes from ShellContext (layout).
import { redirect } from 'next/navigation';
import { getExecutives } from '@/lib/actions/executives';
import { hrStatusByEmails } from '@/lib/directory';
import { isAccessDenied, RBAC_TABS, requireTab } from '@/lib/tab-guard';
import RbacView from './view';

export default async function RbacPage() {
  // The RBAC tab itself — getExecutives alone would also let a roster-tab-only role in.
  const executives = await requireTab(RBAC_TABS)
    .then(() => getExecutives())
    .catch((error: unknown) => {
      if (isAccessDenied(error)) return null;
      throw error;
    });
  if (!executives) redirect('/');
  const hrStatus = await hrStatusByEmails(executives.map((m) => m.email)).catch(() => null);
  return <RbacView executives={executives} hrStatus={hrStatus} />;
}
