import { describe, expect, it } from 'vitest';
import {
  canSubmit,
  canTriage,
  gatekeeperDepartments,
  isNotificationForViewer,
  isOwnTicket,
  presentTicketForViewer,
  PROTECTED_ACTOR_NAME,
  redactNotificationForViewer,
  redactTicketForViewer,
  ticketScopeWhere,
  ticketViewFor,
  touchesTriageFields,
  type TicketViewer,
} from './ticket-scope';
import { INITIAL_ROLE_PERMISSIONS } from '@/services/rosterDefaults';
import { INITIAL_COMPLAINTS } from '@/mockData';
import type { ComplaintTicket, RolePermissionConfig, UserRole } from '@/types';

const viewer = (role: UserRole, patch: Partial<RolePermissionConfig> = {}): TicketViewer => {
  const config = { ...INITIAL_ROLE_PERMISSIONS[role], ...patch };
  return {
    userId: 'u1',
    email: 'me@ube.com',
    name: 'Me',
    rbacRoleName: null,
    role,
    config,
    gatekeeperCategories: gatekeeperDepartments(config),
  };
};

const OWN = {
  // Both spellings of the org mailbox (lib/email-identity.ts).
  OR: [
    { loginEmail: { in: ['me@ube.com', 'me@ube.co.th'] } },
    { loginEmail: null, submitterEmail: { in: ['me@ube.com', 'me@ube.co.th'] } },
  ],
};

describe('ticketScopeWhere', () => {
  it('limits an employee to the tickets they submitted', () => {
    expect(ticketScopeWhere(viewer('employee'))).toEqual({ isDeleted: false, ...OWN });
  });

  it('limits a gatekeeper to the assigned departments and hides direct-to-CEO tickets', () => {
    expect(ticketScopeWhere(viewer('gatekeeper', { assignedDepartments: ['Quality'] }))).toEqual({
      isDeleted: false,
      OR: [OWN, { AND: [{ isDirectToExecutive: false }, { category: { in: ['Quality'] } }] }],
    });
  });

  it('shows direct-to-CEO tickets to a gatekeeper granted canViewDirectCeoTickets', () => {
    const where = ticketScopeWhere(
      viewer('gatekeeper', { assignedDepartments: ['HR'], canViewDirectCeoTickets: true })
    );
    expect(where.OR?.[1]).toEqual({ AND: [{ category: { in: ['HR'] } }] });
  });

  it('gives executives and admins every department, direct-to-CEO per the RBAC flag', () => {
    expect(ticketScopeWhere(viewer('admin'))).toEqual({ isDeleted: false });
    expect(
      ticketScopeWhere(viewer('executive', { canViewDirectCeoTickets: false })).OR?.[1]
    ).toEqual({ AND: [{ isDirectToExecutive: false }] });
  });

  it('falls back to own tickets when the role has no RoleAccessConfigs row', () => {
    expect(ticketScopeWhere({ ...viewer('admin'), config: undefined })).toEqual({
      isDeleted: false,
      ...OWN,
    });
  });
});

describe('gatekeeperDepartments', () => {
  it('defaults an empty assignment to HR, like GatekeeperInbox', () => {
    expect(gatekeeperDepartments(viewer('gatekeeper', { assignedDepartments: [] }).config)).toEqual(
      ['HR']
    );
    expect(gatekeeperDepartments(undefined)).toEqual(['HR']);
  });
});

describe('action permissions', () => {
  it('lets whoever holds the submit tab file a ticket', () => {
    expect(canSubmit(viewer('employee'))).toBe(true);
    expect(canSubmit(viewer('gatekeeper'))).toBe(false);
    expect(canSubmit({ ...viewer('admin'), config: undefined })).toBe(false);
  });

  it('lets whoever holds the gatekeeper tab triage', () => {
    expect(canTriage(viewer('gatekeeper'))).toBe(true);
    expect(canTriage(viewer('admin'))).toBe(true);
    expect(canTriage(viewer('employee'))).toBe(false);
    expect(canTriage(viewer('executive'))).toBe(false);
  });

  it('tells a plain note from a triage change', () => {
    expect(touchesTriageFields({ actorName: 'x', actionNote: 'note' })).toBe(false);
    expect(touchesTriageFields({ actionNote: 'note', status: 'resolved' })).toBe(true);
    expect(touchesTriageFields({ urgency: 'High' })).toBe(true);
  });
});

