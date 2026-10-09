import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireTab: vi.fn(),
  searchDirectory: vi.fn(),
  listDirectoryPage: vi.fn(),
}));
vi.mock('@/lib/tab-guard', () => ({
  requireTab: mocks.requireTab,
  ROSTER_TABS: ['admin_gatekeeper', 'rbac_management'],
  RBAC_TABS: ['rbac_management'],
}));
vi.mock('@/lib/directory', () => ({
  searchDirectory: mocks.searchDirectory,
  listDirectoryPage: mocks.listDirectoryPage,
}));

const { getDirectoryPage, searchHrEmployees } = await import('./directory');

describe('directory actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('search needs a roster tab and caps the query length', async () => {
    mocks.searchDirectory.mockResolvedValue([]);
    await searchHrEmployees('x'.repeat(500));
    expect(mocks.requireTab).toHaveBeenCalledWith(['admin_gatekeeper', 'rbac_management']);
    expect(mocks.searchDirectory.mock.calls[0][0]).toHaveLength(100);
  });

  it('paging needs the RBAC tab and coerces a bad page to 0', async () => {
    await getDirectoryPage('a', Number.NaN);
    expect(mocks.requireTab).toHaveBeenCalledWith(['rbac_management']);
    expect(mocks.listDirectoryPage).toHaveBeenCalledWith('a', 0);
  });

  it('stops at the guard', async () => {
    mocks.requireTab.mockRejectedValueOnce(new Error('FORBIDDEN'));
    await expect(searchHrEmployees('ab')).rejects.toThrow('FORBIDDEN');
    expect(mocks.searchDirectory).not.toHaveBeenCalled();
  });
});
