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
import { canReadAttachment } from '@/lib/attachment-access';
import { AUDIT_ACTIONS, type AuditAction } from '@/lib/audit-actions';
import { checksum, newStorageKey, safeDisplayName, writeStoredFile } from '@/lib/storage';

async function auditLog(userId: string, action: AuditAction, detail: unknown) {
  await prisma.activityLog
    .create({ data: { userId, action, detail: JSON.stringify(detail) } })
    .catch(() => {});
}

/** Multipart framing on top of the file itself — headroom for the early Content-Length check. */
const MULTIPART_OVERHEAD = 1024 * 1024;

/**
 * A browser POST from another origin is refused. SameSite=Lax alone does not cover it: every app on
 * *.ube.co.th is the same site, so script on a sibling app could upload with the victim's cookie.
 */
function isForeignOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false; // same-origin fetches of older browsers / server-side callers
  const allowed = [env.BETTER_AUTH_URL, env.APP_URL]
    .filter((url): url is string => !!url)
    .map((url) => new URL(url).origin);
  return !allowed.includes(origin);
}

function tooLarge(maxBytes: number) {
  // ไม่มี message ที่นี่ — client แปล code + maxMb เอง (ไม่มี i18n ในโปรเจคนี้
  // — ดู docs/DESIGN.md §10 — ข้อความแปลตรงที่ lib/upload-client.ts)
  return NextResponse.json(
    {
      success: false,
      error: { code: 'FILE_TOO_LARGE', maxMb: Math.floor(maxBytes / 1024 / 1024) },
    },
    { status: 413 }
  );
}

export async function POST(request: Request) {
  if (isForeignOrigin(request)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN_UPLOAD' } },
      { status: 403 }
    );
  }

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

  // Reject an oversized body before buffering it (the per-file check below stays authoritative).
  const maxBytes = Number(env.UPLOAD_MAX_BYTES);
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes + MULTIPART_OVERHEAD) {
    return tooLarge(maxBytes);
  }

  const form = await request.formData();
  const file = form.get('file');
  const ticketIdRaw = form.get('ticketId');
  const ticketId = typeof ticketIdRaw === 'string' ? ticketIdRaw : '';
  const timelineLogIdRaw = form.get('timelineLogId');
  const timelineLogId =
    typeof timelineLogIdRaw === 'string' && timelineLogIdRaw ? timelineLogIdRaw : null;

  if (!(file instanceof File) || !ticketId) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST' } }, { status: 400 });
  }

  // The ticket (and, if given, the timeline log entry on that same ticket) must exist AND be one
  // the caller may see (same scope as downloads) — no attaching files to someone else's ticket.
  if (!(await canReadAttachment(session.user.id, { ticketId }))) {
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

  if (file.size > maxBytes) return tooLarge(maxBytes);

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
