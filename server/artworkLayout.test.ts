import { describe, expect, it } from 'vitest';
import { clampArtworkTransform, getArtworkTransform, getDefaultArtworkTransform, getHeroZone } from '../shared/artworkLayout';
import { DEFAULT_TEMPLATE_SETTINGS, type TemplateSize } from '../shared/types';
import { PRACTICAL_HEADER_RATIO } from '../client/src/lib/brandArtworkSupport';

describe('هندسة طبقات الهوية', () => {
  it('يبقي الشعار والبانر داخل حدود القالب عند السحب أو التحجيم', () => {
    const clamped = clampArtworkTransform('logo', { x: .98, y: -.2, width: .8, height: .8, fit: 'cover' });
    expect(clamped.x).toBeLessThanOrEqual(.90);
    expect(clamped.y).toBe(0);
    expect(clamped.width).toBeLessThanOrEqual(1 - clamped.x);
    expect(clamped.height).toBeLessThanOrEqual(1 - clamped.y);
  });

  it('يحفظ موضع كل مقاس مستقلاً عن المقاسات الأخرى', () => {
    const settings = { ...DEFAULT_TEMPLATE_SETTINGS, artworkLayouts: { portrait: { header: { x: .22, y: .12, width: .6, height: .12, fit: 'contain' as const } } } };
    expect(getArtworkTransform(settings, 'header').x).toBe(.22);
    expect(getArtworkTransform({ ...settings, size: 'story' }, 'header').x).toBe(.14);
  });

  it('يعيد البانر إلى أعلى الملابس والتذييل إلى أسفلها عند محاولة تغطية منطقة البطل', () => {
    const header = clampArtworkTransform('header', { x: .25, y: .38, width: .5, height: .18, fit: 'contain' }, 'portrait');
    const footer = clampArtworkTransform('footer', { x: .2, y: .35, width: .6, height: .12, fit: 'stretch' }, 'portrait');
    expect(header.y + header.height).toBeLessThanOrEqual(.20);
    expect(footer.y).toBeGreaterThanOrEqual(.72);
  });

  it('يبقي كل طبقات الهوية خارج منطقة الملابس في المقاسات الخمسة', () => {
    (['portrait', 'square', 'story', 'whatsapp', 'landscape'] as TemplateSize[]).forEach((size) => {
      const hero = getHeroZone(size);
      (['header', 'footer', 'logo'] as const).forEach((layer) => {
        const result = clampArtworkTransform(layer, { x: hero.x + .08, y: hero.y + .08, width: .22, height: .16, fit: 'contain' }, size);
        const overlaps = result.x < hero.x + hero.width && result.x + result.width > hero.x && result.y < hero.y + hero.height && result.y + result.height > hero.y;
        expect(overlaps).toBe(false);
      });
    });
  });

  it('يجعل تذييل المتجر شريطاً كاملاً في الأسفل وبنسبة بانر 2688×494 في المقاسات الخمسة', () => {
    const dimensions: Record<TemplateSize, [number, number]> = { portrait: [1080, 1350], square: [1080, 1080], story: [1080, 1920], whatsapp: [1080, 1440], landscape: [1200, 628] };
    (Object.keys(dimensions) as TemplateSize[]).forEach((size) => {
      const footer = getDefaultArtworkTransform(size, 'footer');
      const [width, height] = dimensions[size];
      expect(footer.x).toBe(0);
      expect(footer.width).toBe(1);
      expect(footer.y + footer.height).toBeLessThanOrEqual(.98);
      expect((width * footer.width) / (height * footer.height)).toBeCloseTo(PRACTICAL_HEADER_RATIO, 1);
    });
  });
});
