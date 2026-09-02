'use client';

import { AdminGatekeeperManagement } from '@/components/AdminGatekeeperManagement';
import { useShell } from '../../../shell-context';

export default function AdminGatekeeperPage() {
  const { tickets } = useShell();
  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <AdminGatekeeperManagement tickets={tickets} />
    </div>
  );
}
