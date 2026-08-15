import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GarmentCropEditor from '../client/src/components/GarmentCropEditor';

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
    expect(html).toContain('تكبير منطقة الملابس');
  });
});
