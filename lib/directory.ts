// lib/directory.ts — read-only employee directory on the HR view (linked server thrygsd002).
// Server-only: import from Server Actions / Server Components, never from a Client Component.
// Matching rule (decisions.md 2026-10-09 "App role comes from the people rosters"):
// session email → CurrentEmail, fallback ADLoginName (bare or DOMAIN\ prefixed).
import 'server-only';
import { cache } from 'react';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { EmployeeRecord } from '@/types';

const HR_VIEW = Prisma.raw('[thrygsd002].[ICTPortal_PRD].[dbo].[vwHR_SC_Employee]');
// CAST every column read across the linked server — its type metadata is unreliable (DB rules).
const COLUMNS = Prisma.raw(
  [
    'CAST(EmpCode AS NVARCHAR(50)) AS EmpCode',
    'CAST(FullNameEng AS NVARCHAR(200)) AS FullNameEng',
    'CAST(FullNameThai AS NVARCHAR(200)) AS FullNameThai',
    'CAST(PostNameEng AS NVARCHAR(300)) AS PostNameEng',
    'CAST(OrgNameThai AS NVARCHAR(300)) AS OrgNameThai',
    'CAST(CurrentEmail AS NVARCHAR(200)) AS CurrentEmail',
    'CAST(ADLoginName AS NVARCHAR(200)) AS ADLoginName',
    'CAST(workstatus AS NVARCHAR(50)) AS workstatus',
  ].join(', ')
);
const SEARCH_LIMIT = 20;

export interface HrEmployeeRow {
  EmpCode: string;
  FullNameEng: string | null;
  FullNameThai: string | null;
  PostNameEng: string | null;
  OrgNameThai: string | null;
  CurrentEmail: string | null;
  ADLoginName: string | null;
  workstatus: string | null;
}

export function toEmployeeRecord(row: HrEmployeeRow): EmployeeRecord {
  const nameEn = row.FullNameEng?.trim() ?? '';
  return {
    employeeId: row.EmpCode.trim(),
    nameTh: row.FullNameThai?.trim() || nameEn,
    nameEn,
    loginEmail: row.CurrentEmail?.trim().toLowerCase() ?? '',
    department: row.OrgNameThai?.trim() ?? '',
    position: row.PostNameEng?.trim() ?? '',
    phone: '', // ponytail: the HR view has no phone column
    status: row.workstatus?.trim().toLowerCase() === 'active' ? 'active' : 'inactive',
  };
}

