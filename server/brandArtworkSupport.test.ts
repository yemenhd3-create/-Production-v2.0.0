import { describe, expect, it } from 'vitest';
import { getArtworkRatioError, PRACTICAL_HEADER_RATIO } from '../client/src/lib/brandArtworkSupport';

describe('مقاسات طبقات هوية المتجر', () => {
  it('يقبل بانر ترند التربية العريض بنسبة 2688 × 494', () => {
    expect(PRACTICAL_HEADER_RATIO).toBeCloseTo(5.44, 2);
    expect(getArtworkRatioError('header', PRACTICAL_HEADER_RATIO, 8.2)).toBe('');
  });

  it('يرفض بانر عنوان غير عريض ويستمر في التحقق الصارم للتذييل', () => {
    expect(getArtworkRatioError('header', 2, 8.2)).toContain('2688 × 494');
    expect(getArtworkRatioError('footer', 5.44, 8.2)).toContain('التذييل');
  });
});
