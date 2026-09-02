// src/app/api/files/[id]/route.ts — guarded download (ugt-nextjs-upload-setup,
// 2026-09-02). Every byte leaves through here — files are on a volume, not in
// `public/`, precisely so this guard cannot be bypassed by knowing a URL.
//
// session → permission → per-ticket scope → clean-scan check → stream + audit
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { PERMISSIONS } from '@/lib/permissions';
import { AUDIT_ACTIONS, type AuditAction } from '@/lib/audit-actions';
import { readStoredFile } from '@/lib/storage';
import { canReadAttachment } from '@/lib/attachment-access';

async function auditLog(userId: string, action: AuditAction, detail: unknown) {
  await prisma.activityLog
    .create({ data: { userId, action, detail: JSON.stringify(detail) } })
    .catch(() => {});
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const permissions = await getUserPermissions(session.user.id);
  if (!permissions.includes(PERMISSIONS.FILES_READ)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN_DOWNLOAD' } },
      { status: 403 }
    );
  }

  const attachment = await prisma.attachment.findFirst({
    where: { id, isDeleted: false },
    select: {
      id: true,
      ticketId: true,
      storageKey: true,
      fileName: true,
      fileSize: true,
      scanStatus: true,
    },
  });

  // 404 for both "missing" and "not yours" — a different status would
  // confirm that an id exists to someone who may not see it.
  if (!attachment || !(await canReadAttachment(session.user.id, attachment))) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  if (attachment.scanStatus !== 'clean') {
    return NextResponse.json(
      { success: false, error: { code: 'FILE_NOT_AVAILABLE' } },
      { status: 409 }
    );
  }

  const bytes = await readStoredFile(attachment.storageKey);

  await auditLog(session.user.id, AUDIT_ACTIONS.FILES_DOWNLOAD, {
    attachmentId: attachment.id,
    fileName: attachment.fileName,
  });

  const encoded = encodeURIComponent(attachment.fileName);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      // ALWAYS octet-stream + attachment, whatever the file claims to be.
      // Serving user content inline is how an uploaded .svg or .html becomes
      // stored XSS on your own domain — virus-free and still dangerous.
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
      'Content-Length': String(attachment.fileSize),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
