import type { DesignDocument, DesignRepairPlan } from '@shared/designDocument';

export type PixelTruthStatus = 'pass' | 'warning' | 'block';
export type PixelTruthRegionId = 'header' | 'price' | 'footer';

export interface PixelTruthCheck {
  id: PixelTruthRegionId | 'render';
  status: PixelTruthStatus;
  contrastRatio: number | null;
  foregroundCoverage: number;
  detail: string;
}

export interface PixelTruthReport {
  version: 1;
  status: PixelTruthStatus;
  checks: PixelTruthCheck[];
  repairs: DesignRepairPlan[];
  sampledWidth: number;
  sampledHeight: number;
  privacy: { networkUsed: false; includedImage: false; includedPersonalFields: false };
}

type RegionDefinition = { id: PixelTruthRegionId; x: number; y: number; width: number; height: number; preferredForeground: 'dark' | 'light' };
type Rgb = { r: number; g: number; b: number };
const LOCAL_RENDER_PREFIXES = ['blob:', 'data:image/'] as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const toLinear = (channel: number) => {
  const normalized = channel / 255;
  return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
};
const luminance = ({ r, g, b }: Rgb) => (.2126 * toLinear(r)) + (.7152 * toLinear(g)) + (.0722 * toLinear(b));
const contrast = (first: number, second: number) => (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
const emptyReport = (detail: string): PixelTruthReport => ({ version: 1, status: 'warning', checks: [{ id: 'render', status: 'warning', contrastRatio: null, foregroundCoverage: 0, detail }], repairs: [], sampledWidth: 0, sampledHeight: 0, privacy: { networkUsed: false, includedImage: false, includedPersonalFields: false } });

export function isLocalRenderedUrl(renderedUrl: string) {
  return LOCAL_RENDER_PREFIXES.some(prefix => renderedUrl.startsWith(prefix));
}

export function getPixelTruthRegions(designDocument: DesignDocument): RegionDefinition[] {
  const byId = new Map(designDocument.elements.map(element => [element.id, element]));
  const regions: RegionDefinition[] = [];
  const add = (id: PixelTruthRegionId, preferredForeground: RegionDefinition['preferredForeground']) => {
    const element = byId.get(id);
    if (element?.visible) regions.push({ id, ...element.box, preferredForeground });
  };
  add('header', 'dark');
  add('price', 'light');
  add('footer', 'light');
  return regions;
}

function average(samples: Rgb[]) {
  const total = samples.reduce((sum, sample) => ({ r: sum.r + sample.r, g: sum.g + sample.g, b: sum.b + sample.b }), { r: 0, g: 0, b: 0 });
  return { r: total.r / samples.length, g: total.g / samples.length, b: total.b / samples.length };
}

function mostCommonColor(samples: Rgb[]) {
  const bins = new Map<string, { count: number; samples: Rgb[] }>();
  samples.forEach(sample => {
    const key = `${Math.round(sample.r / 16)}:${Math.round(sample.g / 16)}:${Math.round(sample.b / 16)}`;
    const current = bins.get(key) || { count: 0, samples: [] };
    current.count += 1;
    current.samples.push(sample);
    bins.set(key, current);
  });
  const dominant = Array.from(bins.values()).sort((first, second) => second.count - first.count)[0];
  return dominant ? average(dominant.samples) : average(samples);
}

function inspectRegion(pixels: Uint8ClampedArray, width: number, height: number, region: RegionDefinition): PixelTruthCheck {
  const startX = clamp(Math.floor(region.x * width), 0, width - 1);
  const startY = clamp(Math.floor(region.y * height), 0, height - 1);
  const endX = clamp(Math.ceil((region.x + region.width) * width), startX + 1, width);
  const endY = clamp(Math.ceil((region.y + region.height) * height), startY + 1, height);
  const samples: Rgb[] = [];
  for (let y = startY; y < endY; y += 1) for (let x = startX; x < endX; x += 1) {
    const offset = (y * width + x) * 4;
    const alpha = pixels[offset + 3] / 255;
    if (alpha < .04) continue;
    samples.push({ r: Math.round(pixels[offset] * alpha + 255 * (1 - alpha)), g: Math.round(pixels[offset + 1] * alpha + 255 * (1 - alpha)), b: Math.round(pixels[offset + 2] * alpha + 255 * (1 - alpha)) });
  }
  if (samples.length < 16) return { id: region.id, status: 'warning', contrastRatio: null, foregroundCoverage: 0, detail: 'لا توجد بكسلات كافية لفحص منطقة النص؛ راجع المعاينة.' };
  const background = mostCommonColor(samples);
  const backgroundLum = luminance(background);
  const candidate = samples.filter(sample => {
    const sampleLum = luminance(sample);
    return region.preferredForeground === 'dark'
      ? sampleLum < backgroundLum - .045
      : sampleLum > Math.max(backgroundLum + .045, .65);
  });
  const coverage = candidate.length / samples.length;
  if (coverage < .002) {
    const expectedInvisible = (region.preferredForeground === 'dark' && backgroundLum < .35) || (region.preferredForeground === 'light' && backgroundLum > .65);
    return expectedInvisible
      ? { id: region.id, status: 'block', contrastRatio: 1, foregroundCoverage: Number(coverage.toFixed(4)), detail: 'لون منطقة النص يطابق الخلفية تقريباً ولا يمكن تمييزه بصرياً.' }
      : { id: region.id, status: 'warning', contrastRatio: null, foregroundCoverage: Number(coverage.toFixed(4)), detail: 'لم يمكن عزل بكسلات النص بثقة في هذه المنطقة؛ لا يمنع التصدير.' };
  }
  const foregroundLum = luminance(average(candidate));
  const ratio = Number(contrast(foregroundLum, backgroundLum).toFixed(2));
  if (ratio < 3) return { id: region.id, status: 'block', contrastRatio: ratio, foregroundCoverage: Number(coverage.toFixed(4)), detail: `التباين المرئي ${ratio}:1 منخفض بصورة حرجة في منطقة النص.` };
  if (ratio < 4.5) return { id: region.id, status: 'warning', contrastRatio: ratio, foregroundCoverage: Number(coverage.toFixed(4)), detail: `التباين المرئي ${ratio}:1 يحتاج مراجعة، لكنه لا يمنع التصدير.` };
  return { id: region.id, status: 'pass', contrastRatio: ratio, foregroundCoverage: Number(coverage.toFixed(4)), detail: `التباين المرئي ${ratio}:1 مقبول في منطقة النص.` };
}

export function inspectPixelTruthPixels(width: number, height: number, pixels: Uint8ClampedArray, regions: RegionDefinition[]): PixelTruthReport {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || pixels.length < width * height * 4) return emptyReport('لا تتوفر بكسلات إعلان صالحة لفحص التباين.');
  if (!regions.length) return { ...emptyReport('لا توجد منطقة نص ظاهرة في الإعلان لفحصها.'), sampledWidth: width, sampledHeight: height };
  const checks = regions.map(region => inspectRegion(pixels, width, height, region));
  const hasBlock = checks.some(check => check.status === 'block');
  const hasWarning = checks.some(check => check.status === 'warning');
  const headerBlocked = checks.some(check => check.id === 'header' && check.status === 'block');
  return {
    version: 1,
    status: hasBlock ? 'block' : hasWarning ? 'warning' : 'pass',
    checks,
    repairs: headerBlocked ? [{ id: 'restore-readable-background', title: 'استعادة خلفية عنوان مقروءة', detail: 'يضبط خلفية القالب إلى الأبيض لاستعادة تباين عنوان الإعلان بصورة حتمية.', affectedElements: ['header'] }] : [],
    sampledWidth: width,
    sampledHeight: height,
    privacy: { networkUsed: false, includedImage: false, includedPersonalFields: false },
  };
}

