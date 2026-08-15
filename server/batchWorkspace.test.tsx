import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BatchWorkspace, { runWithConcurrency } from '../client/src/components/BatchWorkspace';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS } from '../shared/types';

describe('batch workspace', () => {
  it('presents a phone-safe batch workflow with ten-image limit and cleanup policy', () => {
    const html = renderToStaticMarkup(createElement(BatchWorkspace, {
      details: DEFAULT_AD_DETAILS,
      template: DEFAULT_TEMPLATE_SETTINGS,
      onDetailsChange: () => undefined,
      onBack: () => undefined,
    }));

    expect(html).toContain('إنشاء عدة إعلانات');
    expect(html).toContain('حتى 10 صور');
    expect(html).toContain('بالتوازي الآمن');
    expect(html).toContain('إضافة صور إلى الدفعة (0/10)');
    expect(html).not.toContain('نص مستقل لكل صورة');
  });

  it('shows independent product fields for each uploaded image while retaining shared defaults', () => {
    const now = Date.now();
    const html = renderToStaticMarkup(createElement(BatchWorkspace, {
      details: { ...DEFAULT_AD_DETAILS, productName: 'اسم عام' },
      template: DEFAULT_TEMPLATE_SETTINGS,
      onDetailsChange: () => undefined,
      onBack: () => undefined,
      previewItems: [
        { id: 'one', fileName: 'dress.jpg', sourceUrl: 'data:image/png;base64,a', thumbnailUrl: 'data:image/png;base64,a', status: 'ready', createdAt: now, updatedAt: now },
        { id: 'two', fileName: 'shirt.jpg', sourceUrl: 'data:image/png;base64,b', thumbnailUrl: 'data:image/png;base64,b', status: 'ready', createdAt: now, updatedAt: now },
      ],
    }));

    expect(html).toContain('اسم المنتج للصورة 1');
    expect(html).toContain('اسم المنتج للصورة 2');
    expect(html).toContain('نسخ الاسم والسعر والخصم إلى كل الصور');
    expect(html).toContain('value="اسم عام"');
  });

  it('يُظهر سياسة النص المشترك أو المستقل بعد إضافة صور إلى الدفعة', () => {
    const now = Date.now();
    const html = renderToStaticMarkup(createElement(BatchWorkspace, {
      details: DEFAULT_AD_DETAILS,
      template: DEFAULT_TEMPLATE_SETTINGS,
      onDetailsChange: () => undefined,
      onBack: () => undefined,
      previewItems: [{ id: 'one', fileName: 'dress.jpg', sourceUrl: 'data:image/png;base64,a', thumbnailUrl: 'data:image/png;base64,a', status: 'ready', createdAt: now, updatedAt: now }],
    }));

    expect(html).toContain('سياسة النص التسويقي للدفعة');
    expect(html).toContain('نص مشترك');
    expect(html).toContain('نص مستقل لكل صورة');
    expect(html).toContain('إزالة الخلفية محلياً لكل صورة');
  });

  it('يعالج عناصر الدفعة بتوازٍ محدود بدلاً من التسلسل أو فتح كل العمليات معاً', async () => {
    let active = 0;
    let peak = 0;
    const completed: number[] = [];
    await runWithConcurrency([1, 2, 3, 4, 5], 2, async item => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 2));
      completed.push(item);
      active -= 1;
    });

    expect(peak).toBe(2);
    expect(completed.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
