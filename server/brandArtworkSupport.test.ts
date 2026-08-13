import { describe, expect, it } from 'vitest';
import { getArtworkRatioError, PRACTICAL_HEADER_RATIO } from '../client/src/lib/brandArtworkSupport';

describe('مقاسات طبقات هوية المتجر', () => {
  it('يقبل تذييل ترند التربية العريض بنسبة 2688 × 494', () => {
    expect(PRACTICAL_HEADER_RATIO).toBeCloseTo(5.44, 2);
    expect(getArtworkRatioError('footer', PRACTICAL_HEADER_RATIO, PRACTICAL_HEADER_RATIO)).toBe('');
  });

  it('يرفض تذييل المتجر غير العريض', () => {
    expect(getArtworkRatioError('footer', 2, PRACTICAL_HEADER_RATIO)).toContain('التذييل');
  });
});
