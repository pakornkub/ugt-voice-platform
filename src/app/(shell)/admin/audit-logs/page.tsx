// app/(shell)/admin/audit-logs/page.tsx — ugt-nextjs-auth-setup (2026-09-02).
// Read-only ActivityLogs viewer — server-side filter/sort/page via
// searchParams (q/from/to/action/page), no client fetch/API route.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { syncPermissionsIfNeeded } from '@/lib/permissions-sync';
import { AuditLogsTable } from '@/components/AuditLogsTable';

const PAGE_SIZE = 20;

function firstParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

export default async function AdminAuditLogsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  await syncPermissionsIfNeeded();
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.AUDIT_LOGS_READ)) redirect('/');

  const sp = await searchParams;
  const q = firstParam(sp.q).trim();
  const action = firstParam(sp.action).trim();
  const from = firstParam(sp.from).trim();
  const to = firstParam(sp.to).trim();
  const pageRaw = Number.parseInt(firstParam(sp.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const where: {
    action?: string;
    userId?: { in: string[] };
    createdAt?: { gte?: Date; lt?: Date };
  } = {};
  if (action) where.action = action;
  // ขอบเขตวันคิดที่เวลาไทยเสมอ (+07:00) — createdAt เป็น instant และ server
  // อาจรัน UTC · to เป็นขอบ exclusive ของวันถัดไป เพื่อรวมทั้งวันสุดท้าย
  if (from) where.createdAt = { gte: new Date(`${from}T00:00:00+07:00`) };
  if (to) {
    const end = new Date(`${to}T00:00:00+07:00`);
    where.createdAt = { ...where.createdAt, lt: new Date(end.getTime() + 86_400_000) };
  }
  if (q) {
    const matched = await prisma.user.findMany({
      where: { OR: [{ name: { contains: q } }, { email: { contains: q } }] },
      select: { id: true },
    });
    // ไม่มีใคร match → in: [] → 0 แถว (ถูกต้อง — ไม่ใช่ "เลิกกรอง")
    where.userId = { in: matched.map((u) => u.id) };
  }

  const [totalItems, logs, actionOptions] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.activityLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    }),
  ]);

  const userIds = [...new Set(logs.map((l) => l.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">บันทึกการใช้งาน (Audit Logs)</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          บันทึกการเข้าสู่ระบบ/ออกจากระบบ และการเปลี่ยนแปลงสิทธิ์ผู้ใช้/บทบาททั้งหมด
          (อ่านอย่างเดียว)
        </p>
      </div>
      <AuditLogsTable
        rows={logs.map((log) => {
          const user = userById.get(log.userId);
          return {
            id: log.id,
            createdAt: log.createdAt.toISOString(),
            userName: user ? `${user.name} (${user.email})` : log.userId,
            action: log.action,
            detail: log.detail,
          };
        })}
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={totalItems}
        actionOptions={actionOptions.map((a) => a.action)}
        filters={{ q, from, to, action }}
      />
    </div>
  );
}
