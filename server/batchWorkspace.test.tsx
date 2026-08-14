import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BatchWorkspace from '../client/src/components/BatchWorkspace';
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
    expect(html).toContain('واحدة بعد أخرى');
    expect(html).toContain('إضافة صور إلى الدفعة (0/10)');
  });
});
