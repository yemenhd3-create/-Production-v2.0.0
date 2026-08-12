// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS } from '../shared/types';
import { renderAd } from '../client/src/lib/canvasRenderer';

class LoadedImage {
  width = 600;
  height = 900;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decoding = 'async';
  crossOrigin = '';
  set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  decode() { return Promise.resolve(); }
}

function createContext() {
  const noop = () => undefined;
  return {
    fillRect: noop, stroke: noop, save: noop, restore: noop, beginPath: noop,
    arc: noop, fill: noop, fillText: noop, drawImage: noop, arcTo: noop,
    moveTo: noop, lineTo: noop, closePath: noop,
    measureText: (text: string) => ({ width: text.length * 12 }),
  } as unknown as CanvasRenderingContext2D;
}

describe('Canvas advertisement renderer', () => {
  const context = createContext();
  let createdCanvas: HTMLCanvasElement | null = null;

  beforeEach(() => {
    vi.stubGlobal('Image', LoadedImage);
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:rendered-advertisement') });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value(callback: BlobCallback) { callback(new Blob(['advertisement'], { type: 'image/png' })); },
    });
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'canvas') createdCanvas = element as HTMLCanvasElement;
      return element;
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders a PNG Blob URL at the requested export dimensions without mocking renderAd', async () => {
    const result = await renderAd(
      { ...DEFAULT_AD_DETAILS, productName: 'عباية عملية', price: '5000', discount: '20', storeName: 'متجر مروان' },
      { ...DEFAULT_TEMPLATE_SETTINGS, size: 'story' },
      'blob:garment-image',
      { width: 540, height: 960 }
    );

    expect(result).toBe('blob:rendered-advertisement');
    expect(createdCanvas?.width).toBe(540);
    expect(createdCanvas?.height).toBe(960);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });
});
