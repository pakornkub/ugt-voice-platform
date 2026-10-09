import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

describe('permissionsForAppRole', () => {
  it('gives admin every permission and other roles attachment access only', async () => {
    const { permissionsForAppRole } = await import('./get-user-permissions');
    const { PERMISSIONS } = await import('./permissions');
    expect(permissionsForAppRole('admin')).toEqual(Object.values(PERMISSIONS));
    for (const role of ['employee', 'gatekeeper', 'executive']) {
      expect(permissionsForAppRole(role)).toEqual([
        PERMISSIONS.FILES_CREATE,
        PERMISSIONS.FILES_READ,
      ]);
    }
  });

  it('denies everything when no app role is assigned', async () => {
    const { permissionsForAppRole } = await import('./get-user-permissions');
    expect(permissionsForAppRole(null)).toEqual([]);
    expect(permissionsForAppRole('unknown')).toEqual([]);
  });
});
