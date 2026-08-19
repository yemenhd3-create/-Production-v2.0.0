// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TryOnOptIn } from '../client/src/components/TryOnOptIn';

describe('TryOnOptIn', () => {
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
