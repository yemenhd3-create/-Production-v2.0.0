import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AD_DETAILS,
  DEFAULT_TEMPLATE_SETTINGS,
  StorageKeys,
} from '../shared/types';
import {
  buildMarketingText,
  createLocalFallbackResult,
  deriveOldPrice,
  getCanvasDimensions,
  resolveTryOnVisualSource,
} from '../shared/adWorkflow';

describe('three-step advertisement workflow defaults', () => {
  it('allows a local advertisement to start without mandatory product fields', () => {
    expect(DEFAULT_AD_DETAILS.productName).toBe('');
    expect(DEFAULT_AD_DETAILS.price).toBe('');
    expect(DEFAULT_AD_DETAILS.features).toHaveLength(2);
  });

  it('keeps visual toggles enabled by default for the regular user', () => {
    expect(DEFAULT_TEMPLATE_SETTINGS).toMatchObject({
      size: 'portrait',
      showDiscount: true,
      showColors: true,
      showStoreInfo: true,
    });
  });

  it('uses separate local-storage keys for ad variables and template settings', () => {
    expect(StorageKeys.LAST_AD_DETAILS).not.toBe(StorageKeys.TEMPLATE_SETTINGS);
  });

  it('builds a local marketing message and a clear fallback state', () => {
    const text = buildMarketingText({
      ...DEFAULT_AD_DETAILS,
      productName: 'فستان بناتي',
      price: '5000',
      storeName: 'متجر مروان',
      storePhone: '770976559',
    });

    expect(text).toContain('فستان بناتي');
    expect(text).toContain('متجر مروان');
    expect(text).toContain('770976559');
    expect(createLocalFallbackResult()).toMatchObject({ status: 'fallback' });
  });

  it('keeps the local advertisement usable and explains why Try-On was skipped', () => {
    const fallback = createLocalFallbackResult('لا يوجد مزود Product to Model مفعّل في لوحة المطور');

    expect(fallback.status).toBe('fallback');
    expect(fallback.imageUrl).toBeUndefined();
    expect(fallback.message).toContain('لا يوجد مزود Product to Model مفعّل');
    expect(fallback.message).toContain('استخدمنا صورة القطعة الأصلية داخل القالب');
  });

  it('uses the original garment in Canvas when the Try-On request fails', async () => {
    const workflow = await resolveTryOnVisualSource(
      'blob:uploaded-garment',
      async () => { throw new Error('لا يوجد مزود مفعّل'); },
      async () => 'blob:unused'
    );

    expect(workflow.imageForCanvas).toBe('blob:uploaded-garment');
    expect(workflow.result.status).toBe('fallback');
    expect(workflow.result.message).toContain('لا يوجد مزود مفعّل');
  });

  it('uses the prepared Try-On image in Canvas when the cloud request succeeds', async () => {
    const workflow = await resolveTryOnVisualSource(
      'blob:uploaded-garment',
      async () => ({ imageUrl: '/manus-storage/tryon-result.png', providerId: 'provider-1', message: 'تم تلبيس القطعة بالذكاء الاصطناعي بنجاح.' }),
      async url => `blob:prepared-${url}`
    );

    expect(workflow.imageForCanvas).toBe('blob:prepared-/manus-storage/tryon-result.png');
    expect(workflow.imageForCanvas).not.toBe('blob:uploaded-garment');
    expect(workflow.result).toMatchObject({ status: 'success', imageUrl: '/manus-storage/tryon-result.png', providerId: 'provider-1' });
  });

  it('does not repeat the call to action when the price is omitted', () => {
    const text = buildMarketingText(DEFAULT_AD_DETAILS);
    expect(text.match(/اطلبها الآن قبل نفاد الكمية/g)).toHaveLength(1);
  });

  it('maps export sizes and calculates an old price only for valid discounts', () => {
    expect(getCanvasDimensions('portrait')).toEqual({ width: 1080, height: 1350 });
    expect(getCanvasDimensions('square')).toEqual({ width: 1080, height: 1080 });
    expect(getCanvasDimensions('story')).toEqual({ width: 1080, height: 1920 });
    expect(getCanvasDimensions('whatsapp')).toEqual({ width: 1080, height: 1440 });
    expect(getCanvasDimensions('landscape')).toEqual({ width: 1200, height: 628 });
    expect(deriveOldPrice('5000', '20')).toBe('6250');
    expect(deriveOldPrice('5000', '0')).toBe('');
  });
});
