// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false, loading: false }) }));
vi.mock('@/const', () => ({ startLogin: vi.fn() }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    personal: { access: { useQuery: () => ({ isLoading: false }) } },
    accessCodes: { redeem: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) } },
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import PersonalAccessGate from '../client/src/components/PersonalAccessGate';

describe('PersonalAccessGate PWA install entry', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Android 14; Mobile)' });
  });
  afterEach(() => cleanup());

  it('offers the phone install path before login, where a user can actually need it', () => {
    render(<PersonalAccessGate><p>محتوى محمي</p></PersonalAccessGate>);
    expect(screen.getByText('دخول إلى المساحة الشخصية')).toBeTruthy();
    expect(screen.getByText('ثبّت مولد الإعلانات على هاتفك')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'عرض خطوات التثبيت' })).toBeTruthy();
  });
});
