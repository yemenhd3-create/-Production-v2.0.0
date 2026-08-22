import { describe, expect, it } from 'vitest';
import { countMask, createFloodMask, createLassoMask, eraseMask } from '../client/src/lib/imageRefinement';

describe('image refinement primitives', () => {
  it('selects only connected pixels inside the requested color tolerance', () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 250, 250, 250, 255, 20, 20, 20, 255,
      255, 255, 255, 255, 248, 248, 248, 255, 20, 20, 20, 255,
      15, 15, 15, 255, 15, 15, 15, 255, 20, 20, 20, 255,
    ]);
    const mask = createFloodMask(pixels, 3, 3, 0, 0, 12);
    expect(Array.from(mask)).toEqual([1, 1, 0, 1, 1, 0, 0, 0, 0]);
  });

  it('creates a mask for a lasso polygon and clears only selected alpha pixels', () => {
    const mask = createLassoMask(4, 4, [{ x: .2, y: .2 }, { x: 2.8, y: .2 }, { x: .2, y: 2.8 }]);
    expect(countMask(mask)).toBeGreaterThan(1);
    const pixels = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    const result = eraseMask(pixels, mask);
    expect(result[3]).toBe(0);
    expect(result[(3 * 4 + 3) * 4 + 3]).toBe(255);
  });

  it('returns an empty mask for a selection outside the image', () => {
    const pixels = new Uint8ClampedArray(2 * 2 * 4).fill(255);
    expect(countMask(createFloodMask(pixels, 2, 2, -1, 0, 10))).toBe(0);
  });
});
