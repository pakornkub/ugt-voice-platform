'use client';

import { GatekeeperInbox } from '@/components/GatekeeperInbox';
import { useShell } from '../../shell-context';

export default function GatekeeperPage() {
  const { tickets, currentRole, openTracking, handleTicketUpdated } = useShell();
  return (
    <GatekeeperInbox
      tickets={tickets}
      currentRole={currentRole}
      onSelectTicket={openTracking}
      onTicketUpdated={handleTicketUpdated}
    />
  );
}
