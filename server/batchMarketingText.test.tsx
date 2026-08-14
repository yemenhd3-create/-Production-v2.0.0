// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BatchAdItem } from '../shared/types';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS } from '../shared/types';
import BatchWorkspace from '../client/src/components/BatchWorkspace';

const mocks = vi.hoisted(() => ({
  renderAd: vi.fn(),
  shareViaWebAPI: vi.fn(),
  generateCloudText: vi.fn(),
  removeBackgroundLocally: vi.fn(),
}));
const { renderAd, shareViaWebAPI, generateCloudText, removeBackgroundLocally } = mocks;

vi.mock('../client/src/components/AdDetailsForm', async () => {
  const { createElement: h } = await import('react');
  return { default: () => h('div', null, 'نموذج الدفعة المختصر') };
});
vi.mock('../client/src/lib/canvasRenderer', () => ({ renderAd: mocks.renderAd }));
vi.mock('../client/src/lib/localBackgroundRemoval', () => ({ removeBackgroundLocally: mocks.removeBackgroundLocally }));
vi.mock('../client/src/lib/batchStorage', () => ({
  cleanExpiredBatchDrafts: vi.fn(async () => undefined),
  deleteBatchDraft: vi.fn(async () => undefined),
  getBatchStorageEstimate: vi.fn(async () => null),
  loadBatchAsset: vi.fn(async () => null),
  loadBatchDrafts: vi.fn(async () => []),
  requestPersistentBatchStorage: vi.fn(async () => true),
  saveBatchAsset: vi.fn(async () => undefined),
  saveBatchDraft: vi.fn(async () => undefined),
}));
vi.mock('../client/src/lib/share', () => ({
  downloadImage: vi.fn(),
  shareViaWebAPI: mocks.shareViaWebAPI,
}));

function readyItem(id: string): BatchAdItem {
  const now = Date.now();
  return {
    id,
    fileName: `${id}.jpg`,
    sourceUrl: `data:image/png;base64,${id}`,
    thumbnailUrl: `data:image/png;base64,${id}`,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
  };
}

function renderBatch(details = DEFAULT_AD_DETAILS) {
  return render(createElement(BatchWorkspace, {
    details,
    template: DEFAULT_TEMPLATE_SETTINGS,
    previewItems: [readyItem('product-one')],
    onDetailsChange: () => undefined,
    onBack: () => undefined,
    generateCloudText,
  }));
}

describe('نصوص الإعلان في وضع الدفعة', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderAd.mockResolvedValue('blob:batch-output');
    removeBackgroundLocally.mockResolvedValue({ imageUrl: 'blob:transparent-garment' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob(['output'], { type: 'image/png' }) })));
  });

  afterEach(() => cleanup());

  it('يحفظ النص المشترك مع النتيجة ويستخدمه عند المشاركة', async () => {
    renderBatch({ ...DEFAULT_AD_DETAILS, productName: 'فستان اختباري', marketingText: 'نص مشترك للمشاركة' });

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الدفعة' }));
    const field = await screen.findByLabelText('تعديل نص الإعلان 1');
    expect((field as HTMLTextAreaElement).value).toBe('نص مشترك للمشاركة');

    fireEvent.click(screen.getByRole('button', { name: 'مشاركة' }));
    await waitFor(() => expect(shareViaWebAPI).toHaveBeenCalledWith('blob:batch-output', 'إعلان 1', 'نص مشترك للمشاركة'));
  });

  it('ينشئ نصاً مستقلاً محلياً لكل صورة عند اختيار سياسة النص المستقل', async () => {
    renderBatch({ ...DEFAULT_AD_DETAILS, productName: 'جاكيت قطني', features: ['ناعم ومريح'], marketingText: '', marketingTextEngine: 'local' });

    fireEvent.click(screen.getByRole('button', { name: 'نص مستقل لكل صورة' }));
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الدفعة' }));

    const field = await screen.findByLabelText('تعديل نص الإعلان 1');
    expect((field as HTMLTextAreaElement).value).toContain('جاكيت قطني');
    expect(generateCloudText).not.toHaveBeenCalled();
  });

  it('يرجع للنص المحلي إذا فشل التحسين السحابي للنص المستقل ولا يوقف إنشاء الإعلان', async () => {
    generateCloudText.mockRejectedValueOnce(new Error('offline'));
    renderBatch({ ...DEFAULT_AD_DETAILS, productName: 'قميص رسمي', marketingText: '', marketingTextEngine: 'cloud' });

    fireEvent.click(screen.getByRole('button', { name: 'نص مستقل لكل صورة' }));
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الدفعة' }));

    const field = await screen.findByLabelText('تعديل نص الإعلان 1');
    expect(generateCloudText).toHaveBeenCalledTimes(1);
    expect((field as HTMLTextAreaElement).value).toContain('قميص رسمي');
    expect(renderAd).toHaveBeenCalledTimes(1);
    expect(screen.getByText('جاهز')).toBeTruthy();
  });

});
