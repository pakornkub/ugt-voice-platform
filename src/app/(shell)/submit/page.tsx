'use client';

import { EmployeeSubmitForm } from '@/components/EmployeeSubmitForm';
import type { EmployeeRecord } from '@/types';
import { useShell, type ShellIdentity } from '../../shell-context';

/** The signed-in person for the submit form: their HR-view profile, else their SSO name/email. */
function currentEmployeeOf(identity: ShellIdentity): EmployeeRecord {
  return (
    identity.employee ?? {
      employeeId: '',
      nameTh: identity.name,
      nameEn: identity.name,
      loginEmail: identity.email,
      department: '',
      position: '',
      phone: '',
      status: 'active',
    }
  );
}

export default function SubmitPage() {
  const { handleTicketCreated, openTrackingByCode, identity } = useShell();
  return (
    <EmployeeSubmitForm
      onTicketCreated={handleTicketCreated}
      onOpenTracking={openTrackingByCode}
      currentEmployee={currentEmployeeOf(identity)}
    />
  );
}
