// lib/permissions-sync.ts — ugt-nextjs-auth-setup, 2026-09-02.
import { generateId } from 'better-auth';
import { prisma } from '@/lib/prisma';
import { ALL_PERMISSIONS } from '@/lib/permissions';

/**
 * Upsert every entry in ALL_PERMISSIONS into the Permission table. Safe to
 * call on every request — only inserts new keys / updates label+group on
 * existing ones, never deletes a permission removed from the constant (that
 * needs a manual decision — see references/rbac.md in the skill).
 *
 * Called from the admin section's layout guard so a newly-added permission
 * applies the moment anyone opens an admin page — no manual migration step.
 */
export async function syncPermissionsIfNeeded(): Promise<void> {
  await prisma.$transaction(
    ALL_PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: { label: p.label, group: p.group },
        create: { id: generateId(24), ...p },
      })
    )
  );
}
