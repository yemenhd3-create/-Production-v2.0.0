import { describe, expect, it } from 'vitest';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS, type TemplateSettings, type TemplateSize } from '../shared/types';
import { applyDesignRepair, compileDesignDocument } from '../client/src/lib/designCompiler';
import { evaluateDesignContract } from '../client/src/lib/designContract';

const details = {
  ...DEFAULT_AD_DETAILS,
  productName: 'فستان صيفي',
  price: '12000',
  storeName: 'متجر خاص',
  storePhone: '770000000',
};

const templateFor = (size: TemplateSize): TemplateSettings => ({
  ...DEFAULT_TEMPLATE_SETTINGS,
  size,
  showPrice: true,
  showStoreInfo: true,
});

describe('عقد التصميم المحلي', () => {
  it('ينتج وثيقة حتمية لا تحتوي الصورة أو بيانات المتجر', () => {
    const first = compileDesignDocument(details, templateFor('portrait'));
    const second = compileDesignDocument(details, templateFor('portrait'));
    const serialized = JSON.stringify(first);

    expect(first).toEqual(second);
    expect(first.privacy).toEqual({ includedImage: false, includedPersonalFields: false, networkUsed: false });
    expect(serialized).not.toContain(details.storeName);
    expect(serialized).not.toContain(details.storePhone);
    expect(first.elements.find(item => item.id === 'product')).toMatchObject({ required: true, visible: true });
  });

  it.each<TemplateSize>(['portrait', 'square', 'story', 'whatsapp', 'landscape'])('يمرر هندسة القالب الافتراضية للمقاس %s', size => {
    const report = evaluateDesignContract(compileDesignDocument(details, templateFor(size)));

    expect(report.status).toBe('pass');
    expect(report.checks).toHaveLength(6);
    expect(report.checks.every(check => check.status === 'pass')).toBe(true);
  });

  it('يكشف التذييل المتداخل مع السعر ويقترح إعادة موضعه الآمن', () => {
    const document = compileDesignDocument(details, templateFor('portrait'));
    const footer = document.elements.find(item => item.id === 'footer');
    const price = document.elements.find(item => item.id === 'price');
    if (!footer || !price) throw new Error('العناصر الافتراضية غير متاحة للاختبار.');
    footer.visible = true;
    footer.box = { ...price.box };

    const report = evaluateDesignContract(document);

    expect(report.status).toBe('fail');
    expect(report.checks.find(check => check.id === 'footer-avoids-price')).toMatchObject({ status: 'fail' });
    expect(report.repairs).toContainEqual(expect.objectContaining({ id: 'reset-footer-transform' }));
  });

  it('يكشف القطعة الخارجة من منطقة البطل ويقترح إعادة التحويل القياسي', () => {
    const document = compileDesignDocument(details, templateFor('square'));
    const product = document.elements.find(item => item.id === 'product');
    if (!product) throw new Error('عنصر القطعة غير متاح للاختبار.');
    product.box = { x: 0, y: 0, width: .3, height: .3 };

    const report = evaluateDesignContract(document);

    expect(report.checks.find(check => check.id === 'product-inside-hero')).toMatchObject({ status: 'fail' });
    expect(report.repairs).toContainEqual(expect.objectContaining({ id: 'reset-garment-transform' }));
  });

  it('يعيد الإصلاح الطبقة إلى موضعها الافتراضي ولا يغير الحقول الأخرى', () => {
    const custom: TemplateSettings = {
      ...templateFor('story'),
      smartBackgroundColor: '#abcdef',
      artworkLayouts: { story: { footer: { x: .4, y: .4, width: .2, height: .2, fit: 'contain' } } },
    };
    const repaired = applyDesignRepair(custom, 'reset-footer-transform');

    expect(repaired.smartBackgroundColor).toBe('#abcdef');
    expect(repaired.artworkLayouts?.story?.footer).toMatchObject({ x: 0, y: .872, width: 1, height: .103, fit: 'stretch' });
  });

  it('يحافظ على ارتفاع تذييل القصة الأصلي بدلاً من تمديده فوق منطقة المزايا', () => {
    const document = compileDesignDocument(details, { ...templateFor('story'), showFooterArtwork: true, footerArtwork: 'data:image/png;base64,AAA' });
    const footer = document.elements.find(item => item.id === 'footer');

    expect(footer?.box).toMatchObject({ y: .872, height: .103 });
  });
});
