// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PrivateKeyChat from '../client/src/components/PrivateKeyChat';

const mutateMock = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      privateKeyChat: {
        inspectBatch: {
          useMutation: (options: { onSuccess: (results: unknown[]) => void }) => ({
            isPending: false,
            mutate: (input: { rawKeys: string }) => {
              mutateMock(input);
              queueMicrotask(() => options.onSuccess([{
                index: 1,
                provider: 'gemini',
                providerLabel: 'Google Gemini API',
                state: 'valid',
                message: 'المفتاح صالح للاستدعاء في هذا الحساب. لم يُحفظ المفتاح.',
                suggestedUses: ['تقوية القائد المتصل للنصوص والتخطيط'],
              }]));
            },
          }),
        },
      },
    },
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('PrivateKeyChat', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('clears the submitted value from the visible private session immediately', () => {
    const rawKey = `AIza${'a'.repeat(32)}`;
    render(<PrivateKeyChat />);

    const input = screen.getByLabelText('دفعة مفاتيح API خاصة') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: rawKey } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الدفعة للفحص' }));

    expect(mutateMock).toHaveBeenCalledWith({ rawKeys: rawKey });
    expect(input.value).toBe('');
    expect(screen.queryByText(rawKey)).toBeNull();
    expect(document.body.textContent).not.toContain(rawKey);
  });

  it('clears visible session messages on demand', () => {
    render(<PrivateKeyChat />);
    fireEvent.click(screen.getByRole('button', { name: 'مسح محادثة المفاتيح' }));
    expect(screen.getByText(/ألصق دفعة المفاتيح مرة واحدة/)).not.toBeNull();
    expect(screen.getByText(/لا تظهر القيم في النتيجة ولا تحفظ/)).not.toBeNull();
  });
});
