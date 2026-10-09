// lib/upload-client.ts — browser-side helpers for the real attachment flow (rewiring slice 4).
// Uploads go to the guarded Route Handler `${basePath}/api/files` (session → permission → ticket
// scope → volume → Attachments row → audit; see .claude/rules/ugt-nextjs-upload.md), downloads
// come back through `${basePath}/api/files/<id>`. Client-safe: NEXT_PUBLIC_BASE_PATH only.
import { env } from '@/lib/env';

type UploadLang = 'th' | 'en';

/** Route error codes (src/app/api/files/route.ts) → copy. Unknown codes fall back to UPLOAD_FAILED. */
const UPLOAD_ERROR_MESSAGES: Record<string, Record<UploadLang, string>> = {
  UNAUTHORIZED: {
    th: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
    en: 'Please sign in again',
  },
  FORBIDDEN_UPLOAD: {
    th: 'คุณไม่มีสิทธิ์แนบไฟล์',
    en: 'You do not have permission to attach files',
  },
  BAD_REQUEST: {
    th: 'ข้อมูลไฟล์ไม่ถูกต้อง',
    en: 'The file data is invalid',
  },
  TICKET_NOT_FOUND: {
    th: 'ไม่พบคำร้องนี้ในระบบ',
    en: 'This ticket was not found',
  },
  TIMELINE_LOG_NOT_FOUND: {
    th: 'ไม่พบบันทึกไทม์ไลน์นี้',
    en: 'This timeline entry was not found',
  },
  UPLOAD_FAILED: {
    th: 'อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    en: 'Upload failed, please try again',
  },
};

export interface UploadFailure {
  /** Stable React key — the same file can be picked twice. */
  id: string;
  file: File;
  /** Route error code (`UPLOAD_FAILED` for a network error or an unparsable response). */
  code: string;
  /** Only sent with FILE_TOO_LARGE (413). */
  maxMb?: number;
}

interface UploadErrorPayload {
  error?: { code?: string; maxMb?: number };
}

/** Guarded download URL for an attachment id (the route decides who may read it). */
export function attachmentDownloadUrl(id: string): string {
  return `${env.NEXT_PUBLIC_BASE_PATH}/api/files/${id}`;
}

export function uploadErrorMessage(
  failure: Pick<UploadFailure, 'code' | 'maxMb'>,
  lang: UploadLang
): string {
  if (failure.code === 'FILE_TOO_LARGE' && failure.maxMb) {
    return lang === 'en'
      ? `File exceeds ${failure.maxMb} MB`
      : `ไฟล์มีขนาดเกิน ${failure.maxMb} MB`;
  }
  return (UPLOAD_ERROR_MESSAGES[failure.code] ?? UPLOAD_ERROR_MESSAGES.UPLOAD_FAILED)[lang];
}

async function uploadOne(
  file: File,
  ticketId: string,
  timelineLogId?: string
): Promise<Omit<UploadFailure, 'id'> | null> {
  try {
    const body = new FormData();
    body.append('file', file);
    body.append('ticketId', ticketId);
    if (timelineLogId) body.append('timelineLogId', timelineLogId);

    const response = await fetch(`${env.NEXT_PUBLIC_BASE_PATH}/api/files`, {
      method: 'POST',
      body,
    });
    if (response.ok) return null;
    // Check `ok` before parsing — a 500 HTML error page must not surface as a JSON parse failure.
    const payload = (await response.json().catch(() => null)) as UploadErrorPayload | null;
    return {
      file,
      code: payload?.error?.code ?? 'UPLOAD_FAILED',
      maxMb: payload?.error?.maxMb,
    };
  } catch (error) {
    console.error('upload failed', error);
    return { file, code: 'UPLOAD_FAILED' };
  }
}

/**
 * Uploads the files one by one to an existing ticket and returns the ones that did not make it
 * (never rejects) — the caller keeps the ticket and reports the failures.
 */
export async function uploadTicketFiles(
  ticketId: string,
  files: File[],
  timelineLogId?: string
): Promise<UploadFailure[]> {
  const failures: UploadFailure[] = [];
  for (const file of files) {
    const failure = await uploadOne(file, ticketId, timelineLogId);
    if (failure) failures.push({ id: globalThis.crypto.randomUUID(), ...failure });
  }
  return failures;
}
