import { describe, expect, it } from 'vitest';
import { getImagePreparationErrorMessage } from '../client/src/lib/imageUploadSupport';

describe('رسائل أخطاء رفع صور الهاتف', () => {
  it('يعرض إرشاداً خاصاً عند فشل موفر ملفات Android في القراءة', () => {
    const message = getImagePreparationErrorMessage(new Error('FILE_READ_UNAVAILABLE'));
    expect(message).toContain('حفظ نسخة');
    expect(message).toContain('التقاط صورة');
  });

  it('يحافظ على رسالة آمنة وعامة للأخطاء الأخرى', () => {
    expect(getImagePreparationErrorMessage(new Error('canvas unavailable'))).toContain('JPG أو PNG');
  });
});
