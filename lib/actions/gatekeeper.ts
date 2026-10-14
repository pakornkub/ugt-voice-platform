'use server';

// lib/actions/gatekeeper.ts — per-department gatekeeper configs and their officer rosters
// (DepartmentGatekeeperConfigs + GatekeeperOfficers). Being an officer of any category makes a
// person a `gatekeeper` (lib/roster-role.ts), so writes are guarded. The upstream screen saves a
// whole department at once (officers list + lead); the server diffs that list against the DB:
// unknown ids are created, missing ones soft-deleted, the rest updated.
import { z } from 'zod';
import { normalizeEmail } from '@/lib/email-identity';
import { prisma } from '@/lib/prisma';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import { requireTab, ROSTER_TABS, writeAudit } from '@/lib/tab-guard';
import { checkOfficerRoster, withSingleLead } from '@/lib/roster-rules';
import { requireTicketViewer } from '@/lib/ticket-access';
import { INITIAL_GATEKEEPER_CONFIGS } from '@/mockData';
import { mapDepartmentConfig } from './mappers';
import type { DepartmentGatekeeperConfig, GrievanceCategory } from '@/types';

const LIVE = { isDeleted: false } as const;
const CONFIG_INCLUDE = { officers: { where: LIVE, orderBy: { createdAt: 'asc' as const } } };

const Category = z.enum(['HR', 'Compliance', 'Ethics', 'Fraud', 'Harassment', 'Quality']);

const OfficerFields = z.object({
  id: z.string().max(100),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()).transform(normalizeEmail),
  roleTitle: z.string().trim().max(300),
  phone: z.string().trim().max(50).optional(),
  isLead: z.boolean(),
  avatarUrl: z.string().trim().max(500).optional(),
});

const ConfigFields = z.object({
  departmentName: z.string().trim().min(1).max(300),
  departmentCode: z.string().trim().max(50),
  autoAssignMode: z.enum(['off', 'round_robin', 'lead_manual', 'workload_balanced']),
  escalationEmail: z.string().trim().max(200).optional(),
  notificationWebhookUrl: z.union([z.literal(''), z.url().max(500)]).optional(),
  // An empty list is refused by checkOfficerRoster (LAST_OFFICER), the code the screen maps.
  officers: z.array(OfficerFields).max(100),
  leadOfficer: z.object({ id: z.string() }).loose().optional(),
});

async function listConfigs(): Promise<Record<GrievanceCategory, DepartmentGatekeeperConfig>> {
  const rows = await prisma.departmentGatekeeperConfig.findMany({
    where: LIVE,
    include: CONFIG_INCLUDE,
  });
  const result = {} as Record<GrievanceCategory, DepartmentGatekeeperConfig>;
  for (const row of rows) result[row.category as GrievanceCategory] = mapDepartmentConfig(row);
  return result;
}

/** Read by every signed-in role (inbox officer lists, submit form routing). */
export async function getDepartmentGatekeeperConfigs(): Promise<
  Record<GrievanceCategory, DepartmentGatekeeperConfig>
> {
  await requireTicketViewer();
  return listConfigs();
}

export async function updateDepartmentGatekeeperConfig(
  category: GrievanceCategory,
  updates: Partial<DepartmentGatekeeperConfig>
): Promise<Record<GrievanceCategory, DepartmentGatekeeperConfig>> {
  const viewer = await requireTab(ROSTER_TABS);
  const cat = Category.parse(category);
  const { officers, leadOfficer, ...fields } = ConfigFields.partial().parse(updates);

  await prisma.$transaction(async (tx) => {
    const existing = officers
      ? await tx.gatekeeperOfficer.findMany({
          where: { category: cat, ...LIVE },
          select: { id: true, isLead: true },
        })
      : [];
    const rejection = officers && checkOfficerRoster(existing, officers);
    if (rejection) throw new Error(rejection);
    await tx.departmentGatekeeperConfig.update({
      where: { category: cat },
      data: { ...fields, updatedBy: viewer.userId },
    });
    if (!officers) return;
    const next = withSingleLead(officers, leadOfficer?.id);
    const existingIds = new Set(existing.map((o) => o.id));
    const keptIds = new Set(next.map((o) => o.id));
    await tx.gatekeeperOfficer.updateMany({
      where: { id: { in: [...existingIds].filter((id) => !keptIds.has(id)) } },
      data: { isDeleted: true, isActive: false, updatedBy: viewer.userId },
    });
    for (const { id, ...officer } of next) {
      if (existingIds.has(id)) {
        await tx.gatekeeperOfficer.update({
          where: { id },
          data: { ...officer, updatedBy: viewer.userId },
        });
      } else {
        await tx.gatekeeperOfficer.create({
          data: { ...officer, category: cat, createdBy: viewer.userId, updatedBy: viewer.userId },
        });
      }
    }
  });
  writeAudit(viewer, AUDIT_ACTIONS.ROSTERS_UPDATE, {
    roster: 'gatekeepers',
    op: 'update',
    category: cat,
    fields: Object.keys(updates),
  });
  return listConfigs();
}

/** Upstream's "reset to defaults": every department's officers go back to the demo roster. */
export async function resetGatekeeperConfigsToDefault(): Promise<
  Record<GrievanceCategory, DepartmentGatekeeperConfig>
> {
  const viewer = await requireTab(ROSTER_TABS);
  await prisma.$transaction(async (tx) => {
    await tx.gatekeeperOfficer.updateMany({
      where: LIVE,
      data: { isDeleted: true, isActive: false, updatedBy: viewer.userId },
    });
    for (const cfg of Object.values(INITIAL_GATEKEEPER_CONFIGS)) {
      await tx.departmentGatekeeperConfig.update({
        where: { category: cfg.category },
        data: {
          departmentName: cfg.departmentName,
          departmentCode: cfg.departmentCode,
          autoAssignMode: cfg.autoAssignMode,
          escalationEmail: cfg.escalationEmail ?? null,
          notificationWebhookUrl: cfg.notificationWebhookUrl ?? null,
          updatedBy: viewer.userId,
        },
      });
      await tx.gatekeeperOfficer.createMany({
        data: cfg.officers.map((o) => ({
          ...OfficerFields.omit({ id: true }).parse(o), // lowercases the email
          category: cfg.category,
          createdBy: viewer.userId,
          updatedBy: viewer.userId,
        })),
      });
    }
  });
  writeAudit(viewer, AUDIT_ACTIONS.CONFIG_RESET, { config: 'gatekeepers' });
  return listConfigs();
}
