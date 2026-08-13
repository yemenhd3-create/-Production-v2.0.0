import { describe, expect, it } from 'vitest';
import { formatLocalFirstDownloadSize, formatLocalModelSize, getLocalRemovalUnavailableMessage, normalizeU2NetMask } from '../client/src/lib/localBackgroundRemovalSupport';

describe('مساعدات إزالة الخلفية المحلية', () => {
  it('يحول قناع U2NetP إلى alpha يتدرج بين الشفافية والظهور', () => {
    expect(Array.from(normalizeU2NetMask([-2, 0, 2]))).toEqual([0, 128, 255]);
  });

  it('يحمي القناع المتساوي من نتائج غير صالحة', () => {
    expect(Array.from(normalizeU2NetMask([1, 1, 1]))).toEqual([0, 0, 0]);
  });

  it('يوضح تنزيل النموذج أو غياب WebAssembly بالعربية', () => {
    expect(formatLocalModelSize()).toBe('4.4MB');
    expect(formatLocalFirstDownloadSize()).toBe('17.2MB');
    expect(getLocalRemovalUnavailableMessage(new Error('MODEL_DOWNLOAD'))).toContain('تنزيل');
    expect(getLocalRemovalUnavailableMessage(new Error('WebAssembly is unavailable'))).toContain('WebAssembly');
  });
});
