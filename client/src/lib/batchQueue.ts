import { BATCH_EXPIRY_MS, BATCH_MAX_IMAGES, type BatchAdDraft, type BatchAdItem, type BatchItemStatus } from '@shared/types';

export function createBatchItem(fileName: string, sourceUrl: string, now = Date.now()): BatchAdItem {
  return {
    id: `batch-item-${now}-${Math.random().toString(36).slice(2, 8)}`,
    fileName,
    sourceUrl,
    thumbnailUrl: sourceUrl,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
  };
}

export function createBatchDraft(input: Omit<BatchAdDraft, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>, now = Date.now()): BatchAdDraft {
  return {
    ...input,
    id: `batch-${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + BATCH_EXPIRY_MS,
  };
}

export function limitBatchFiles<T>(files: T[], currentCount = 0) {
  return files.slice(0, Math.max(0, BATCH_MAX_IMAGES - currentCount));
}

export function nextBatchStatus(status: BatchItemStatus, outcome: 'start' | 'success' | 'failed' | 'stopped'): BatchItemStatus {
  if (outcome === 'start') return 'processing';
  if (outcome === 'success') return 'success';
  if (outcome === 'failed') return 'failed';
  return status === 'processing' || status === 'ready' ? 'stopped' : status;
}

export function getBatchProgress(items: BatchAdItem[]) {
  const completed = items.filter(item => item.status === 'success' || item.status === 'failed' || item.status === 'stopped').length;
  return { completed, total: items.length, percent: items.length ? Math.round((completed / items.length) * 100) : 0 };
}

export function reorderBatchItems<T>(items: T[], index: number, direction: 'up' | 'down') {
  const target = index + (direction === 'up' ? -1 : 1);
  if (index < 0 || target < 0 || index >= items.length || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function hasExpiredBatch(draft: Pick<BatchAdDraft, 'expiresAt'>, now = Date.now()) {
  return draft.expiresAt <= now;
}
