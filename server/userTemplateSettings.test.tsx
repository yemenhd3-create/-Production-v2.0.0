// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserTemplateSettings from '../client/src/components/UserTemplateSettings';
import { DEFAULT_TEMPLATE_SETTINGS } from '../shared/types';

describe('طبقات هوية المتجر في الإعدادات', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', class {
      width = 2688;
      height = 494;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_: string) { queueMicrotask(() => this.onload?.()); }
    });
    vi.stubGlobal('FileReader', class {
      result: string | null = 'data:image/jpeg;base64,user-brand';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() { queueMicrotask(() => this.onload?.()); }
    });
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:user-banner'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
  });

  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('يقبل شعاراً مربعاً ثم تذييل ترند التربية 2688×494 ويحفظهما في الإعدادات', async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<UserTemplateSettings settings={DEFAULT_TEMPLATE_SETTINGS} onChange={onChange} onBack={vi.fn()} onAbout={vi.fn()} />);
    const fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(fileInputs).toHaveLength(2);
    expect(container.textContent).not.toContain('رفع بانر العنوان');
    expect(container.textContent).not.toContain('إطار القالب');

    fireEvent.change(fileInputs[0], { target: { files: [new File(['logo'], 'trend-logo.png', { type: 'image/png' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showStoreLogo: true, storeLogoArtwork: 'data:image/jpeg;base64,user-brand' })));

    const afterLogo = onChange.mock.calls.at(-1)?.[0];
    rerender(<UserTemplateSettings settings={afterLogo} onChange={onChange} onBack={vi.fn()} onAbout={vi.fn()} />);
    fireEvent.change(container.querySelectorAll<HTMLInputElement>('input[type="file"]')[1], { target: { files: [new File(['footer'], 'trend-footer.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showFooterArtwork: true, footerArtwork: 'data:image/jpeg;base64,user-brand', showStoreLogo: true })));
  });
});
