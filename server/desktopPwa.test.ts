import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('desktop PWA manifest', () => {
  it('requests standalone desktop installation and keeps the app first-party', () => {
    const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../client/public/manifest.json'), 'utf8')) as Record<string, unknown>;
    expect(manifest.display).toBe('standalone');
    expect(manifest.display_override).toEqual(['window-controls-overlay', 'standalone']);
    expect(manifest.prefer_related_applications).toBe(false);
    expect(manifest.orientation).toBeUndefined();
  });

  it('provides local PNG fallback icons required by Chromium mobile installation', () => {
    const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../client/public/manifest.json'), 'utf8')) as { id?: string; icons?: Array<{ src: string; sizes: string; type: string }> };
    expect(manifest.id).toBe('/?source=pwa');
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' }),
    ]));
    expect(existsSync(resolve(import.meta.dirname, '../client/public/pwa-icon-192.png'))).toBe(true);
    expect(existsSync(resolve(import.meta.dirname, '../client/public/pwa-icon-512.png'))).toBe(true);
  });
});
