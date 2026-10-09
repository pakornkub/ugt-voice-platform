'use server';

// lib/actions/directory.ts — HR-view lookups for the roster screens (decisions.md 2026-10-09).
// Only roles that may edit rosters / the RBAC matrix can search the employee directory.
import { listDirectoryPage, searchDirectory } from '@/lib/directory';
import { RBAC_TABS, requireTab, ROSTER_TABS } from '@/lib/tab-guard';
import type { EmployeeRecord } from '@/types';

/** HR-view suggestions for the roster "name" fields (HrNameField). */
export async function searchHrEmployees(query: string): Promise<EmployeeRecord[]> {
  await requireTab(ROSTER_TABS);
  return searchDirectory(String(query).slice(0, 100));
}

/** The RBAC page's read-only employee table (search + paging). */
export async function getDirectoryPage(
  query: string,
  page: number
): Promise<{ rows: EmployeeRecord[]; total: number; pageSize: number }> {
  await requireTab(RBAC_TABS);
  return listDirectoryPage(String(query).slice(0, 100), Number(page) || 0);
}
