// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCachedLocalModel } from '../client/src/lib/localBackgroundRemoval';

describe('تخزين نموذج إزالة الخلفية المحلي', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    await new Promise<void>(resolve => {
      const request = indexedDB.deleteDatabase('clothing-ad-local-models-v1');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('يعيد النموذج من Cache Storage بلا fetch ولا مرحلة تنزيل عند وجوده مسبقاً', async () => {
    const match = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match, put: vi.fn() }) });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const onCacheMiss = vi.fn();

    const result = await getCachedLocalModel(onCacheMiss);

    expect(Array.from(new Uint8Array(result))).toEqual([1, 2, 3]);
    expect(onCacheMiss).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('يحفظ التنزيل الأول ويطلب تخزيناً مستمراً عندما يدعمه المتصفح', async () => {
    const put = vi.fn();
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match: vi.fn().mockResolvedValue(undefined), put }) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array([4, 5]), { status: 200 })));
    const persist = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'storage', { configurable: true, value: { persisted: vi.fn().mockResolvedValue(false), persist } });
    const onCacheMiss = vi.fn();

    const result = await getCachedLocalModel(onCacheMiss);

    expect(Array.from(new Uint8Array(result))).toEqual([4, 5]);
    expect(onCacheMiss).toHaveBeenCalledOnce();
    expect(put).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledOnce();
  });

  it('يعيد النموذج من IndexedDB عندما تُفرغ Cache Storage ولا يعيد تنزيله', async () => {
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) }) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array([7, 8, 9]), { status: 200 })));
    await getCachedLocalModel();

    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const onCacheMiss = vi.fn();
    const restored = await getCachedLocalModel(onCacheMiss);

    expect(Array.from(new Uint8Array(restored))).toEqual([7, 8, 9]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onCacheMiss).not.toHaveBeenCalled();
  });
});
