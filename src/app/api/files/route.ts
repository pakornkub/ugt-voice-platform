// src/app/api/files/route.ts — file upload (ugt-nextjs-upload-setup,
// 2026-09-02). A Route Handler, NOT a Server Action, on purpose: Server
// Actions cap the request body at `serverActions.bodySizeLimit` (1 MB by
// default) and fail with an opaque error above it — a trap that only shows up
// once someone uploads a real document.
//
// Order is fixed (org guard order, extended for uploads):
//   session → permission → read bytes → write to volume → row → audit log
// No virus scan in this project (owner decision 2026-10-09 — the skill's opt-in
// [SCAN] stays off); rows are stored as scanStatus 'unscanned'. See .claude/rules/ugt-nextjs-upload.md.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { auth } from '@/lib/auth';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { PERMISSIONS } from '@/lib/permissions';
import { AUDIT_ACTIONS, type AuditAction } from '@/lib/audit-actions';
import { checksum, newStorageKey, safeDisplayName, writeStoredFile } from '@/lib/storage';

async function auditLog(userId: string, action: AuditAction, detail: unknown) {
  await prisma.activityLog
    .create({ data: { userId, action, detail: JSON.stringify(detail) } })
    .catch(() => {});
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const permissions = await getUserPermissions(session.user.id);
  if (!permissions.includes(PERMISSIONS.FILES_CREATE)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN_UPLOAD' } },
      { status: 403 }
    );
  }

  const form = await request.formData();
  const file = form.get('file');
  const ticketId = String(form.get('ticketId') ?? '');
  const timelineLogIdRaw = form.get('timelineLogId');
  const timelineLogId =
    typeof timelineLogIdRaw === 'string' && timelineLogIdRaw ? timelineLogIdRaw : null;

  if (!(file instanceof File) || !ticketId) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST' } }, { status: 400 });
  }

  // The ticket (and, if given, the timeline log entry on that same ticket)
  // must actually exist — a fabricated id must not create an orphaned row.
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, isDeleted: false },
    select: { id: true },
  });
  if (!ticket) {
    return NextResponse.json(
      { success: false, error: { code: 'TICKET_NOT_FOUND' } },
      { status: 404 }
    );
  }
  if (timelineLogId) {
    const log = await prisma.ticketTimelineLog.findFirst({
      where: { id: timelineLogId, ticketId },
      select: { id: true },
    });
    if (!log) {
      return NextResponse.json(
        { success: false, error: { code: 'TIMELINE_LOG_NOT_FOUND' } },
        { status: 404 }
      );
    }
  }

  const maxBytes = Number(env.UPLOAD_MAX_BYTES);
  if (file.size > maxBytes) {
    // ไม่มี message ที่นี่ — client แปล code + maxMb เอง (ไม่มี i18n ในโปรเจคนี้
    // — ดู docs/DESIGN.md §10 — ข้อความไทยแปลตรงที่ FileUpload.tsx)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'FILE_TOO_LARGE', maxMb: Math.floor(maxBytes / 1024 / 1024) },
      },
      { status: 413 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const storageKey = newStorageKey();
  await writeStoredFile(storageKey, bytes);

  const attachment = await prisma.attachment.create({
    data: {
      ticketId,
      timelineLogId,
      storageKey,
      fileName: safeDisplayName(file.name),
      contentType: file.type || 'application/octet-stream',
      fileSize: bytes.length,
      checksum: checksum(bytes),
      scanStatus: 'unscanned',
      createdBy: session.user.email ?? session.user.id,
    },
    select: { id: true, fileName: true, fileSize: true, contentType: true },
  });

  await auditLog(session.user.id, AUDIT_ACTIONS.FILES_UPLOAD, {
    attachmentId: attachment.id,
    ticketId,
    timelineLogId,
    fileName: attachment.fileName,
  });

  return NextResponse.json({ success: true, data: attachment }, { status: 201 });
}
