import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS } from '../shared/types';
import { createBatchDraft, createBatchItem } from '../client/src/lib/batchQueue';
import { cleanExpiredBatchDrafts, deleteBatchDraft, loadBatchAsset, loadBatchDrafts, saveBatchAsset, saveBatchDraft } from '../client/src/lib/batchStorage';

const draftIds: string[] = [];

afterEach(async () => {
  await Promise.all(draftIds.splice(0).map(deleteBatchDraft));
});

describe('batch IndexedDB storage', () => {
  it('saves and restores a draft and its image asset outside localStorage', async () => {
    const item = createBatchItem('dress.png', 'blob:source', 100);
    const draft = createBatchDraft({ details: DEFAULT_AD_DETAILS, template: DEFAULT_TEMPLATE_SETTINGS, useLocalBackgroundRemoval: false, items: [item] }, 100);
    draftIds.push(draft.id);

    await saveBatchDraft(draft);
    await saveBatchAsset(`${draft.id}:source:${item.id}`, new Blob(['dress'], { type: 'image/png' }), draft.id);

    expect((await loadBatchDrafts()).some(saved => saved.id === draft.id && saved.items[0].fileName === 'dress.png')).toBe(true);
    expect(await (await loadBatchAsset(`${draft.id}:source:${item.id}`))?.text()).toBe('dress');
  });

  it('deletes only the selected batch draft and its related assets', async () => {
    const item = createBatchItem('shirt.png', 'blob:shirt', 200);
    const draft = createBatchDraft({ details: DEFAULT_AD_DETAILS, template: DEFAULT_TEMPLATE_SETTINGS, useLocalBackgroundRemoval: false, items: [item] }, 200);
    draftIds.push(draft.id);
    await saveBatchDraft(draft);
    await saveBatchAsset(`${draft.id}:source:${item.id}`, new Blob(['shirt']), draft.id);

    await deleteBatchDraft(draft.id);
    expect((await loadBatchDrafts()).find(saved => saved.id === draft.id)).toBeUndefined();
    expect(await loadBatchAsset(`${draft.id}:source:${item.id}`)).toBeNull();
  });

  it('automatically cleans expired drafts while retaining active ones', async () => {
    const expired = createBatchDraft({ details: DEFAULT_AD_DETAILS, template: DEFAULT_TEMPLATE_SETTINGS, useLocalBackgroundRemoval: false, items: [] }, 1);
    const active = createBatchDraft({ details: DEFAULT_AD_DETAILS, template: DEFAULT_TEMPLATE_SETTINGS, useLocalBackgroundRemoval: false, items: [] }, 1_000_000);
    draftIds.push(expired.id, active.id);
    await saveBatchDraft(expired);
    await saveBatchDraft(active);

    expect(await cleanExpiredBatchDrafts(1 + 24 * 60 * 60 * 1000)).toBeGreaterThanOrEqual(1);
    const remaining = await loadBatchDrafts();
    expect(remaining.find(saved => saved.id === expired.id)).toBeUndefined();
    expect(remaining.find(saved => saved.id === active.id)).toBeDefined();
  });
});
