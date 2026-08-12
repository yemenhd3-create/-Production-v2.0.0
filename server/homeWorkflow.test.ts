// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mutateAsync = vi.fn();
const renderAd = vi.fn();
const removeFromStorage = vi.fn();

vi.mock('../client/src/lib/trpc', () => ({
  trpc: {
    tryOn: { run: { useMutation: () => ({ mutateAsync }) } },
    personal: { announcement: { useQuery: () => ({ data: null }) } },
  },
}));
vi.mock('../client/src/lib/canvasRenderer', () => ({ renderAd }));
vi.mock('../client/src/lib/storage', () => ({
  getFromStorage: () => undefined,
  saveToStorage: vi.fn(),
  removeFromStorage,
}));
vi.mock('../client/src/components/ImageUploader', async () => {
  const { createElement: h } = await import('react');
  return {
    default: ({ onImageSelect }: { onImageSelect: (url: string) => void }) => h('button', { type: 'button', onClick: () => onImageSelect('blob:product-original') }, 'رفع صورة اختبار'),
  };
});
vi.mock('../client/src/components/AdDetailsForm', async () => {
  const { createElement: h } = await import('react');
  return { default: () => h('div', null, 'نموذج بيانات الاختبار') };
});

const { default: Home } = await import('../client/src/pages/Home');

describe('Home Try-On workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    renderAd.mockResolvedValue('blob:final-ad');
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:prepared-tryon'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('fetch', vi.fn((url: string | URL | Request) => {
      const target = typeof url === 'string' ? url : url.toString();
      if (target === 'blob:product-original') return Promise.resolve({ ok: true, blob: async () => new Blob(['product'], { type: 'image/png' }) });
      if (target === '/manus-storage/tryon-result.png') return Promise.resolve({ ok: true, blob: async () => new Blob(['tryon'], { type: 'image/png' }) });
      if (target === 'blob:final-ad') return Promise.resolve({ ok: true, blob: async () => new Blob(['advertisement'], { type: 'image/png' }) });
      return Promise.reject(new Error(`Unexpected URL: ${target}`));
    }));
  });

  afterEach(() => cleanup());

  async function startGeneration() {
    render(createElement(Home));
    fireEvent.click(screen.getByRole('button', { name: 'رفع صورة اختبار' }));
    await screen.findByRole('button', { name: 'توليد الإعلان' });
    fireEvent.click(screen.getByRole('button', { name: 'توليد الإعلان' }));
  }

  it('falls back to the local garment canvas and explains the failure when Try-On rejects', async () => {
    mutateAsync.mockRejectedValue(new Error('لا يوجد مزود مفعّل'));

    await startGeneration();

    await screen.findByText(/استخدمنا صورة القطعة الأصلية داخل القالب/);
    expect(renderAd).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'blob:product-original', expect.anything());
    expect(screen.getByTestId('tryon-notice-fallback')).toBeTruthy();
  });

  it('passes the generated Try-On image to Canvas and shows the success badge', async () => {
    mutateAsync.mockResolvedValue({ imageUrl: '/manus-storage/tryon-result.png', providerId: 'provider-1', message: 'تم تلبيس القطعة بالذكاء الاصطناعي بنجاح.' });

    await startGeneration();

    await screen.findByText('تم تلبيس القطعة بالذكاء الاصطناعي بنجاح.');
    await waitFor(() => expect(renderAd).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'blob:prepared-tryon', expect.anything()));
    expect(screen.getByTestId('tryon-notice-success')).toBeTruthy();
  });

  it('lets the user return to editing and clear the completed advertising session', async () => {
    mutateAsync.mockRejectedValue(new Error('لا يوجد مزود مفعّل'));
    await startGeneration();

    await screen.findByRole('button', { name: 'تعديل' });
    fireEvent.click(screen.getAllByRole('button', { name: 'تعديل' })[0]);
    expect(screen.getByText('نموذج بيانات الاختبار')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /توليد الإعلان/ }));
    await screen.findByRole('button', { name: /مسح جلسة الإعلان/ });
    fireEvent.click(screen.getByRole('button', { name: /مسح جلسة الإعلان/ }));

    expect(await screen.findByRole('button', { name: 'رفع صورة اختبار' })).toBeTruthy();
    expect(removeFromStorage).toHaveBeenCalled();
  });

  it('keeps the completed advertisement editable after system share or WhatsApp handoff', async () => {
    mutateAsync.mockRejectedValue(new Error('لا يوجد مزود مفعّل'));
    await startGeneration();
    await screen.findByRole('button', { name: 'مشاركة' });

    const nativeShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare });
    fireEvent.click(screen.getByRole('button', { name: 'مشاركة' }));
    await waitFor(() => expect(nativeShare).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole('button', { name: 'تعديل' })[0]);
    expect(screen.getByText('نموذج بيانات الاختبار')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /توليد الإعلان/ }));
    await screen.findByRole('button', { name: 'واتساب' });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    const openWindow = vi.spyOn(window, 'open').mockImplementation(() => null);
    fireEvent.click(screen.getByRole('button', { name: 'واتساب' }));
    await waitFor(() => expect(openWindow).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole('button', { name: 'تعديل' })[0]);
    expect(screen.getByText('نموذج بيانات الاختبار')).toBeTruthy();
  });
});
