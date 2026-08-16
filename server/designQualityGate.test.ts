import { describe, expect, it } from 'vitest';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS, type TemplateSettings } from '../shared/types';
import type { DesignBenchmark } from '../shared/designBenchmark';
import { compileDesignDocument } from '../client/src/lib/designCompiler';
import { evaluateDesignContract } from '../client/src/lib/designContract';
import { canExportDesign, evaluateDesignQuality } from '../client/src/lib/designQualityGate';

const details = {
  ...DEFAULT_AD_DETAILS,
  productName: 'فستان صيفي أنيق',
  headline: 'تشكيلة جديدة',
  price: '12000',
  storeName: 'متجر الأناقة',
  storePhone: '770000000',
};

const template: TemplateSettings = { ...DEFAULT_TEMPLATE_SETTINGS, size: 'portrait', showPrice: true, showStoreInfo: true };
const benchmark: DesignBenchmark = {
  template: 'portrait', score: 100, safetyScore: 100, balanceScore: 100,
  metrics: { productVisibility: 100, textReadability: 100, contrast: 100, safeArea: 100, collisionFree: 100, footerSafety: 100, logoSafety: 100, cropQuality: 100, whitespaceBalance: 100 },
  violations: [], reasons: [], labels: ['best-overall'],
};

const reportFor = (nextDetails = details, nextTemplate = template, nextBenchmark: DesignBenchmark | undefined = benchmark) => {
  const document = compileDesignDocument(nextDetails, nextTemplate);
  return { document, report: evaluateDesignQuality(document, evaluateDesignContract(document), nextDetails, nextBenchmark) };
};

describe('بوابة جودة التصدير المحلية', () => {
  it('تسمح بالتصدير لتصميم سليم في المقاسات الخمسة', () => {
    (['portrait', 'square', 'story', 'whatsapp', 'landscape'] as const).forEach(size => {
      const currentTemplate = { ...template, size };
      const document = compileDesignDocument(details, currentTemplate);
      const report = evaluateDesignQuality(document, evaluateDesignContract(document), details);
      expect(report.exportAllowed).toBe(true);
      expect(canExportDesign(report)).toBe(true);
    });
  });

  it('يمنع التصدير عند تذييل يتداخل مع السعر داخل منطقة المحتوى', () => {
    const { document } = reportFor();
    const footer = document.elements.find(item => item.id === 'footer');
    const price = document.elements.find(item => item.id === 'price');
    if (!footer || !price) throw new Error('عناصر الاختبار غير متاحة.');
    footer.box = { ...price.box, y: price.box.y + 0.01 };

    const quality = evaluateDesignQuality(document, evaluateDesignContract(document), details, benchmark);

    expect(quality.exportAllowed).toBe(false);
    expect(quality.issues).toContainEqual(expect.objectContaining({ code: 'FOOTER_OVERLAP', severity: 'error' }));
  });

  it('يمنع التصدير عندما تحمل هندسة عنصر قيمة NaN أو Infinity', () => {
    const { document } = reportFor();
    const product = document.elements.find(item => item.id === 'product');
    if (!product) throw new Error('القطعة غير متاحة للاختبار.');
    product.box = { ...product.box, x: Number.NaN, height: Number.POSITIVE_INFINITY };

    const quality = evaluateDesignQuality(document, evaluateDesignContract(document), details, benchmark);

    expect(quality.exportAllowed).toBe(false);
    expect(quality.issues).toContainEqual(expect.objectContaining({ code: 'INVALID_NUMBER', severity: 'error' }));
  });

  it('يمنع التصدير عندما يخرج عنصر مرئي خارج حدود الإعلان', () => {
    const { document } = reportFor();
    const product = document.elements.find(item => item.id === 'product');
    if (!product) throw new Error('القطعة غير متاحة للاختبار.');
    product.box = { x: 1.01, y: .3, width: .2, height: .2 };

    const quality = evaluateDesignQuality(document, evaluateDesignContract(document), details, benchmark);

    expect(quality.exportAllowed).toBe(false);
    expect(quality.issues).toContainEqual(expect.objectContaining({ code: 'OUT_OF_BOUNDS', severity: 'error' }));
  });

  it('يعرض تحذيرات النص العربي الطويل والتباين المنخفض من دون منع التصدير', () => {
    const longArabicDetails = { ...details, productName: 'عباية عربية فاخرة مصممة للظهور في المناسبات الخاصة بتفاصيل ناعمة وقصة مريحة للغاية'.repeat(3) };
    const lowContrastBenchmark: DesignBenchmark = { ...benchmark, metrics: { ...benchmark.metrics, contrast: 40 } };
    const { report } = reportFor(longArabicDetails, template, lowContrastBenchmark);

    expect(report.exportAllowed).toBe(true);
    expect(report.issues.some(item => item.code === 'TEXT_OVERFLOW' && item.severity === 'warning')).toBe(true);
    expect(report.issues.some(item => item.code === 'LOW_CONTRAST' && item.severity === 'warning')).toBe(true);
  });

  it('يحسب الدرجة من أوزان الجودة المعلنة', () => {
    const { report } = reportFor();
    expect(report.score).toBe(100);
  });

  it('يبقى حتمياً ومحدوداً عبر ألف حالة هندسية متتابعة', () => {
    for (let index = 0; index < 1000; index += 1) {
      const document = compileDesignDocument(details, template);
      const product = document.elements.find(item => item.id === 'product');
      if (!product) throw new Error('القطعة غير متاحة للاختبار.');
      product.box = { x: (index % 115) / 100, y: (index % 97) / 100, width: .08 + (index % 7) / 100, height: .12 + (index % 9) / 100 };
      const contract = evaluateDesignContract(document);
      const first = evaluateDesignQuality(document, contract, details, benchmark);
      const second = evaluateDesignQuality(document, contract, details, benchmark);

      expect(first).toEqual(second);
      expect(Number.isFinite(first.score)).toBe(true);
      expect(first.score).toBeGreaterThanOrEqual(0);
      expect(first.score).toBeLessThanOrEqual(100);
    }
  });
});
