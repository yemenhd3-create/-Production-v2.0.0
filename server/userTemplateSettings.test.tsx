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

  it('يقبل بانر ترند التربية 2688×494 ثم شعاراً مربعاً ويحفظهما في الإعدادات', async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<UserTemplateSettings settings={DEFAULT_TEMPLATE_SETTINGS} onChange={onChange} onBack={vi.fn()} onAbout={vi.fn()} />);
    const fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');

    fireEvent.change(fileInputs[0], { target: { files: [new File(['banner'], 'trend-banner.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showHeaderArtwork: true, headerArtwork: 'data:image/jpeg;base64,user-brand' })));

    const afterBanner = onChange.mock.calls.at(-1)?.[0];
    rerender(<UserTemplateSettings settings={afterBanner} onChange={onChange} onBack={vi.fn()} onAbout={vi.fn()} />);
    fireEvent.change(container.querySelectorAll<HTMLInputElement>('input[type="file"]')[1], { target: { files: [new File(['logo'], 'trend-logo.png', { type: 'image/png' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showStoreLogo: true, storeLogoArtwork: 'data:image/jpeg;base64,user-brand', showHeaderArtwork: true })));
  });
});
