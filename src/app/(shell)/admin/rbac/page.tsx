'use client';

import { RoleBasedAccessManagement } from '@/components/RoleBasedAccessManagement';
import { useShell } from '../../../shell-context';

export default function RbacPage() {
  const { currentRole, handleRoleChange, navigateTab, refreshData } = useShell();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <RoleBasedAccessManagement
        currentRole={currentRole}
        onSwitchRole={handleRoleChange}
        onNavigateTab={navigateTab}
        onPermissionsUpdated={refreshData}
      />
    </div>
  );
}
