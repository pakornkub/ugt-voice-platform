'use client';

import { RoleBasedAccessManagement } from '@/components/RoleBasedAccessManagement';
import { useShell } from '../../../shell-context';

export default function RbacPage() {
  const { currentRole, handleRoleChange, navigateTab, refreshData } = useShell();
  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <RoleBasedAccessManagement
        currentRole={currentRole}
        onSwitchRole={handleRoleChange}
        onNavigateTab={navigateTab}
        onPermissionsUpdated={refreshData}
      />
    </div>
  );
}
