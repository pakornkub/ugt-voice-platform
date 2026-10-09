import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryRaw = vi.fn();
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: queryRaw } }));

const row = {
  EmpCode: ' 01234 ',
  FullNameEng: 'Pakorn W.',
  FullNameThai: 'ปกรณ์ ว.',
  PostNameEng: 'Developer',
  OrgNameThai: 'ไอที',
  CurrentEmail: 'Pakornwo@UBE.co.th',
  ADLoginName: 'UBE\\pakornwo',
  workstatus: 'Active',
};

/** Interpolations of the tagged template — Prisma binds plain values as SQL parameters. */
const boundValues = () => (queryRaw.mock.calls[0] as unknown[]).slice(1);

describe('directory', () => {
  beforeEach(() => queryRaw.mockReset());

  it('maps an HR row to an EmployeeRecord', async () => {
    const { toEmployeeRecord } = await import('./directory');
    expect(toEmployeeRecord(row)).toEqual({
      employeeId: '01234',
      nameTh: 'ปกรณ์ ว.',
      nameEn: 'Pakorn W.',
      loginEmail: 'pakornwo@ube.co.th',
      department: 'ไอที',
      position: 'Developer',
      phone: '',
      status: 'active',
    });
    expect(toEmployeeRecord({ ...row, FullNameThai: null, workstatus: 'Resign' })).toMatchObject({
      nameTh: 'Pakorn W.',
      status: 'inactive',
    });
  });

  it('escapes LIKE wildcards', async () => {
    const { escapeLike } = await import('./directory');
    expect(escapeLike('50%_[x]')).toBe('50[%][_][[]x]');
  });

  it('finds by login with email, bare AD name and DOMAIN\\ name as bound parameters', async () => {
    const { findEmployeeByLogin } = await import('./directory');
    queryRaw.mockResolvedValue([row]);
    await expect(findEmployeeByLogin(' Pakornwo@ube.co.th ')).resolves.toMatchObject({
      employeeId: '01234',
    });
    expect(boundValues()).toEqual(
      expect.arrayContaining(['pakornwo@ube.co.th', 'pakornwo', '\\pakornwo'])
    );
  });

  it('returns null for blank input or no match without querying blanks', async () => {
    const { findEmployeeByLogin, findEmployeeByCode } = await import('./directory');
    await expect(findEmployeeByLogin('  ')).resolves.toBeNull();
    await expect(findEmployeeByCode('')).resolves.toBeNull();
    expect(queryRaw).not.toHaveBeenCalled();
    queryRaw.mockResolvedValue([]);
    await expect(findEmployeeByCode('999')).resolves.toBeNull();
  });

  it('searches with an escaped pattern and skips one-character queries', async () => {
    const { searchDirectory } = await import('./directory');
    await expect(searchDirectory('a')).resolves.toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
    queryRaw.mockResolvedValue([row]);
    await expect(searchDirectory('ปก%')).resolves.toHaveLength(1);
    expect(boundValues()).toContain('%ปก[%]%');
  });

  it('maps HR status per email, preferring an active row, and skips the query for no emails', async () => {
    const { hrStatusByEmails } = await import('./directory');
    await expect(hrStatusByEmails([' '])).resolves.toEqual({});
    expect(queryRaw).not.toHaveBeenCalled();
    queryRaw.mockResolvedValue([
      { email: 'a@ube.co.th', workstatus: 'Resign' },
      { email: 'a@ube.co.th', workstatus: 'Active' },
      { email: 'b@ube.co.th', workstatus: 'Resign' },
    ]);
    await expect(hrStatusByEmails(['A@ube.co.th', 'b@ube.co.th'])).resolves.toEqual({
      'a@ube.co.th': 'active',
      'b@ube.co.th': 'inactive',
    });
  });

  it('pages the directory with an escaped filter and a numeric total', async () => {
    const { listDirectoryPage } = await import('./directory');
    queryRaw.mockResolvedValueOnce([row]).mockResolvedValueOnce([{ total: 41n }]);
    await expect(listDirectoryPage('ปก_', 2)).resolves.toMatchObject({
      total: 41,
      pageSize: 20,
      rows: [{ employeeId: '01234' }],
    });
    const sql = JSON.stringify(queryRaw.mock.calls[0]);
    expect(sql).toContain('%ปก[_]%');
    expect(sql).toContain('40');
  });
});
