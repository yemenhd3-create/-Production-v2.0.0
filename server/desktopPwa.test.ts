import { readFileSync } from 'node:fs';
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
});
