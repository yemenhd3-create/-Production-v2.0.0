// @vitest-environment jsdom
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GarmentCropEditor, { resizeCrop } from '../client/src/components/GarmentCropEditor';

describe('garment crop editor', () => {
  it('offers a crop step before local background removal with a safe original-image option', () => {
    const html = renderToStaticMarkup(createElement(GarmentCropEditor, {
      source: 'data:image/png;base64,placeholder',
      onSave: () => undefined,
      onUseOriginal: () => undefined,
    }));

    expect(html).toContain('اقصص الصورة قبل التجهيز');
    expect(html).toContain('حفظ القص والمتابعة');
    expect(html).toContain('استخدام الصورة كاملة');
    expect(html).toContain('اسحب داخل الإطار لتحريكه');
  });

  it('reveals free crop handles after the selected image loads', () => {
    render(createElement(GarmentCropEditor, {
      source: 'data:image/png;base64,placeholder',
      onSave: () => undefined,
      onUseOriginal: () => undefined,
    }));

    fireEvent.load(screen.getByAltText('الصورة المختارة للقص'));
    expect(screen.getByLabelText('زاوية القص العلوية اليمنى')).toBeTruthy();
    expect(screen.getByLabelText('حافة القص السفلية')).toBeTruthy();
    expect(screen.getByText('اسحب لتغيير موضع القص')).toBeTruthy();
  });

  it('moves and resizes the free crop without letting it leave the image', () => {
    const initial = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
    const resized = resizeCrop(initial, "nw", -0.1, 0.1);
    expect(resized.x).toBeCloseTo(0.1); expect(resized.y).toBeCloseTo(0.3); expect(resized.width).toBeCloseTo(0.7); expect(resized.height).toBeCloseTo(0.5);
    const moved = resizeCrop(initial, "move", 0.7, -0.4);
    expect(moved.x).toBeCloseTo(0.4); expect(moved.y).toBe(0); expect(moved.width).toBe(0.6); expect(moved.height).toBe(0.6);
  });
});
