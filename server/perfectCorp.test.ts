import { describe, expect, it, vi } from 'vitest';
import { removeBackgroundWithPerfectCorp } from './perfectCorp';

const imageData = 'data:image/png;base64,AA==';
const apiKey = 'server-only-key';

function fileApiResponse() {
  return new Response(JSON.stringify({
    status: 200,
    data: {
      files: [{
        file_id: 'perfect-file-id',
        requests: [{ url: 'https://uploads.perfectcorp.example/presigned', method: 'PUT', headers: { 'Content-Type': 'image/png' } }],
      }],
    },
  }), { status: 200 });
}

describe('Perfect Corp background removal connector', () => {
  it('uploads the image, polls the task, and returns the foreground result URL', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(fileApiResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 200, data: { task_id: 'perfect-task-id' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 200, data: { task_status: 'running' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 200, data: { task_status: 'success', results: { url: 'https://results.perfectcorp.example/cutout.png' } } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(removeBackgroundWithPerfectCorp(imageData, apiKey, { pollIntervalMs: 0, maxPollAttempts: 2 }))
      .resolves.toBe('https://results.perfectcorp.example/cutout.png');
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/s2s/v2.0/file');
    expect(JSON.stringify(fetchMock.mock.calls[0]?.[1])).toContain('file_size');
    expect(JSON.stringify(fetchMock.mock.calls[2]?.[1])).toContain('src_file_id');
  });

  it('returns a clear timeout when the task remains running', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(fileApiResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 200, data: { task_id: 'slow-task' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 200, data: { task_status: 'running' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 200, data: { task_status: 'running' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(removeBackgroundWithPerfectCorp(imageData, apiKey, { pollIntervalMs: 0, maxPollAttempts: 2 }))
      .rejects.toThrow('انتهت مهلة انتظار Perfect Corp');
  });
});
