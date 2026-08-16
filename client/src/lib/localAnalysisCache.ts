import type { LocalImageMetrics } from './localDesignIntelligence';
import { inspectLocalImageMetrics } from './localDesignIntelligence';
import { getFromStorage, saveToStorage } from './storage';
import { StorageKeys } from '@shared/types';

export const LOCAL_ANALYSIS_CACHE_VERSION = 'lia-v1';
export const LOCAL_ANALYSIS_CACHE_LIMIT = 12;

export interface LocalAnalysisCacheEntry {
  fingerprint: string;
  analyzerVersion: typeof LOCAL_ANALYSIS_CACHE_VERSION;
  metrics: LocalImageMetrics;
  savedAt: number;
  lastUsedAt: number;
}

export interface LocalAnalysisCacheStore {
  schemaVersion: 1;
  entries: LocalAnalysisCacheEntry[];
}

export interface LocalAnalysisPreparation {
  fingerprint: string;
  metrics: LocalImageMetrics;
  cache: 'hit' | 'miss';
  elapsedMs: number;
}

const emptyStore = (): LocalAnalysisCacheStore => ({ schemaVersion: 1, entries: [] });

/** بصمة FNV محلية لعينة Canvas؛ لا تُرسل ولا تُخزن البكسلات التي بنيت منها. */
export async function createLocalAnalysisFingerprint(source: string): Promise<string> {
  const image = await loadImage(source);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const edge = 40;
  const scale = Math.min(1, edge / Math.max(1, width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(16, Math.round(width * scale));
  canvas.height = Math.max(16, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('analysis-fingerprint-canvas-unavailable');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let hash = 2166136261;
  for (let index = 0; index < pixels.length; index += 4) {
    hash = Math.imul(hash ^ pixels[index], 16777619);
    hash = Math.imul(hash ^ pixels[index + 1], 16777619);
    hash = Math.imul(hash ^ pixels[index + 2], 16777619);
    hash = Math.imul(hash ^ pixels[index + 3], 16777619);
  }
  return `${LOCAL_ANALYSIS_CACHE_VERSION}-${width}x${height}-${canvas.width}x${canvas.height}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function readLocalAnalysisCache(value = getFromStorage<LocalAnalysisCacheStore>(StorageKeys.LOCAL_ANALYSIS_CACHE)): LocalAnalysisCacheStore {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.entries)) return emptyStore();
  const entries = value.entries.filter(isSafeEntry);
  return { schemaVersion: 1, entries };
}

export function addLocalAnalysisCacheEntry(store: LocalAnalysisCacheStore, entry: LocalAnalysisCacheEntry): LocalAnalysisCacheStore {
  if (!isSafeEntry(entry)) return readLocalAnalysisCache(store);
  const retained = store.entries.filter(item => item.fingerprint !== entry.fingerprint && isSafeEntry(item));
  return { schemaVersion: 1, entries: [entry, ...retained].sort((first, second) => second.lastUsedAt - first.lastUsedAt).slice(0, LOCAL_ANALYSIS_CACHE_LIMIT) };
}

export function getLocalAnalysisCacheEntry(store: LocalAnalysisCacheStore, fingerprint: string, now = Date.now()): { entry?: LocalAnalysisCacheEntry; store: LocalAnalysisCacheStore } {
  const safe = readLocalAnalysisCache(store);
  const entry = safe.entries.find(item => item.fingerprint === fingerprint && item.analyzerVersion === LOCAL_ANALYSIS_CACHE_VERSION);
  if (!entry) return { store: safe };
  const used = { ...entry, lastUsedAt: now };
  return { entry: used, store: addLocalAnalysisCacheEntry(safe, used) };
}

/** يعيد القياسات فقط مع قياس زمني للجلسة، ويبقى مسار التحليل محلياً كاملاً. */
export async function prepareLocalAnalysis(source: string, now = Date.now()): Promise<LocalAnalysisPreparation> {
  const started = performance.now();
  const fingerprint = await createLocalAnalysisFingerprint(source);
  const lookup = getLocalAnalysisCacheEntry(readLocalAnalysisCache(), fingerprint, now);
  if (lookup.entry) {
    saveToStorage(StorageKeys.LOCAL_ANALYSIS_CACHE, lookup.store);
    return { fingerprint, metrics: lookup.entry.metrics, cache: 'hit', elapsedMs: Math.round(performance.now() - started) };
  }
  const metrics = await inspectLocalImageMetrics(source);
  const next = addLocalAnalysisCacheEntry(lookup.store, { fingerprint, analyzerVersion: LOCAL_ANALYSIS_CACHE_VERSION, metrics, savedAt: now, lastUsedAt: now });
  saveToStorage(StorageKeys.LOCAL_ANALYSIS_CACHE, next);
  return { fingerprint, metrics, cache: 'miss', elapsedMs: Math.round(performance.now() - started) };
}

function isSafeEntry(value: unknown): value is LocalAnalysisCacheEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<LocalAnalysisCacheEntry>;
  if (entry.analyzerVersion !== LOCAL_ANALYSIS_CACHE_VERSION || typeof entry.fingerprint !== 'string' || !entry.metrics || !Number.isFinite(entry.savedAt) || !Number.isFinite(entry.lastUsedAt)) return false;
  const metrics = entry.metrics;
  const numericMetrics = [metrics.width, metrics.height, metrics.brightness, metrics.contrast, metrics.sharpness, metrics.foreground?.x, metrics.foreground?.y, metrics.foreground?.width, metrics.foreground?.height, metrics.foreground?.coverage];
  if (!numericMetrics.every(Number.isFinite) || !Array.isArray(metrics.colors) || !metrics.colors.every(color => /^#[0-9a-f]{6}$/i.test(color.hex) && typeof color.label === 'string' && Number.isFinite(color.weight))) return false;
  const serialized = JSON.stringify(entry);
  return !/data:image\/|blob:|https?:\/\//i.test(serialized);
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('analysis-fingerprint-image-load'));
    image.src = source;
  });
}
