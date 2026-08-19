// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TryOnOptIn } from '../client/src/components/TryOnOptIn';

describe('TryOnOptIn', () => {
  afterEach(cleanup);

  it('offers the Kolors demo as an external opt-in without requesting a cloud preview', () => {
    const onRequest = vi.fn();
    render(createElement(TryOnOptIn, {
      isRunning: false,
      preview: null,
      onRequest,
      onCancel: vi.fn(),
      onAcceptPreview: vi.fn(),
      onRejectPreview: vi.fn(),
    }));

    const link = screen.getByTestId('kolors-external-open');
    expect(link.getAttribute('href')).toBe('https://kwai-kolors-kolors-virtual-try-on.hf.space/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('does not request a cloud preview until the user opens the feature and gives explicit consent', () => {
    const onRequest = vi.fn();
    render(createElement(TryOnOptIn, {
      isRunning: false,
      preview: null,
      onRequest,
      onCancel: vi.fn(),
      onAcceptPreview: vi.fn(),
      onRejectPreview: vi.fn(),
    }));

    fireEvent.click(screen.getByTestId('tryon-open'));
    const submit = screen.getByRole('button', { name: 'أوافق وأطلب المعاينة' });
    expect(submit.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(submit);

    expect(onRequest).toHaveBeenCalledWith({ presentation: 'women-fashion', pose: 'studio-standing' });
  });

  it('keeps a non-transparent result as review only and lets the user keep the original image', () => {
    const onRejectPreview = vi.fn();
    render(createElement(TryOnOptIn, {
      isRunning: false,
      preview: { status: 'success', imageUrl: 'https://example.test/on-model.png', message: 'تمت المعاينة', isTransparent: false },
      onRequest: vi.fn(),
      onCancel: vi.fn(),
      onAcceptPreview: vi.fn(),
      onRejectPreview,
    }));

    expect(screen.getByRole('button', { name: 'استخدم داخل القالب' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'استخدم الصورة الأصلية' }));
    expect(onRejectPreview).toHaveBeenCalledOnce();
  });
});
