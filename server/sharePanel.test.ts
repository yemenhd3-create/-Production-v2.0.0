import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SharePanel from '../client/src/components/SharePanel';

describe('final advertisement share panel', () => {
  it('presents download, native share, WhatsApp, and edit actions', () => {
    const action = vi.fn();
    const html = renderToStaticMarkup(createElement(SharePanel, { onDownload: action, onShare: action, onWhatsApp: action, onEdit: action }));

    expect(html).toContain('تنزيل PNG');
    expect(html).toContain('مشاركة');
    expect(html).toContain('واتساب');
    expect(html).toContain('تعديل');
  });
});
