// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PwaInstallPrompt from '../client/src/components/PwaInstallPrompt';

type InstallEvent = Event & {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function dispatchInstallableEvent(prompt = vi.fn()) {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as InstallEvent;
  event.prompt = prompt;
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(event);
  return event;
}

describe('بطاقة تثبيت PWA', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false })) });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('تظهر فقط بعد أن يعلن المتصفح إمكانية تثبيت التطبيق وتستدعي نافذة التثبيت', async () => {
    render(createElement(PwaInstallPrompt));
    expect(screen.queryByText('ثبّت مولد الإعلانات على هاتفك')).toBeNull();

    await waitFor(() => expect(window.matchMedia).toHaveBeenCalled());
    const installEvent = dispatchInstallableEvent();
    expect(await screen.findByText('ثبّت مولد الإعلانات على هاتفك')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'تثبيت التطبيق' }));

    await waitFor(() => expect(installEvent.prompt).toHaveBeenCalled());
  });

  it('يخفي البطاقة لمدة أسبوع عند التأجيل', async () => {
    render(createElement(PwaInstallPrompt));
    await waitFor(() => expect(window.matchMedia).toHaveBeenCalled());
    dispatchInstallableEvent();
    await screen.findByText('ثبّت مولد الإعلانات على هاتفك');

    fireEvent.click(screen.getByRole('button', { name: 'تأجيل تثبيت التطبيق لمدة أسبوع' }));
    expect(screen.queryByText('ثبّت مولد الإعلانات على هاتفك')).toBeNull();
    expect(Number(localStorage.getItem('clothing_ad_install_dismissed_until'))).toBeGreaterThan(Date.now());
  });
});
