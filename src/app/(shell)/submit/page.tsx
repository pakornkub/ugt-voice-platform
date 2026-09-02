'use client';

import { EmployeeSubmitForm } from '@/components/EmployeeSubmitForm';
import { useShell } from '../../shell-context';

export default function SubmitPage() {
  const { handleTicketCreated, openTrackingByCode } = useShell();
  return (
    <EmployeeSubmitForm onTicketCreated={handleTicketCreated} onOpenTracking={openTrackingByCode} />
  );
}
