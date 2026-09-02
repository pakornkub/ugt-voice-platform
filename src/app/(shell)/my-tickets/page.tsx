'use client';

import { MyTicketsList } from '@/components/MyTicketsList';
import { useShell } from '../../shell-context';

export default function MyTicketsPage() {
  const { tickets, openTrackingByCode, openSatisfaction, navigateTab } = useShell();
  return (
    <MyTicketsList
      tickets={tickets}
      onOpenTracking={openTrackingByCode}
      onOpenSatisfaction={openSatisfaction}
      onNavigateToSubmit={() => navigateTab('submit')}
    />
  );
}
