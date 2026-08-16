import { describe, expect, it } from 'vitest';
import {
  createPassportChecks,
  inspectRenderedPixels,
  isLocalRenderedUrl,
  passportFilename,
  sha256Hex,
} from '../client/src/lib/designPassport';

function rgba(...pixels: Array<[number, number, number, number]>): Uint8ClampedArray {
  return new Uint8ClampedArray(pixels.flat());
}

describe('جواز التصميم المحلي', () => {
  it('يقبل مخرجات Canvas المحلية فقط ويرفض روابط الشبكة', () => {
    expect(isLocalRenderedUrl('blob:local-final-ad')).toBe(true);
    expect(isLocalRenderedUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isLocalRenderedUrl('https://example.com/ad.png')).toBe(false);
    expect(isLocalRenderedUrl('/manus-storage/ad.png')).toBe(false);
  });

  it('يكشف اختلاف أبعاد ناتج الرسم بعد التصدير كفشل صريح', () => {
    const inspection = inspectRenderedPixels(2, 2, rgba(
      [120, 120, 120, 255], [130, 130, 130, 255],
      [140, 140, 140, 255], [150, 150, 150, 255],
    ));
    const dimensions = createPassportChecks(inspection, { width: 1080, height: 1350 }).find(check => check.id === 'dimensions');

    expect(dimensions).toMatchObject({ status: 'fail', value: 0, detail: '2×2 مقابل 1080×1350' });
  });

  it('يصدر تحذيراً للناتج الأبيض المتجانس بدلاً من ادعاء أنه إعلان كامل', () => {
    const inspection = inspectRenderedPixels(2, 2, rgba(
      [255, 255, 255, 255], [255, 255, 255, 255],
      [255, 255, 255, 255], [255, 255, 255, 255],
    ));
    const checks = createPassportChecks(inspection, { width: 2, height: 2 });

    expect(checks.find(check => check.id === 'content')).toMatchObject({ status: 'warn', value: 0 });
    expect(checks.find(check => check.id === 'luminance')).toMatchObject({ status: 'warn', value: 100 });
  });

  it('يصدر تحذيراً للناتج الشفاف تماماً حتى لو كان له أبعاد صحيحة', () => {
    const inspection = inspectRenderedPixels(2, 2, rgba(
      [0, 0, 0, 0], [0, 0, 0, 0],
      [0, 0, 0, 0], [0, 0, 0, 0],
    ));
    const content = createPassportChecks(inspection, { width: 2, height: 2 }).find(check => check.id === 'content');

    expect(inspection.transparentRatio).toBe(1);
    expect(content).toMatchObject({ status: 'warn', value: 0 });
  });

  it('يمرر ناتجاً متنوعاً بصرياً وسطوعه متوسط', () => {
    const inspection = inspectRenderedPixels(2, 2, rgba(
      [30, 30, 30, 255], [90, 120, 160, 255],
      [160, 110, 70, 255], [220, 220, 220, 255],
    ));
    const checks = createPassportChecks(inspection, { width: 2, height: 2 });

    expect(checks.find(check => check.id === 'content')).toMatchObject({ status: 'pass' });
    expect(checks.find(check => check.id === 'luminance')).toMatchObject({ status: 'pass' });
    expect(checks.find(check => check.id === 'privacy')).toMatchObject({ status: 'pass', value: 100 });
  });

  it('ينتج بصمة SHA-256 ثابتة ويحتفظ باسم تنزيل عربي آمن', async () => {
    await expect(sha256Hex(new Blob(['hello'], { type: 'text/plain' }))).resolves.toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(passportFilename('فستان صيفي / 2026')).toBe('فستان-صيفي-2026-جواز-التصميم.json');
  });
});