describe('isOwnTicket', () => {
  it('matches the login email, else the submitter email on legacy rows, case-insensitively', () => {
    const me = { email: 'Me@UBE.com' };
    expect(isOwnTicket(me, { loginEmail: 'me@ube.com' })).toBe(true);
    expect(isOwnTicket(me, { loginEmail: 'ME@ube.co.th' })).toBe(true); // same mailbox, HR spelling
    expect(isOwnTicket(me, { loginEmail: null, submitterEmail: 'me@ube.com' })).toBe(true);
    expect(isOwnTicket(me, { loginEmail: 'other@ube.com', submitterEmail: 'me@ube.com' })).toBe(
      false
    );
    expect(isOwnTicket(me, {})).toBe(false);
  });
});

describe('redactTicketForViewer (server twin of the UI masking)', () => {
  const base: ComplaintTicket = {
    ...INITIAL_COMPLAINTS[0],
    submitterName: 'สมหญิง ใจดี',
    submitterEmployeeId: 'EMP042',
    submitterDepartment: 'Finance',
    submitterEmail: 'somying@ube.com',
    submitterPhone: '0812345678',
    loginEmail: 'somying@ube.com',
    timeline: [
      {
        id: 'l1',
        timestamp: '2026-10-09T00:00:00Z',
        actor: 'สมหญิง ใจดี',
        actorRole: 'Employee',
        action: 'ยื่นเรื่อง',
        status: 'submitted',
      },
      {
        id: 'l2',
        timestamp: '2026-10-09T01:00:00Z',
        actor: 'Gatekeeper Supervisor',
        actorRole: 'Gatekeeper Lead',
        action: 'triage',
        status: 'gatekeeper_triaged',
      },
    ],
  };
  const anonymous = { ...base, confidentiality: 'anonymous' as const };
  const confidential = { ...base, confidentiality: 'confidential_restricted' as const };

  it('leaves the submitter their own ticket and everyone a named ticket', () => {
    const owner = { ...viewer('employee'), email: 'somying@ube.com' };
    expect(redactTicketForViewer(owner, confidential)).toBe(confidential);
    expect(
      redactTicketForViewer(viewer('gatekeeper'), { ...base, confidentiality: 'standard_named' })
    ).toEqual({ ...base, confidentiality: 'standard_named' });
  });

  it('hides an anonymous submitter from a role without either permission', () => {
    const out = redactTicketForViewer(viewer('gatekeeper'), anonymous);
    expect(out).toMatchObject({ submitterName: 'ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)' });
    for (const field of [
      'submitterEmployeeId',
      'submitterDepartment',
      'submitterPhone',
      'submitterEmail',
      'loginEmail',
    ] as const) {
      expect(out[field]).toBeUndefined();
    }
  });

  it('shows only the login email of an anonymous submitter with canViewAnonymousSubmitterEmail', () => {
    const out = redactTicketForViewer(viewer('executive'), anonymous);
    expect(out.loginEmail).toBe('somying@ube.com');
    expect(out.submitterEmployeeId).toBeUndefined();
  });

  it('shows everything to a role with both permissions (admin)', () => {
    expect(redactTicketForViewer(viewer('admin'), anonymous)).toEqual(anonymous);
    expect(redactTicketForViewer(viewer('admin'), confidential)).toBe(confidential);
  });

  it('blanks a confidential submitter and their timeline name without canViewConfidentialIdentities', () => {
    const out = redactTicketForViewer(viewer('executive'), confidential);
    expect(out.submitterName).toBeUndefined();
    expect(out.loginEmail).toBeUndefined();
    expect(out.timeline.map((l) => l.actor)).toEqual([
      PROTECTED_ACTOR_NAME,
      'Gatekeeper Supervisor',
    ]);
  });
});

