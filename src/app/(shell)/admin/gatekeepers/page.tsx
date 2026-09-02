'use client';

import { AdminGatekeeperManagement } from '@/components/AdminGatekeeperManagement';
import { useShell } from '../../../shell-context';

export default function AdminGatekeeperPage() {
  const { tickets } = useShell();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <AdminGatekeeperManagement tickets={tickets} />
    </div>
  );
}
