'use client';

import { AdminGatekeeperManagement } from '@/components/AdminGatekeeperManagement';
import type { HrStatus } from '@/lib/directory';
import type { ExecutiveMember, HrAdminMember } from '@/types';
import { useShell } from '../../../shell-context';

export default function GatekeepersView({
  executives,
  hrAdmins,
  hrStatus,
}: Readonly<{
  executives: ExecutiveMember[];
  hrAdmins: HrAdminMember[];
  hrStatus: Record<string, HrStatus> | null;
}>) {
  const { tickets } = useShell();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <AdminGatekeeperManagement
        tickets={tickets}
        initialExecutives={executives}
        initialHrAdmins={hrAdmins}
        hrStatus={hrStatus}
      />
    </div>
  );
}
