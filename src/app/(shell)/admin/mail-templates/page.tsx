// app/(shell)/admin/mail-templates/page.tsx — ugt-nextjs-mail-setup
// (2026-09-02). Server guard + fetch; interactivity lives in
// MailTemplatesManager. Same pattern as admin/roles/page.tsx: session →
// permission → fetch, no shared (admin) layout in this project (every admin
// page under (shell)/admin/* guards itself — see docs/project-context/
// decisions.md).
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { syncPermissionsIfNeeded } from '@/lib/permissions-sync';
import { MailTemplatesManager } from '@/components/MailTemplatesManager';
import {
  DEFAULT_MAIL_TEMPLATES,
  MAIL_TEMPLATE_DEFINITIONS,
  mailTemplateSchema,
  mailTemplateSettingKey,
} from '@/lib/types/mail-templates';

export default async function AdminMailTemplatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  await syncPermissionsIfNeeded();
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.MAIL_TEMPLATES_MANAGE)) redirect('/');

  // override ทุกคีย์ในคำสั่งเดียว — parse แบบ fail-open เหมือน getMailTemplate
  // ใน lib/mail-templates.ts: แถวที่เสีย/ไม่ตรง schema ถือว่าไม่มี override
  // (อีเมลจริงก็ fallback แบบเดียวกัน)
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: MAIL_TEMPLATE_DEFINITIONS.map((d) => mailTemplateSettingKey(d.key)) } },
    select: { key: true, value: true },
  });
  const overrideByKey = new Map(
    rows.flatMap((row) => {
      try {
        const parsed = mailTemplateSchema.safeParse(JSON.parse(row.value));
        return parsed.success ? ([[row.key, parsed.data] as const] as const) : [];
      } catch {
        return [];
      }
    })
  );

  const items = MAIL_TEMPLATE_DEFINITIONS.map((def) => {
    const override = overrideByKey.get(mailTemplateSettingKey(def.key));
    const fallback = DEFAULT_MAIL_TEMPLATES[def.key];
    return {
      key: def.key,
      menu: def.menu,
      label: def.label,
      description: def.description,
      variables: def.variables,
      subject: (override ?? fallback).subject,
      html: (override ?? fallback).html,
      defaultSubject: fallback.subject,
      defaultHtml: fallback.html,
      isOverridden: override !== undefined,
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">เทมเพลตอีเมล (Mail Templates)</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          แก้ไขข้อความในอีเมลแจ้งเตือนแต่ละประเภทที่ระบบส่งอัตโนมัติ — หัวจดหมาย, ปุ่ม
          และข้อความปฏิเสธความรับผิดชอบท้ายอีเมลเป็นส่วนคงที่ แก้ไขได้เฉพาะเนื้อหาข้างใน
        </p>
      </div>
      <MailTemplatesManager items={items} />
    </div>
  );
}
