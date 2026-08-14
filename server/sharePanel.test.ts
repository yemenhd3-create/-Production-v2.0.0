import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SharePanel from '../client/src/components/SharePanel';

describe('final advertisement share panel', () => {
  it('presents download, native share, WhatsApp, and edit actions', () => {
    const action = vi.fn();
    const html = renderToStaticMarkup(createElement(SharePanel, { onDownload: action, onShare: action, onWhatsApp: action, onEdit: action, onClear: action }));

    expect(html).toContain('حفظ في الهاتف');
    expect(html).toContain('مشاركة أخرى');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('تعديل');
    expect(html).toContain('مسح جلسة الإعلان');
  });
});