export async function inspectRenderedPixelTruth(renderedUrl: string, designDocument: DesignDocument): Promise<PixelTruthReport> {
  if (!renderedUrl) return emptyReport('لا توجد صورة إعلان نهائية لفحصها.');
  if (!isLocalRenderedUrl(renderedUrl)) return emptyReport('يفحص Pixel Truth نتائج الإعلان المحلية فقط.');
  if (typeof createImageBitmap !== 'function') return emptyReport('لا يدعم هذا المتصفح قراءة بكسلات الإعلان محلياً.');
  try {
    const response = await fetch(renderedUrl);
    const blob = await response.blob();
    if (!response.ok || !blob.type.startsWith('image/')) return emptyReport('تعذر قراءة ملف الإعلان المحلي للفحص.');
    const bitmap = await createImageBitmap(blob);
    try {
      const sampledWidth = Math.min(1080, bitmap.width);
      const sampledHeight = Math.max(1, Math.round(bitmap.height * sampledWidth / bitmap.width));
      const canvas = document.createElement('canvas');
      canvas.width = sampledWidth;
      canvas.height = sampledHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return emptyReport('تعذر فتح مساحة البكسلات المحلية للفحص.');
      context.drawImage(bitmap, 0, 0, sampledWidth, sampledHeight);
      return inspectPixelTruthPixels(sampledWidth, sampledHeight, context.getImageData(0, 0, sampledWidth, sampledHeight).data, getPixelTruthRegions(designDocument));
    } finally {
      bitmap.close?.();
    }
  } catch {
    return emptyReport('تعذر فحص بكسلات الإعلان محلياً؛ لا يمنع ذلك التصدير.');
  }
}
