// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cachePoseRuntimeAssets, DEFAULT_MODEL_PREVIEW_TRANSFORM, getCachedPoseModel, suggestModelPreviewTransform } from '../client/src/lib/localModelPreview';

describe('اقتراح معاينة العارض المحلية', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    await new Promise<void>(resolve => {
      const request = indexedDB.deleteDatabase('clothing-ad-local-models-v1');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('يستنتج مركز القطعة وحجمها وميلها من الكتفين والوركين الواضحين', () => {
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
    landmarks[11] = { x: 0.35, y: 0.28, visibility: 0.95 };
    landmarks[12] = { x: 0.65, y: 0.31, visibility: 0.95 };
    landmarks[23] = { x: 0.4, y: 0.62, visibility: 0.95 };
    landmarks[24] = { x: 0.6, y: 0.63, visibility: 0.95 };

    const result = suggestModelPreviewTransform(landmarks);

    expect(result).not.toBeNull();
    expect(result?.x).toBeCloseTo(0.5, 2);
    expect(result?.y).toBeGreaterThan(0.4);
    expect(result?.scale).toBeGreaterThan(0.4);
    expect(result?.rotation).toBeGreaterThan(0);
  });

  it('لا يفرض اقتراحاً آلياً إذا كانت معالم الكتفين أو الوركين غير موثوقة', () => {
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.2 }));
    expect(suggestModelPreviewTransform(landmarks)).toBeNull();
  });

  it('يحافظ على تحويل افتراضي محافظ قابل للتحكم اليدوي', () => {
    expect(DEFAULT_MODEL_PREVIEW_TRANSFORM).toEqual({ x: 0.5, y: 0.46, scale: 0.58, rotation: 0 });
  });

  it('يعيد نموذج الوضعية من Cache Storage بلا fetch أو تنزيل جديد', async () => {
    const match = vi.fn().mockResolvedValue(new Response(new Uint8Array([3, 4, 5])));
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match, put: vi.fn() }) });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const onCacheMiss = vi.fn();

    const result = await getCachedPoseModel(onCacheMiss);

    expect(Array.from(new Uint8Array(result))).toEqual([3, 4, 5]);
    expect(onCacheMiss).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('يعيد نموذج الوضعية من IndexedDB عندما تُفرغ Cache Storage بلا تنزيل جديد', async () => {
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) }) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array([6, 7, 8]), { status: 200 })));
    await getCachedPoseModel();

    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const restored = await getCachedPoseModel();

    expect(Array.from(new Uint8Array(restored))).toEqual([6, 7, 8]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('يقرأ ملفات WebAssembly من الكاش في التهيئة التالية ولا يعيد طلبها', async () => {
    const cacheEntries = new Map<string, Response>();
    const cache = {
      match: vi.fn(async (url: string) => cacheEntries.get(url)),
      put: vi.fn(async (url: string, response: Response) => { cacheEntries.set(url, response); }),
    };
    const fetchSpy = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue(cache) });
    vi.stubGlobal('fetch', fetchSpy);

    await cachePoseRuntimeAssets();
    await cachePoseRuntimeAssets();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(cache.put).toHaveBeenCalledTimes(2);
  });
});
