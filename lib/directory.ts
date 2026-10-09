// lib/directory.ts — read-only employee directory on the HR view (linked server thrygsd002).
// Server-only: import from Server Actions / Server Components, never from a Client Component.
// Matching rule (decisions.md 2026-10-09 "App role comes from the people rosters"):
// session email → CurrentEmail, fallback ADLoginName (bare or DOMAIN\ prefixed).
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { EmployeeRecord } from '@/types';

const HR_VIEW = Prisma.raw('[thrygsd002].[ICTPortal_PRD].[dbo].[vwHR_SC_Employee]');
const COLUMNS = Prisma.raw(
  'EmpCode, FullNameEng, FullNameThai, PostNameEng, OrgNameThai, CurrentEmail, ADLoginName, workstatus'
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
  return input.replace(/[[%_]/g, (ch) => `[${ch}]`);
}

/** Active employee whose CurrentEmail or AD login matches the session email, or null. */
export async function findEmployeeByLogin(email: string): Promise<EmployeeRecord | null> {
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
}

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
