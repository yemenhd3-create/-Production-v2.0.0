import { describe, expect, it } from 'vitest';
import { BATCH_EXPIRY_MS, BATCH_MAX_IMAGES, type BatchAdItem } from '../shared/types';
import { createBatchDraft, createBatchItem, getBatchProgress, hasExpiredBatch, limitBatchFiles, nextBatchStatus, reorderBatchItems } from '../client/src/lib/batchQueue';

describe('batch advertisement queue', () => {
  it('limits a single batch to ten images while preserving order', () => {
    const values = Array.from({ length: 12 }, (_, index) => `image-${index + 1}`);
    expect(BATCH_MAX_IMAGES).toBe(10);
    expect(limitBatchFiles(values)).toEqual(values.slice(0, 10));
    expect(limitBatchFiles(values, 8)).toEqual(values.slice(0, 2));
  });

  it('creates a draft that expires after 24 hours rather than persisting indefinitely', () => {
    const now = 1_700_000_000_000;
    const draft = createBatchDraft({ details: {} as never, template: {} as never, useLocalBackgroundRemoval: false, items: [] }, now);
    expect(draft.expiresAt).toBe(now + BATCH_EXPIRY_MS);
    expect(hasExpiredBatch(draft, draft.expiresAt - 1)).toBe(false);
    expect(hasExpiredBatch(draft, draft.expiresAt)).toBe(true);
  });

  it('tracks the queue status without treating a stopped item as a successful output', () => {
    expect(nextBatchStatus('ready', 'start')).toBe('processing');
    expect(nextBatchStatus('processing', 'success')).toBe('success');
    expect(nextBatchStatus('processing', 'failed')).toBe('failed');
    expect(nextBatchStatus('ready', 'stopped')).toBe('stopped');
    expect(nextBatchStatus('success', 'stopped')).toBe('success');
  });

  it('calculates completed items for success, failure, and safe stop states', () => {
    const statuses: BatchAdItem[] = ['success', 'failed', 'stopped', 'processing'].map((status, index) => ({ ...createBatchItem(`image-${index}`, `blob:${index}`, index), status: status as BatchAdItem['status'] }));
    expect(getBatchProgress(statuses)).toEqual({ completed: 3, total: 4, percent: 75 });
  });

  it('reorders items deterministically and ignores moves beyond the queue edges', () => {
    expect(reorderBatchItems(['أ', 'ب', 'ج'], 1, 'up')).toEqual(['ب', 'أ', 'ج']);
    expect(reorderBatchItems(['أ', 'ب', 'ج'], 1, 'down')).toEqual(['أ', 'ج', 'ب']);
    expect(reorderBatchItems(['أ', 'ب'], 0, 'up')).toEqual(['أ', 'ب']);
  });
});