/** Escapes LIKE wildcards so user input is matched literally (T-SQL bracket escaping). */
export function escapeLike(input: string): string {
  return input.replaceAll(/[[%_]/g, (ch) => `[${ch}]`);
}

/** Active employee whose CurrentEmail or AD login matches the session email, or null.
 * cache(): the layout and the role lookup ask for the same person in one request. */
export const findEmployeeByLogin = cache(async (email: string): Promise<EmployeeRecord | null> => {
  const login = email.trim().toLowerCase();
  if (!login) return null;
  const local = login.split('@')[0];
  const rows = await prisma.$queryRaw<HrEmployeeRow[]>`
    SELECT TOP 1 ${COLUMNS} FROM ${HR_VIEW}
    WHERE workstatus = 'Active'
      AND (LOWER(CurrentEmail) = ${login}
        OR LOWER(ADLoginName) IN (${login}, ${local})
        OR LOWER(RIGHT(ADLoginName, LEN(${local}) + 1)) = ${'\\' + local})
    ORDER BY CASE WHEN LOWER(CurrentEmail) = ${login} THEN 0 ELSE 1 END`;
  return rows[0] ? toEmployeeRecord(rows[0]) : null;
});

/** Active employee by employee code, or null. */
export async function findEmployeeByCode(code: string): Promise<EmployeeRecord | null> {
  const empCode = code.trim();
  if (!empCode) return null;
  const rows = await prisma.$queryRaw<HrEmployeeRow[]>`
    SELECT TOP 1 ${COLUMNS} FROM ${HR_VIEW}
    WHERE workstatus = 'Active' AND EmpCode = ${empCode}`;
  return rows[0] ? toEmployeeRecord(rows[0]) : null;
}

/** Active employees matching name (TH/EN), code, email or department — for the roster pickers. */
export async function searchDirectory(query: string): Promise<EmployeeRecord[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const pattern = `%${escapeLike(q)}%`;
  const rows = await prisma.$queryRaw<HrEmployeeRow[]>`
    SELECT TOP (${SEARCH_LIMIT}) ${COLUMNS} FROM ${HR_VIEW}
    WHERE workstatus = 'Active'
      AND (FullNameThai LIKE ${pattern} OR FullNameEng LIKE ${pattern} OR EmpCode LIKE ${pattern}
        OR CurrentEmail LIKE ${pattern} OR ADLoginName LIKE ${pattern} OR OrgNameThai LIKE ${pattern})
    ORDER BY FullNameEng`;
  return rows.map(toEmployeeRecord);
}

export type HrStatus = 'active' | 'inactive';

/** HR-view status per roster email (missing key = not in the HR view) — for the roster badges.
 * Same matching as findEmployeeByLogin: CurrentEmail, else the AD login (bare or DOMAIN\) equal to
 * the email or its local part — a roster email from SSO (e.g. @ube.com) still finds its HR row. */
export async function hrStatusByEmails(
  emails: readonly string[]
): Promise<Record<string, HrStatus>> {
  const wanted = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (wanted.length === 0) return {};
  const logins = [...new Set([...wanted, ...wanted.map((e) => e.split('@')[0])])];
  // ponytail: IN lists — rosters are tens of rows, far below SQL Server's 2100-parameter cap.
  const rows = await prisma.$queryRaw<
    { email: string | null; adLogin: string | null; workstatus: string | null }[]
  >`
    SELECT CAST(LOWER(CurrentEmail) AS NVARCHAR(200)) AS email,
      CAST(LOWER(SUBSTRING(ADLoginName, CHARINDEX('\\', ADLoginName) + 1, 200)) AS NVARCHAR(200)) AS adLogin,
      CAST(workstatus AS NVARCHAR(50)) AS workstatus FROM ${HR_VIEW}
    WHERE LOWER(CurrentEmail) IN (${Prisma.join(wanted)})
      OR LOWER(SUBSTRING(ADLoginName, CHARINDEX('\\', ADLoginName) + 1, 200)) IN (${Prisma.join(logins)})`;
  const result: Record<string, HrStatus> = {};
  for (const email of wanted) {
    const local = email.split('@')[0];
    const matches = rows.filter(
      (r) => r.email === email || r.adLogin === email || r.adLogin === local
    );
    if (matches.length === 0) continue;
    // An active row wins over an old inactive one for the same person.
    result[email] = matches.some((r) => r.workstatus?.trim().toLowerCase() === 'active')
      ? 'active'
      : 'inactive';
  }
  return result;
}

const PAGE_SIZE = 20;

/** One page of active employees (RBAC page's read-only employee table), optionally filtered. */
export async function listDirectoryPage(
  query: string,
  page: number
): Promise<{ rows: EmployeeRecord[]; total: number; pageSize: number }> {
  const q = query.trim();
  const pattern = `%${escapeLike(q)}%`;
  const filter = q
    ? Prisma.sql`AND (FullNameThai LIKE ${pattern} OR FullNameEng LIKE ${pattern} OR EmpCode LIKE ${pattern}
        OR CurrentEmail LIKE ${pattern} OR OrgNameThai LIKE ${pattern})`
    : Prisma.empty;
  const offset = Math.max(0, Math.floor(page)) * PAGE_SIZE;
  const [rows, count] = await Promise.all([
    prisma.$queryRaw<HrEmployeeRow[]>`
      SELECT ${COLUMNS} FROM ${HR_VIEW} WHERE workstatus = 'Active' ${filter}
      ORDER BY EmpCode OFFSET ${offset} ROWS FETCH NEXT ${PAGE_SIZE} ROWS ONLY`,
    prisma.$queryRaw<{ total: number | bigint }[]>`
      SELECT COUNT(*) AS total FROM ${HR_VIEW} WHERE workstatus = 'Active' ${filter}`,
  ]);
  return {
    rows: rows.map(toEmployeeRecord),
    total: Number(count[0]?.total ?? 0),
    pageSize: PAGE_SIZE,
  };
}
