import { describe, expect, it } from 'vitest';
import { assessCornerBackground } from '../client/src/lib/backgroundAssessment';

function pixels(width: number, height: number, color: [number, number, number]) {
  const values = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < values.length; offset += 4) {
    values[offset] = color[0]; values[offset + 1] = color[1]; values[offset + 2] = color[2]; values[offset + 3] = 255;
  }
  return values;
}

describe('التقييم المحافظ لخلفية الصورة', () => {
  it('يقترح الاحتفاظ بالصورة فقط حين تكون زوايا الخلفية متجانسة جداً', () => {
    expect(assessCornerBackground(pixels(32, 32, [248, 248, 248]), 32, 32)).toBe('simple');
  });

  it('لا يقترح التخطي عندما تختلف ألوان زوايا الخلفية', () => {
    const values = pixels(32, 32, [250, 250, 250]);
    for (let y = 24; y < 32; y += 1) for (let x = 24; x < 32; x += 1) {
      const offset = (y * 32 + x) * 4;
      values[offset] = 190; values[offset + 1] = 35; values[offset + 2] = 45;
    }
    expect(assessCornerBackground(values, 32, 32)).toBe('mixed');
  });
});
