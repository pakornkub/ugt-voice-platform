// Server half of the Gatekeeper-management page: rosters come from the DB (rewiring slice 2) and
// each roster email gets its HR-view status for the "not in HR" / "no longer active" badges.
import { redirect } from 'next/navigation';
import { getExecutives } from '@/lib/actions/executives';
import { getHrAdmins } from '@/lib/actions/hr-admins';
import { getDepartmentGatekeeperConfigs } from '@/lib/actions/gatekeeper';
import { hrStatusByEmails } from '@/lib/directory';
import { isAccessDenied } from '@/lib/tab-guard';
import GatekeepersView from './view';

export default async function AdminGatekeeperPage() {
  const data = await Promise.all([
    getExecutives(),
    getHrAdmins(),
    getDepartmentGatekeeperConfigs(),
  ]).catch((error: unknown) => {
    if (isAccessDenied(error)) return null; // no roster tab → back to the app
    throw error; // DB / linked-server failures surface as errors, not as a silent redirect
  });
  if (!data) redirect('/');
  const [executives, hrAdmins, configs] = data;
  const emails = [
    ...executives.map((m) => m.email),
    ...hrAdmins.map((m) => m.email),
    ...Object.values(configs).flatMap((c) => c.officers.map((o) => o.email)),
  ];
  // HR view unreachable → null = "unknown", so no badge is shown rather than a wrong one.
  const hrStatus = await hrStatusByEmails(emails).catch(() => null);
  return <GatekeepersView executives={executives} hrAdmins={hrAdmins} hrStatus={hrStatus} />;
}
