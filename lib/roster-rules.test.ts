import { describe, expect, it } from 'vitest';
import {
  buildNewOfficer,
  checkHrAdminRemoval,
  checkOfficerRoster,
  countOtherActiveAdmins,
  hrAdminChangeLosesAdmin,
  newOfficerId,
  removeOfficer,
  withSingleLead,
} from './roster-rules';

const lead = { id: 'a', isLead: true };
const plain = { id: 'b', isLead: false };
const other = { id: 'c', isLead: false };

describe('checkOfficerRoster (current roster + requested roster → rejection code | null)', () => {
  it.each([
    ['keeps everyone', [lead, plain], [lead, plain], null],
    ['adds an officer', [lead], [lead, plain], null],
    ['removes a non-lead', [lead, plain], [lead], null],
    ['hands the lead over and keeps the old one', [lead, plain], [plain, lead], null],
    ['empties the roster', [lead, plain], [], 'LAST_OFFICER'],
    ['removes the only officer', [lead], [], 'LAST_OFFICER'],
    ['drops the lead', [lead, plain], [plain], 'CANNOT_REMOVE_LEAD'],
    ['drops the lead while adding someone', [lead, plain], [plain, other], 'CANNOT_REMOVE_LEAD'],
    ['has no flagged lead stored', [{ id: 'a' }, plain], [plain], null],
  ] as const)('%s', (_name, current, next, expected) => {
    expect(checkOfficerRoster(current, next)).toBe(expected);
  });
});

describe('removeOfficer', () => {
  it('returns the roster without the officer', () => {
    expect(removeOfficer([lead, plain, other], 'b')).toEqual({ ok: true, officers: [lead, other] });
  });

  it.each([
    ['the only officer', [lead], 'a', 'LAST_OFFICER'],
    ['the lead', [lead, plain], 'a', 'CANNOT_REMOVE_LEAD'],
    ['an unknown id', [lead, plain], 'zzz', 'NOT_FOUND'],
  ] as const)('refuses %s', (_name, officers, id, code) => {
    expect(removeOfficer(officers, id)).toEqual({ ok: false, code });
  });
});

describe('withSingleLead', () => {
  const roster = [
    { id: 'a', isLead: true },
    { id: 'b', isLead: false },
    { id: 'c', isLead: true },
  ];
  const leads = (leadId?: string) =>
    withSingleLead(roster, leadId)
      .filter((o) => o.isLead)
      .map((o) => o.id);

  it.each([
    ['the requested lead wins', 'b', ['b']],
    ['else the first flagged one', undefined, ['a']],
    ['an unknown request falls back to the flagged one', 'zzz', ['a']],
  ] as const)('%s', (_name, leadId, expected) => {
    expect(leads(leadId)).toEqual(expected);
  });

  it('falls back to the first officer when none is flagged', () => {
    expect(withSingleLead([{ id: 'x', isLead: false }, plain])[0].isLead).toBe(true);
  });
});

describe('new officers', () => {
  it('mints usr-<category>-<epoch ms>', () => {
    expect(newOfficerId('Harassment', 1700000000000)).toBe('usr-harassment-1700000000000');
  });

  it('trims the form, defaults the role title and never makes the lead', () => {
    expect(
      buildNewOfficer(
        'HR',
        { name: ' Somchai ', email: ' s@ube.com ', roleTitle: '  ', phone: ' ' },
        5
      )
    ).toEqual({
      id: 'usr-hr-5',
      name: 'Somchai',
      email: 's@ube.com',
      roleTitle: 'Gatekeeper Specialist',
      phone: undefined,
      isLead: false,
    });
    expect(
      buildNewOfficer('Quality', { name: 'A', email: 'a@b', roleTitle: ' QA ', phone: ' 081 ' }, 5)
    ).toMatchObject({ roleTitle: 'QA', phone: '081' });
  });
});

describe('HR-admin lock-out rules', () => {
  const removal = (targetEmail: string, myEmails: string[], otherActiveAdmins: number) =>
    checkHrAdminRemoval({ targetEmail, myEmails, otherActiveAdmins });

  it.each([
    ['another admin while someone else stays', 'x@ube.com', ['me@ube.com'], 1, null],
    ['yourself', 'me@ube.com', ['me@ube.com'], 3, 'CANNOT_REMOVE_SELF'],
    [
      'yourself, spelled with the other domain',
      'ME@ube.co.th',
      ['me@ube.com'],
      3,
      'CANNOT_REMOVE_SELF',
    ],
    [
      'yourself through the HR-view alias',
      'alias@ube.com',
      ['me@ube.com', 'alias@ube.com'],
      3,
      'CANNOT_REMOVE_SELF',
    ],
    ['the last active admin', 'x@ube.com', ['me@ube.com'], 0, 'LAST_ADMIN'],
    [
      'yourself as the last admin reports self first',
      'me@ube.com',
      ['me@ube.com'],
      0,
      'CANNOT_REMOVE_SELF',
    ],
  ] as const)('%s', (_name, target, mine, others, expected) => {
    expect(removal(target, [...mine], others)).toBe(expected);
  });

  it('counts only other, active, live admins', () => {
    const admins = [
      { id: '1', status: 'active' },
      { id: '2', status: 'active' },
      { id: '3', status: 'inactive' },
      { id: '4', status: 'active', isActive: false },
    ];
    expect(countOtherActiveAdmins(admins, '1')).toBe(1);
    expect(countOtherActiveAdmins(admins, '3')).toBe(2);
    expect(countOtherActiveAdmins([admins[0]], '1')).toBe(0);
  });

  it.each([
    ['deactivating an active admin', { status: 'inactive' }, true],
    ['re-activating', { status: 'active' }, false],
    ['deactivating an already inactive admin', { status: 'inactive', current: 'inactive' }, false],
    ['pointing the row at another email', { email: 'new@ube.com' }, true],
    ['the same email in another spelling', { email: 'OLD@ube.co.th' }, false],
    ['a plain field edit', {}, false],
  ] as const)('losing admin rights: %s', (_name, change, expected) => {
    const current = {
      email: 'old@ube.com',
      status: 'current' in change ? change.current : 'active',
    };
    expect(hrAdminChangeLosesAdmin(current, change)).toBe(expected);
  });
});
