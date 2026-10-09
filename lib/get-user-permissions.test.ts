import { beforeEach, describe, expect, it, vi } from 'vitest';

const findUnique = vi.fn();
const resolveViewer = vi.fn();
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));
vi.mock('@/lib/ticket-access', () => ({ resolveViewer }));
const testEnv = vi.hoisted(() => ({ NEXT_PUBLIC_BASE_PATH: '/ugt-voice-platform-dev' }));
vi.mock('@/lib/env', () => ({ env: testEnv }));

describe('permissionsFor', () => {
  it('gives every role attachments and follows the RBAC tabs for users / audit logs', async () => {
    const { permissionsFor } = await import('./get-user-permissions');
    const { PERMISSIONS } = await import('./permissions');
    expect(permissionsFor('employee', ['submit'])).toEqual([
      PERMISSIONS.FILES_CREATE,
      PERMISSIONS.FILES_READ,
    ]);
    expect(permissionsFor('gatekeeper', ['admin_audit_logs'])).toContain(
      PERMISSIONS.AUDIT_LOGS_READ
    );
  });

  it('gives admin the system keys but never USERS_UPDATE, and tab keys only when ticked', async () => {
    const { permissionsFor } = await import('./get-user-permissions');
    const { PERMISSIONS } = await import('./permissions');
    const withoutTabs = permissionsFor('admin', []);
    expect(withoutTabs).toContain(PERMISSIONS.DEV_MODE);
    expect(withoutTabs).not.toContain(PERMISSIONS.USERS_READ);
    expect(withoutTabs).not.toContain(PERMISSIONS.AUDIT_LOGS_READ);
    const withTabs = permissionsFor('admin', ['admin_users', 'admin_audit_logs']);
    expect(withTabs).toEqual(
      expect.arrayContaining([PERMISSIONS.USERS_READ, PERMISSIONS.AUDIT_LOGS_READ])
    );
    expect(withTabs).not.toContain(PERMISSIONS.USERS_UPDATE);
  });
});

describe('mail dev mode', () => {
  it('is granted to admin only on the dev environment', async () => {
    const { permissionsFor } = await import('./get-user-permissions');
    const { PERMISSIONS } = await import('./permissions');
    expect(permissionsFor('admin', [])).toContain(PERMISSIONS.DEV_MODE);
    testEnv.NEXT_PUBLIC_BASE_PATH = '/ugt-voice-platform';
    expect(permissionsFor('admin', [])).not.toContain(PERMISSIONS.DEV_MODE);
    testEnv.NEXT_PUBLIC_BASE_PATH = '/ugt-voice-platform-dev';
  });
});

describe('getUserPermissions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('denies everything for an unknown user', async () => {
    const { getUserPermissions } = await import('./get-user-permissions');
    findUnique.mockResolvedValue(null);
    await expect(getUserPermissions('u1')).resolves.toEqual([]);
    expect(resolveViewer).not.toHaveBeenCalled();
  });

  it('derives keys from the roster role and its RBAC config', async () => {
    const { getUserPermissions } = await import('./get-user-permissions');
    const { PERMISSIONS } = await import('./permissions');
    findUnique.mockResolvedValue({ email: 'a@ube.co.th' });
    resolveViewer.mockResolvedValue({
      role: 'executive',
      config: { allowedTabs: ['admin_users'] },
    });
    await expect(getUserPermissions('u1')).resolves.toContain(PERMISSIONS.USERS_READ);
    expect(resolveViewer).toHaveBeenCalledWith({ user: { id: 'u1', email: 'a@ube.co.th' } });
  });
});
