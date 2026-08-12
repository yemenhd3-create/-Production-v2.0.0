import { beforeEach, describe, expect, it, vi } from 'vitest';

const provider = {
  id: '8b95c0be-4b22-4c33-a4a0-39d7ef5030c6',
  name: 'FASHN',
  baseUrl: 'https://api.fashn.ai/v1',
  model: 'product-to-model',
  encryptedApiKey: 'encrypted-key',
  isEnabled: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const limitMock = vi.fn();
const storagePutMock = vi.fn();
vi.mock('./db', () => ({
  getDb: async () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: limitMock }) }) }),
  }),
}));
vi.mock('./developerProviders', () => ({ decryptProviderKey: () => 'server-only-api-key' }));
vi.mock('./storage', () => ({ storagePut: storagePutMock }));

const { extractOutputImageUrl, runProductToModelTryOn } = await import('./tryOn');

describe('FASHN output parsing', () => {
  it('finds an image URL across common output shapes without accepting unsafe values', () => {
    expect(extractOutputImageUrl('https://images.example.com/result.png')).toBe('https://images.example.com/result.png');
    expect(extractOutputImageUrl({ images: [{ url: 'https://images.example.com/result.png' }] })).toBe('https://images.example.com/result.png');
    expect(extractOutputImageUrl({ output: 'not-a-url' })).toBeUndefined();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    limitMock.mockResolvedValueOnce([provider]).mockResolvedValueOnce([]);
    storagePutMock.mockResolvedValue({ key: 'tryon-results/result.png', url: '/manus-storage/tryon-results/result.png' });
  });

  it('returns a successful stored image when the configured provider completes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'job-123' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'completed', output: { image_url: 'https://images.fashn.ai/result.png' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { 'content-type': 'image/png' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runProductToModelTryOn('data:image/png;base64,AA==', '4:5', { pollIntervalMs: 0, maxPollAttempts: 1 });

    expect(result).toEqual({
      status: 'success',
      imageUrl: '/manus-storage/tryon-results/result.png',
      providerId: provider.id,
      message: 'تم تلبيس القطعة بالذكاء الاصطناعي بنجاح. أضف مزود background-remove من لوحة المطور للحصول على PNG بخلفية شفافة.',
      isTransparent: false,
    });
    expect(JSON.stringify(fetchMock.mock.calls[0]?.[1])).toContain('product-to-model');
  });

  it('runs background removal after product-to-model when the optional provider is enabled', async () => {
    const backgroundProvider = { ...provider, id: 'd5092fc4-cc90-45ad-9a4b-7e68e1c4cc2a', model: 'background-remove' };
    limitMock.mockReset().mockResolvedValueOnce([provider]).mockResolvedValueOnce([backgroundProvider]);
    storagePutMock
      .mockResolvedValueOnce({ key: 'tryon-results/model.png', url: '/manus-storage/tryon-results/model.png' })
      .mockResolvedValueOnce({ key: 'tryon-results/transparent.png', url: '/manus-storage/tryon-results/transparent.png' });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'product-job' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'completed', output: ['https://images.fashn.ai/model.png'] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { 'content-type': 'image/png' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'background-job' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'completed', output: ['https://images.fashn.ai/transparent.png'] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { 'content-type': 'image/png' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runProductToModelTryOn('data:image/png;base64,AA==', '4:5', { pollIntervalMs: 0, maxPollAttempts: 1 });

    expect(result.imageUrl).toBe('/manus-storage/tryon-results/transparent.png');
    expect(result.message).toContain('PNG شفافة');
    expect(JSON.stringify(fetchMock.mock.calls[3]?.[1])).toContain('background-remove');
  });
});
