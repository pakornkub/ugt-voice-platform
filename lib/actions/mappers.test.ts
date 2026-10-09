import { describe, expect, it } from 'vitest';
import { env } from '@/lib/env';
import type { attachment as AttachmentRow } from '@prisma/client';
import { mapAttachment } from './mappers';

const row = {
  id: 'att-1',
  ticketId: 'tk-1',
  timelineLogId: null,
  storageKey: 'a1/b2/secret-storage-key',
  fileName: 'หลักฐาน.pdf',
  contentType: 'application/pdf',
  fileSize: 1.4 * 1024 * 1024,
  checksum: 'deadbeef',
  scanStatus: 'unscanned',
  createdAt: new Date('2026-10-09T00:00:00.000Z'),
} as unknown as AttachmentRow;

describe('mapAttachment', () => {
  it('maps the display fields and the guarded download path', () => {
    expect(mapAttachment(row)).toEqual({
      id: 'att-1',
      name: 'หลักฐาน.pdf',
      size: '1.4 MB',
      type: 'application/pdf',
      url: `${env.NEXT_PUBLIC_BASE_PATH}/api/files/att-1`,
    });
  });

  it('never exposes the storage key, checksum or scan status to the client', () => {
    const json = JSON.stringify(mapAttachment(row));
    expect(json).not.toContain('secret-storage-key');
    expect(json).not.toContain('deadbeef');
    expect(json).not.toContain('unscanned');
  });
});
