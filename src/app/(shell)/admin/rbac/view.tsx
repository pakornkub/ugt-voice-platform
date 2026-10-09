'use client';

import { RoleBasedAccessManagement } from '@/components/RoleBasedAccessManagement';
import type { HrStatus } from '@/lib/directory';
import type { ExecutiveMember } from '@/types';
import { useShell } from '../../../shell-context';

export default function RbacView({
  executives,
  hrStatus,
}: Readonly<{ executives: ExecutiveMember[]; hrStatus: Record<string, HrStatus> | null }>) {
  const { currentRole, navigateTab, refreshData } = useShell();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <RoleBasedAccessManagement
        currentRole={currentRole}
        onNavigateTab={navigateTab}
        onPermissionsUpdated={refreshData}
        initialExecutives={executives}
        hrStatus={hrStatus}
      />
    </div>
  );
}
