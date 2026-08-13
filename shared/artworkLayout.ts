import type { ArtworkLayerKey, ArtworkLayerTransform, TemplateSettings, TemplateSize } from './types';

export const artworkLayerKeys: ArtworkLayerKey[] = ['footer', 'logo'];

const heroZones: Record<TemplateSize, { x: number; y: number; width: number; height: number }> = {
  portrait: { x: .17, y: .20, width: .66, height: .52 },
  square: { x: .17, y: .22, width: .66, height: .48 },
  story: { x: .17, y: .17, width: .66, height: .58 },
  whatsapp: { x: .17, y: .19, width: .66, height: .55 },
  landscape: { x: .07, y: .30, width: .48, height: .30 },
};

export function getHeroZone(size: TemplateSize) {
  return heroZones[size];
}

const defaults: Record<TemplateSize, Record<ArtworkLayerKey, ArtworkLayerTransform>> = {
  portrait: {
    header: { x: .14, y: .06, width: .72, height: .13, fit: 'contain' },
    footer: { x: 0, y: .83, width: 1, height: .147, fit: 'stretch' },
    logo: { x: .77, y: .07, width: .095, height: .075, fit: 'cover' },
  },
  square: {
    header: { x: .14, y: .06, width: .72, height: .15, fit: 'contain' },
    footer: { x: 0, y: .793, width: 1, height: .184, fit: 'stretch' },
    logo: { x: .77, y: .072, width: .095, height: .087, fit: 'cover' },
  },
  story: {
    header: { x: .14, y: .055, width: .72, height: .10, fit: 'contain' },
    footer: { x: 0, y: .872, width: 1, height: .103, fit: 'stretch' },
    logo: { x: .77, y: .063, width: .095, height: .058, fit: 'cover' },
  },
  whatsapp: {
    header: { x: .14, y: .06, width: .72, height: .12, fit: 'contain' },
    footer: { x: 0, y: .84, width: 1, height: .138, fit: 'stretch' },
    logo: { x: .77, y: .07, width: .095, height: .07, fit: 'cover' },
  },
  landscape: {
    header: { x: .20, y: .10, width: .34, height: .20, fit: 'contain' },
    footer: { x: 0, y: .627, width: 1, height: .351, fit: 'stretch' },
    logo: { x: .55, y: .10, width: .09, height: .17, fit: 'cover' },
  },
};

export function getDefaultArtworkTransform(size: TemplateSize, layer: ArtworkLayerKey): ArtworkLayerTransform {
  return { ...defaults[size][layer] };
}

export function getArtworkTransform(settings: TemplateSettings, layer: ArtworkLayerKey): ArtworkLayerTransform {
  return clampArtworkTransform(layer, { ...getDefaultArtworkTransform(settings.size, layer), ...settings.artworkLayouts?.[settings.size]?.[layer] }, settings.size);
}

export function clampArtworkTransform(layer: ArtworkLayerKey, candidate: ArtworkLayerTransform, size?: TemplateSize): ArtworkLayerTransform {
  const minimum = layer === 'logo' ? .06 : .14;
  const x = clamp(candidate.x, 0, .96 - minimum);
  const y = clamp(candidate.y, 0, .96 - minimum);
  const result = {
    ...candidate,
    x,
    y,
    width: clamp(candidate.width, minimum, 1 - x),
    height: clamp(candidate.height, minimum, 1 - y),
  };
  return size ? keepOutsideHero(layer, result, heroZones[size]) : result;
}

function keepOutsideHero(layer: ArtworkLayerKey, transform: ArtworkLayerTransform, hero: { x: number; y: number; width: number; height: number }) {
  if (!intersects(transform, hero)) return transform;
  const gap = .015;
  if (layer === 'footer') {
    const y = hero.y + hero.height + gap;
    const height = Math.min(transform.height, Math.max(.04, 1 - y));
    return { ...transform, y: Math.min(y, 1 - height), height };
  }
  const availableAbove = Math.max(.06, hero.y - gap);
  const height = Math.min(transform.height, availableAbove);
  return { ...transform, y: Math.max(0, hero.y - height - gap), height };
}

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
