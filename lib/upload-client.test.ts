import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachmentDownloadUrl, uploadErrorMessage, uploadTicketFiles } from './upload-client';

vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_BASE_PATH: '/ugt-voice-platform' } }));

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

const pdf = new File(['pdf'], 'memo.pdf', { type: 'application/pdf' });
const png = new File(['png'], 'shot.png', { type: 'image/png' });

describe('upload-client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds the guarded download URL with the basePath', () => {
    expect(attachmentDownloadUrl('att-1')).toBe('/ugt-voice-platform/api/files/att-1');
  });

  it('translates route error codes, with a generic fallback for unknown ones', () => {
    expect(uploadErrorMessage({ code: 'FORBIDDEN_UPLOAD' }, 'th')).toBe('คุณไม่มีสิทธิ์แนบไฟล์');
    expect(uploadErrorMessage({ code: 'FORBIDDEN_UPLOAD' }, 'en')).toBe(
      'You do not have permission to attach files'
    );
    expect(uploadErrorMessage({ code: 'SOMETHING_NEW' }, 'th')).toBe(
      'อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
    );
  });

  it('shows the limit for FILE_TOO_LARGE, generic text when the route sent none', () => {
    expect(uploadErrorMessage({ code: 'FILE_TOO_LARGE', maxMb: 25 }, 'th')).toBe(
      'ไฟล์มีขนาดเกิน 25 MB'
    );
    expect(uploadErrorMessage({ code: 'FILE_TOO_LARGE', maxMb: 25 }, 'en')).toBe(
      'File exceeds 25 MB'
    );
    expect(uploadErrorMessage({ code: 'FILE_TOO_LARGE' }, 'en')).toBe(
      'Upload failed, please try again'
    );
  });

  it('posts each file with the ticketId to the basePath route and reports no failures', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { success: true, data: { id: 'a' } }));

    const failures = await uploadTicketFiles('tk-1', [pdf, png]);

    expect(failures).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/ugt-voice-platform/api/files');
    expect(init.method).toBe('POST');
    const body = init.body as FormData;
    expect(body.get('ticketId')).toBe('tk-1');
    expect((body.get('file') as File).name).toBe('memo.pdf');
    expect(body.has('timelineLogId')).toBe(false);
    expect(((fetchMock.mock.calls[1][1].body as FormData).get('file') as File).name).toBe(
      'shot.png'
    );
  });

  it('sends the timelineLogId when given', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { success: true }));
    await uploadTicketFiles('tk-1', [pdf], 'log-9');
    expect((fetchMock.mock.calls[0][1].body as FormData).get('timelineLogId')).toBe('log-9');
  });

  it('returns the files the route rejected, with its error code', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(413, { success: false, error: { code: 'FILE_TOO_LARGE', maxMb: 25 } })
      )
      .mockResolvedValueOnce(jsonResponse(201, { success: true }));

    const failures = await uploadTicketFiles('tk-1', [pdf, png]);

    expect(failures).toEqual([
      { id: expect.any(String), file: pdf, code: 'FILE_TOO_LARGE', maxMb: 25 },
    ]);
  });

  it('treats a non-JSON error page and a network error as UPLOAD_FAILED', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('<html>boom</html>', { status: 500 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const failures = await uploadTicketFiles('tk-1', [pdf, png]);

    expect(failures).toEqual([
      { id: expect.any(String), file: pdf, code: 'UPLOAD_FAILED', maxMb: undefined },
      { id: expect.any(String), file: png, code: 'UPLOAD_FAILED' },
    ]);
  });
});
