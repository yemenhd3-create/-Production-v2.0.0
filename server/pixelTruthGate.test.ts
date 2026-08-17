import { describe, expect, it } from 'vitest';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS, type TemplateSize } from '../shared/types';
import { applyDesignRepair, compileDesignDocument } from '../client/src/lib/designCompiler';
import { getPixelTruthRegions, inspectPixelTruthPixels, inspectRenderedPixelTruth } from '../client/src/lib/pixelTruthGate';

const details = { ...DEFAULT_AD_DETAILS, productName: 'عباية عربية', headline: 'تصميم أنيق', price: '12000', storeName: 'متجر الأناقة', storePhone: '770000000' };

function pixels(width: number, height: number, background: [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = background[0]; data[offset + 1] = background[1]; data[offset + 2] = background[2]; data[offset + 3] = 255;
  }
  return data;
}

function paint(data: Uint8ClampedArray, width: number, x: number, y: number, regionWidth: number, regionHeight: number, color: [number, number, number]) {
  for (let row = y; row < y + regionHeight; row += 1) for (let column = x; column < x + regionWidth; column += 1) {
    const offset = (row * width + column) * 4;
    data[offset] = color[0]; data[offset + 1] = color[1]; data[offset + 2] = color[2]; data[offset + 3] = 255;
  }
}

const headerRegion = { id: 'header' as const, x: 0, y: 0, width: 1, height: 1, preferredForeground: 'dark' as const };

describe('Pixel Truth Gate', () => {
  it('يصنف نصاً أسود على خلفية بيضاء كـ PASS من البكسلات الفعلية', () => {
    const data = pixels(100, 60, [255, 255, 255]);
    paint(data, 100, 20, 20, 20, 8, [0, 0, 0]);

    const report = inspectPixelTruthPixels(100, 60, data, [headerRegion]);

    expect(report.status).toBe('pass');
    expect(report.checks[0]).toMatchObject({ status: 'pass' });
    expect(report.checks[0]?.contrastRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('يصنف نصاً فاتحاً على خلفية فاتحة كـ BLOCK ويقترح إصلاحاً حتمياً', () => {
    const data = pixels(100, 60, [248, 248, 248]);
    paint(data, 100, 20, 20, 20, 8, [228, 228, 228]);

    const report = inspectPixelTruthPixels(100, 60, data, [headerRegion]);

    expect(report.status).toBe('block');
    expect(report.checks[0]).toMatchObject({ status: 'block' });
    expect(report.repairs).toContainEqual(expect.objectContaining({ id: 'restore-readable-background' }));
  });

  it('يستخرج تباين النص من منطقة ذات خلفية متعددة الألوان بدلاً من افتراض لون ثابت', () => {
    const data = pixels(100, 60, [210, 30, 40]);
    for (let x = 0; x < 100; x += 2) paint(data, 100, x, 0, 1, 60, [178, 22, 32]);
    paint(data, 100, 24, 20, 22, 8, [255, 255, 255]);

    const report = inspectPixelTruthPixels(100, 60, data, [{ ...headerRegion, preferredForeground: 'light' }]);

    expect(report.status).toBe('pass');
    expect(report.checks[0]?.contrastRatio).toBeGreaterThanOrEqual(4.5);
  });

  it.each<TemplateSize>(['portrait', 'square', 'story', 'whatsapp', 'landscape'])('يحدد مناطق النص للمقاس %s من هندسة القالب الفعلية', size => {
    const document = compileDesignDocument(details, { ...DEFAULT_TEMPLATE_SETTINGS, size, showPrice: true, showStoreInfo: true });
    const regions = getPixelTruthRegions(document);

    expect(regions.map(region => region.id)).toEqual(expect.arrayContaining(['header', 'price', 'footer']));
    expect(regions.every(region => region.width > 0 && region.height > 0)).toBe(true);
  });

  it('يختار قطبية نص فاتحة لعنوان نمط Midnight حتى لا يحجب النص الأبيض الصحيح على الخلفية الداكنة', () => {
    const document = compileDesignDocument(details, { ...DEFAULT_TEMPLATE_SETTINGS, visualTheme: 'midnight' });
    const header = getPixelTruthRegions(document).find(region => region.id === 'header');

    expect(header?.preferredForeground).toBe('light');
  });

  it('يمنح PASS لبكسلات عنوان Midnight البيضاء على خلفية داكنة فعلية', () => {
    const document = compileDesignDocument(details, { ...DEFAULT_TEMPLATE_SETTINGS, visualTheme: 'midnight', showPrice: false, showStoreInfo: false });
    const header = getPixelTruthRegions(document).find(region => region.id === 'header');
    const data = pixels(100, 60, [18, 24, 38]);
    paint(data, 100, 20, 20, 20, 8, [248, 250, 252]);

    const report = inspectPixelTruthPixels(100, 60, data, header ? [{ ...header, x: 0, y: 0, width: 1, height: 1 }] : []);

    expect(report.status).toBe('pass');
    expect(report.checks[0]?.contrastRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('يبقى حتمياً للنص RTL نفسه ولا ينهار عند غياب الإعلان النهائي أو محاولة رابط شبكة', async () => {
    const data = pixels(100, 60, [255, 255, 255]);
    paint(data, 100, 18, 18, 24, 9, [42, 40, 101]);
    const first = inspectPixelTruthPixels(100, 60, data, [headerRegion]);
    const second = inspectPixelTruthPixels(100, 60, data, [headerRegion]);
    const noRender = await inspectRenderedPixelTruth('', compileDesignDocument(details, DEFAULT_TEMPLATE_SETTINGS));
    const remoteRender = await inspectRenderedPixelTruth('https://example.invalid/ad.png', compileDesignDocument(details, DEFAULT_TEMPLATE_SETTINGS));

    expect(first).toEqual(second);
    expect(first.status).toBe('pass');
    expect(noRender.status).toBe('warning');
    expect(noRender.checks[0]?.id).toBe('render');
    expect(remoteRender.status).toBe('warning');
    expect(remoteRender.privacy.networkUsed).toBe(false);
  });

  it('يعيد إصلاح التباين الحتمي خلفية القالب إلى الأبيض من دون تغيير المقاس', () => {
    const repaired = applyDesignRepair({ ...DEFAULT_TEMPLATE_SETTINGS, size: 'story', smartBackgroundColor: '#F8F8F8' }, 'restore-readable-background');

    expect(repaired.smartBackgroundColor).toBe('#FFFFFF');
    expect(repaired.size).toBe('story');
  });

  it('يقترح إصلاحاً تلقائياً للعنوان فقط ولا يعرض إصلاح السعر أو التذييل', () => {
    const pixels = new Uint8ClampedArray(100 * 60 * 4).fill(255);
    const regions = [
      { id: 'price' as const, x: 0, y: 0, width: 1, height: 1, preferredForeground: 'light' as const },
    ];
    const report = inspectPixelTruthPixels(100, 60, pixels, regions);

    expect(report.status).toBe('block');
    expect(report.repairs).toEqual([]);
  });
});
