import { describe, expect, it } from 'vitest';
import { calculateArtworkDrawBox } from '../client/src/lib/artworkCrop';

describe('محرر قص هوية المتجر', () => {
  it('يحتوي الصورة كاملة داخل تذييل عريض مهما كانت نسبتها الأصلية', () => {
    const result = calculateArtworkDrawBox(1000, 1000, 2688, 494, { fit: 'contain', positionX: 0, positionY: 0, zoom: 1 });
    expect(result.width).toBeCloseTo(494);
    expect(result.height).toBeCloseTo(494);
    expect(result.x).toBeGreaterThan(0);
  });

  it('يملأ مساحة التذييل ويقبل تحريك الجزء المقصوص عند اختيار الملء', () => {
    const centered = calculateArtworkDrawBox(1000, 1000, 2688, 494, { fit: 'cover', positionX: 0, positionY: 0, zoom: 1 });
    const moved = calculateArtworkDrawBox(1000, 1000, 2688, 494, { fit: 'cover', positionX: 0, positionY: 1, zoom: 1 });
    expect(centered.width).toBeCloseTo(2688);
    expect(centered.height).toBeGreaterThan(494);
    expect(moved.y).toBeLessThan(centered.y);
  });

  it('يمد الصورة إلى المقاس المطلوب فقط عند اختيار المط الصريح', () => {
    expect(calculateArtworkDrawBox(720, 720, 2688, 494, { fit: 'stretch', positionX: 0, positionY: 0, zoom: 1 })).toEqual({ x: 0, y: 0, width: 2688, height: 494 });
  });
});
