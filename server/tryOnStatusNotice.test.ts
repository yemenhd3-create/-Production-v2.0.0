import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { TryOnStatusNotice } from '../client/src/components/TryOnStatusNotice';

describe('Try-On status presentation', () => {
  it('shows the green success badge and the cloud result message', () => {
    const html = renderToStaticMarkup(createElement(TryOnStatusNotice, { result: { status: 'success', imageUrl: '/manus-storage/tryon.png', message: 'تم تلبيس القطعة بالذكاء الاصطناعي بنجاح.' } }));

    expect(html).toContain('data-tryon-status="success"');
    expect(html).toContain('تم تلبيس القطعة بالذكاء الاصطناعي بنجاح.');
    expect(html).toContain('emerald');
  });

  it('shows the amber fallback notice when cloud Try-On is unavailable', () => {
    const html = renderToStaticMarkup(createElement(TryOnStatusNotice, { result: { status: 'fallback', message: 'استخدمنا صورة القطعة الأصلية داخل القالب.' } }));

    expect(html).toContain('data-tryon-status="fallback"');
    expect(html).toContain('استخدمنا صورة القطعة الأصلية داخل القالب.');
    expect(html).toContain('amber');
  });

  it('shows an actionable red notice when no final result can be created', () => {
    const html = renderToStaticMarkup(createElement(TryOnStatusNotice, { result: { status: 'unavailable', message: 'تعذّر تجهيز الإعلان حالياً. تحقق من الصورة ثم أعد المحاولة.' } }));

    expect(html).toContain('data-tryon-status="unavailable"');
    expect(html).toContain('تحقق من الصورة');
    expect(html).toContain('red');
  });
});
