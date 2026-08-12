import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

type Listener = (event: any) => void;
const workerSource = readFileSync(resolve(import.meta.dirname, '../client/public/sw.js'), 'utf8');

function createWorkerHarness(fetchImpl: ReturnType<typeof vi.fn>) {
  const listeners: Record<string, Listener> = {};
  const cache = { addAll: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue(['clothing-ad-generator-v2', 'clothing-ad-generator-v3']),
    delete: vi.fn().mockResolvedValue(true),
    match: vi.fn().mockResolvedValue(undefined),
  };
  const self = {
    addEventListener: vi.fn((name: string, handler: Listener) => { listeners[name] = handler; }),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(), matchAll: vi.fn().mockResolvedValue([]) },
    registration: { showNotification: vi.fn() },
  };
  const clients = { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn() };
  const evaluate = new Function('self', 'caches', 'fetch', 'location', 'clients', workerSource);
  evaluate(self, caches, fetchImpl, { origin: 'https://app.test' }, clients);
  return { listeners, cache, caches, self };
}

describe('PWA service worker behavior', () => {
  it('installs versioned shell assets and activates the newest worker', async () => {
    const harness = createWorkerHarness(vi.fn());
    let installation: Promise<unknown> | undefined;
    harness.listeners.install({ waitUntil: (promise: Promise<unknown>) => { installation = promise; } });
    await installation;

    expect(harness.cache.addAll).toHaveBeenCalledWith(['/', '/index.html', '/manifest.json']);
    expect(harness.self.skipWaiting).toHaveBeenCalled();
  });

  it('uses the network for navigations and returns a cached shell when offline', async () => {
    const onlineFetch = vi.fn().mockResolvedValue({ clone: () => ({}) });
    const online = createWorkerHarness(onlineFetch);
    let onlineResponse: Promise<unknown> | undefined;
    const request = { method: 'GET', url: 'https://app.test/', mode: 'navigate' };
    online.listeners.fetch({ request, respondWith: (promise: Promise<unknown>) => { onlineResponse = promise; } });
    await onlineResponse;
    expect(onlineFetch).toHaveBeenCalledWith(request);
    expect(online.cache.put).toHaveBeenCalled();

    const offlineFetch = vi.fn().mockRejectedValue(new Error('offline'));
    const offline = createWorkerHarness(offlineFetch);
    offline.caches.match.mockImplementation((value: unknown) => Promise.resolve(value === '/index.html' ? 'offline-shell' : undefined));
    let offlineResponse: Promise<unknown> | undefined;
    offline.listeners.fetch({ request, respondWith: (promise: Promise<unknown>) => { offlineResponse = promise; } });
    await expect(offlineResponse).resolves.toBe('offline-shell');
  });

  it('clears the runtime cache after a client CLEAR_CACHE message', async () => {
    const harness = createWorkerHarness(vi.fn());
    const postMessage = vi.fn();
    harness.listeners.message({ data: { type: 'CLEAR_CACHE' }, ports: [{ postMessage }] });
    await Promise.resolve();
    expect(harness.caches.delete).toHaveBeenCalledWith('clothing-ad-runtime-v3');
    expect(postMessage).toHaveBeenCalledWith({ success: true });
  });
});
