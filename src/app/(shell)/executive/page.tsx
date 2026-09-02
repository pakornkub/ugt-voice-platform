'use client';

import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import { useShell } from '../../shell-context';

export default function ExecutivePage() {
  const { tickets, openTracking } = useShell();
  return <ExecutiveDashboard tickets={tickets} onSelectTicket={openTracking} />;
}
