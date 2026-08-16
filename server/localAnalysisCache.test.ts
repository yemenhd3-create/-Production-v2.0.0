import { describe, expect, it } from 'vitest';
import { LOCAL_ANALYSIS_CACHE_LIMIT, addLocalAnalysisCacheEntry, getLocalAnalysisCacheEntry, readLocalAnalysisCache } from '../client/src/lib/localAnalysisCache';
import type { LocalImageMetrics } from '../client/src/lib/localDesignIntelligence';

const metrics: LocalImageMetrics = {
  width: 1080,
  height: 1350,
  brightness: 144,
  contrast: 42,
  sharpness: 55,
  foreground: { x: .2, y: .1, width: .55, height: .7, coverage: .38 },
  colors: [{ hex: '#1a2b3c', label: 'أزرق', weight: .8 }],
};

function entry(fingerprint: string, lastUsedAt = 100) {
  return { fingerprint, analyzerVersion: 'lia-v1' as const, metrics, savedAt: 50, lastUsedAt };
}

describe('Cache التحليل المحلي', () => {
  it('يعيد hit لنفس البصمة ويحافظ على القياسات الصغيرة فقط', () => {
    const store = addLocalAnalysisCacheEntry({ schemaVersion: 1, entries: [] }, entry('lia-v1-1080x1350-40x40-aaaa'));
    const lookup = getLocalAnalysisCacheEntry(store, 'lia-v1-1080x1350-40x40-aaaa', 200);

    expect(lookup.entry?.metrics).toEqual(metrics);
    expect(lookup.entry?.lastUsedAt).toBe(200);
    expect(JSON.stringify(lookup.store)).not.toMatch(/data:image|blob:|https?:\/\//i);
  });

  it('يعيد miss عندما تختلف البصمة ولا يعيد استعمال تحليل صورة أخرى', () => {
    const store = addLocalAnalysisCacheEntry({ schemaVersion: 1, entries: [] }, entry('lia-v1-1080x1350-40x40-aaaa'));
    const lookup = getLocalAnalysisCacheEntry(store, 'lia-v1-1080x1350-40x40-bbbb');

    expect(lookup.entry).toBeUndefined();
    expect(lookup.store.entries).toHaveLength(1);
  });

  it('يحد السجل إلى آخر القياسات استعمالاً ولا يسمح بنمو غير محدود', () => {
    let store = { schemaVersion: 1 as const, entries: [] };
    for (let index = 0; index < LOCAL_ANALYSIS_CACHE_LIMIT + 4; index += 1) {
      store = addLocalAnalysisCacheEntry(store, entry(`lia-v1-100x100-40x40-${index}`, index));
    }

    expect(store.entries).toHaveLength(LOCAL_ANALYSIS_CACHE_LIMIT);
    expect(store.entries[0].fingerprint).toContain(`${LOCAL_ANALYSIS_CACHE_LIMIT + 3}`);
  });

  it('يتجاهل السجلات الفاسدة أو التي تتضمن رابطاً أو صورة بدلاً من القياسات', () => {
    const corrupted = {
      schemaVersion: 1 as const,
      entries: [entry('https://example.com/not-allowed'), { ...entry('lia-v1-safe'), metrics: { ...metrics, colors: [{ hex: '#fff', label: 'data:image/png', weight: 1 }] } }],
    };

    expect(readLocalAnalysisCache(corrupted).entries).toEqual([]);
    expect(readLocalAnalysisCache({ schemaVersion: 99, entries: [] } as never).entries).toEqual([]);
  });
});