describe('redactNotificationForViewer', () => {
  it('keeps the recipient email only for its recipient', () => {
    const n = {
      id: 'n1',
      ticketId: 't1',
      trackingCode: 'TK-1',
      title: 't',
      message: 'm',
      timestamp: '2026-10-09T00:00:00Z',
      read: false,
      type: 'status_update' as const,
      recipientEmail: 'Me@ube.com',
    };
    expect(redactNotificationForViewer({ email: 'me@ube.com' }, n)).toBe(n);
    expect(redactNotificationForViewer({ email: 'x@ube.com' }, n).recipientEmail).toBeUndefined();
  });
});

describe('isNotificationForViewer', () => {
  const employee = { email: 'Somchai@ube.com', role: 'employee' as const };
  const gatekeeper = { email: 'gk@ube.com', role: 'gatekeeper' as const };
  const toSubmitter = {
    type: 'chat_message' as const,
    recipientRole: 'employee' as const,
    recipientEmail: 'somchai@ube.com',
  };
  const toStaff = { type: 'chat_message' as const, recipientRole: 'gatekeeper' as const };

  it('sends a staff chat message to the submitter only, never back to the staff', () => {
    expect(isNotificationForViewer(employee, toSubmitter)).toBe(true);
    expect(isNotificationForViewer(gatekeeper, toSubmitter)).toBe(false);
  });

  it('sends a submitter reply to staff only, never back to the submitter', () => {
    expect(isNotificationForViewer(gatekeeper, toStaff)).toBe(true);
    expect(isNotificationForViewer(employee, toStaff)).toBe(false);
  });

  it('shows a CSAT rating to staff only, not back to the submitter who gave it', () => {
    const rated = { type: 'evaluation_submitted' as const, recipientRole: 'gatekeeper' as const };
    expect(isNotificationForViewer(gatekeeper, rated)).toBe(true);
    expect(isNotificationForViewer(employee, rated)).toBe(false);
  });

  it('leaves every other notification to ticket visibility', () => {
    expect(
      isNotificationForViewer(gatekeeper, { type: 'status_update', recipientRole: 'employee' })
    ).toBe(true);
  });

  // Role x notification type, with the seeded RBAC matrix: only executive and admin hold
  // canViewDirectCeoTickets. The bell list is exactly these rows: the shell filters nothing.
  describe('role x notification type (default RBAC matrix)', () => {
    const rows = {
      new_ticket: { type: 'new_ticket', recipientRole: 'employee', recipientEmail: 'me@ube.com' },
      status_update: {
        type: 'status_update',
        recipientRole: 'employee',
        recipientEmail: 'me@ube.com',
      },
      satisfaction_pending: {
        type: 'satisfaction_pending',
        recipientRole: 'employee',
        recipientEmail: 'me@ube.com',
      },
      direct_ceo_alert: { type: 'direct_ceo_alert', recipientRole: 'executive' },
      chat_message_to_staff: { type: 'chat_message', recipientRole: 'gatekeeper' },
      evaluation_submitted: { type: 'evaluation_submitted', recipientRole: 'gatekeeper' },
    } as const;

    // Columns: employee, gatekeeper, executive, admin. (A staff reply to the submitter is
    // addressed by email, covered above.)
    const table: [keyof typeof rows, boolean, boolean, boolean, boolean][] = [
      ['new_ticket', true, true, true, true],
      ['status_update', true, true, true, true],
      ['satisfaction_pending', true, true, true, true],
      ['direct_ceo_alert', false, false, true, true],
      ['chat_message_to_staff', false, true, true, true],
      ['evaluation_submitted', false, true, true, true],
    ];

    it.each(table)('%s: employee %s, gatekeeper %s, executive %s, admin %s', (name, ...shown) => {
      const roles: UserRole[] = ['employee', 'gatekeeper', 'executive', 'admin'];
      expect(roles.map((role) => isNotificationForViewer(viewer(role), rows[name]))).toEqual(shown);
    });
  });

  describe('the direct-to-CEO alert follows canViewDirectCeoTickets, not the role name', () => {
    const alert = { type: 'direct_ceo_alert' as const, recipientRole: 'executive' as const };

    it('reaches a gatekeeper or employee granted the flag, and never an executive denied it', () => {
      expect(
        isNotificationForViewer(viewer('gatekeeper', { canViewDirectCeoTickets: true }), alert)
      ).toBe(true);
      expect(
        isNotificationForViewer(viewer('employee', { canViewDirectCeoTickets: true }), alert)
      ).toBe(true);
      expect(
        isNotificationForViewer(viewer('executive', { canViewDirectCeoTickets: false }), alert)
      ).toBe(false);
    });

    it('is withheld from a role without a RoleAccessConfigs row (deny by default)', () => {
      expect(isNotificationForViewer({ ...viewer('executive'), config: undefined }, alert)).toBe(
        false
      );
    });

    it('also holds back any other row addressed to the executive audience', () => {
      const toExecutive = { type: 'new_ticket' as const, recipientRole: 'executive' as const };
      expect(isNotificationForViewer(viewer('gatekeeper'), toExecutive)).toBe(false);
      expect(isNotificationForViewer(viewer('executive'), toExecutive)).toBe(true);
    });
  });
});

describe('ticketViewFor (what the screens render, decided by the server)', () => {
  const ticket = (isDirectToExecutive: boolean, category: ComplaintTicket['category'] = 'HR') => ({
    isDirectToExecutive,
    category,
  });

  it('lists a ticket in the inbox unless direct-to-CEO isolation or the gatekeeper scope removes it', () => {
    const gk = viewer('gatekeeper', { assignedDepartments: ['HR'] });
    expect(ticketViewFor(gk, ticket(false, 'HR')).inTriageScope).toBe(true);
    expect(ticketViewFor(gk, ticket(false, 'Quality')).inTriageScope).toBe(false);
    expect(ticketViewFor(gk, ticket(true, 'HR')).inTriageScope).toBe(false);
    const granted = viewer('gatekeeper', {
      assignedDepartments: ['HR'],
      canViewDirectCeoTickets: true,
    });
    expect(ticketViewFor(granted, ticket(true, 'HR')).inTriageScope).toBe(true);
    // The category scope applies to gatekeepers only.
    expect(ticketViewFor(viewer('executive'), ticket(false, 'Quality')).inTriageScope).toBe(true);
    expect(ticketViewFor(viewer('executive'), ticket(true)).inTriageScope).toBe(true);
    const deniedAdmin = viewer('admin', { canViewDirectCeoTickets: false });
    expect(ticketViewFor(deniedAdmin, ticket(true)).inTriageScope).toBe(false);
  });

  it('restricts a direct-to-CEO ticket for a gatekeeper without the flag only', () => {
    expect(ticketViewFor(viewer('gatekeeper'), ticket(true)).restricted).toBe(true);
    expect(ticketViewFor(viewer('gatekeeper'), ticket(false)).restricted).toBe(false);
    const granted = viewer('gatekeeper', { canViewDirectCeoTickets: true });
    expect(ticketViewFor(granted, ticket(true)).restricted).toBe(false);
    // Other roles are never shown the restricted screen, even without the flag.
    expect(ticketViewFor(viewer('employee'), ticket(true)).restricted).toBe(false);
    const deniedExecutive = viewer('executive', { canViewDirectCeoTickets: false });
    expect(ticketViewFor(deniedExecutive, ticket(true)).restricted).toBe(false);
  });

  it('unmasks identities and the anonymous login email per the role flags', () => {
    const roles: UserRole[] = ['employee', 'gatekeeper', 'executive', 'admin'];
    const facts = roles.map((role) => {
      const { identityShown, anonymousEmailShown } = ticketViewFor(viewer(role), ticket(false));
      return [identityShown, anonymousEmailShown];
    });
    expect(facts).toEqual([
      [false, false],
      [false, false],
      [false, true],
      [true, true],
    ]);
    const noRow = { ...viewer('admin'), config: undefined };
    expect(ticketViewFor(noRow, ticket(false))).toMatchObject({
      identityShown: false,
      anonymousEmailShown: false,
    });
  });

  it('is attached to every ticket by presentTicketForViewer', () => {
    const gk = viewer('gatekeeper');
    const direct = { ...INITIAL_COMPLAINTS[0], isDirectToExecutive: true };
    expect(presentTicketForViewer(gk, direct).view).toEqual(ticketViewFor(gk, direct));
  });
});
