import type {
  AdDetails,
  DesignColorSwatch,
  DesignDecisionReason,
  DesignLayoutCandidate,
  DesignSuggestion,
  GarmentDesignTransform,
  TemplateSize,
} from '@shared/types';
import { loadPreferenceProfile, rankCompositionCandidates } from './localArtDirectorPreferences';

export type LocalImageMetrics = {
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  foreground: { x: number; y: number; width: number; height: number; coverage: number };
  colors: DesignColorSwatch[];
};

const SAMPLE_EDGE = 224;
const COLOR_NAMES: Array<{ hex: string; label: string }> = [
  { hex: '#111111', label: 'أسود' }, { hex: '#FFFFFF', label: 'أبيض' }, { hex: '#C62828', label: 'أحمر' },
  { hex: '#1565C0', label: 'أزرق' }, { hex: '#2E7D32', label: 'أخضر' }, { hex: '#7B1FA2', label: 'بنفسجي' },
  { hex: '#F57C00', label: 'برتقالي' }, { hex: '#8B5E3C', label: 'بني' }, { hex: '#78909C', label: 'رمادي' },
  { hex: '#F4C2C2', label: 'زهري فاتح' }, { hex: '#F5F5DC', label: 'بيج' }, { hex: '#00838F', label: 'تركوازي' },
];

const SIZE_LABELS: Record<TemplateSize, string> = {
  portrait: 'عمودي', square: 'مربع', story: 'قصة', whatsapp: 'واتساب', landscape: 'أفقي',
};

/** يبدأ فقط بعد اختيار صورة؛ لا يستخدم شبكة أو نموذجاً خارجياً. */
export async function createLocalDesignSuggestion(source: string, details: AdDetails): Promise<DesignSuggestion> {
  const metrics = await inspectImageLocally(source);
  return createSuggestionFromMetrics(metrics, details);
}

/** يفحص الصورة محلياً لإتاحة إعادة استعمال القياسات الصغيرة من Cache من دون حفظ الصورة نفسها. */
export async function inspectLocalImageMetrics(source: string): Promise<LocalImageMetrics> {
  return inspectImageLocally(source);
}

/** دالة حتمية للاختبارات: نفس القياسات والبيانات تعني النتيجة نفسها باستثناء وقت الإنشاء. */
export function createSuggestionFromMetrics(metrics: LocalImageMetrics, details: AdDetails, generatedAt = Date.now()): DesignSuggestion {
  const warnings = qualityWarnings(metrics);
  const qualityScore = scoreQuality(metrics);
  const crop = decideSafeCrop(metrics.foreground);
  const candidates = rankLayoutCandidates(metrics);
  const profile = loadPreferenceProfile();
  const compositionScores = rankCompositionCandidates(candidates, qualityScore, profile);
  const rankedCandidates = compositionScores.map(composition => {
    const original = candidates.find(candidate => candidate.size === composition.size) || fallbackCandidate();
    return { ...original, score: composition.score, reasons: [...original.reasons, composition.reason] };
  });
  const selected = rankedCandidates[0] || fallbackCandidate();
  const suggestedBackground = chooseReadableBackground(metrics.colors);
  const suggestedTextColor = contrastRatio(suggestedBackground, '#2A2865') >= 4.5 ? '#2A2865' : '#111111';
  const suggestedText = buildEvidenceBoundText(details);
  const confidence = Math.round(clamp(48 + qualityScore * .35 + Math.min(16, metrics.colors.length * 4), 45, 94));

  return {
    version: 1,
    status: qualityScore < 48 || warnings.length >= 4 ? 'degraded' : 'ready',
    generatedAt,
    confidence,
    warnings,
    quality: { score: qualityScore, verdict: verdictFor(qualityScore), brightness: round(metrics.brightness), contrast: round(metrics.contrast), sharpness: round(metrics.sharpness) },
    foreground: metrics.foreground,
    crop,
    colors: metrics.colors.slice(0, 3),
    suggestedBackground,
    suggestedTextColor,
    selectedLayout: selected.size,
    candidates: rankedCandidates.slice(0, 3),
    suggestedText,
    compositionScores,
    preferenceApplied: profile.enabled && (Object.keys(profile.acceptedLayouts).length > 0 || Object.keys(profile.rejectedLayouts).length > 0),
  };
}

export function rankLayoutCandidates(metrics: Pick<LocalImageMetrics, 'width' | 'height' | 'foreground'>): DesignLayoutCandidate[] {
  const sourceRatio = metrics.width / Math.max(1, metrics.height);
  const subjectRatio = metrics.foreground.width / Math.max(.01, metrics.foreground.height);
  const coverage = metrics.foreground.coverage;
  const sizes: TemplateSize[] = ['portrait', 'square', 'story', 'whatsapp', 'landscape'];
  return sizes.map(size => {
    const targetRatio: Record<TemplateSize, number> = { portrait: .8, square: 1, story: .5625, whatsapp: .75, landscape: 1.91 };
    const ratioFit = clamp(100 - Math.abs(Math.log(Math.max(.08, sourceRatio) / targetRatio[size])) * 52, 0, 100);
    const coverageScore = clamp(100 - Math.abs(coverage - preferredCoverage(size)) * 185, 0, 100);
    const subjectFit = size === 'landscape'
      ? clamp(100 - Math.abs(subjectRatio - 1.3) * 45, 0, 100)
      : clamp(100 - Math.abs(subjectRatio - .72) * 38, 0, 100);
    const safeScore = coverage > .08 && coverage < .9 ? 100 : 48;
    const score = Math.round(ratioFit * .42 + coverageScore * .27 + subjectFit * .19 + safeScore * .12);
    const garmentTransform = transformFor(size, coverage, subjectRatio);
    const reasons: DesignDecisionReason[] = [
      { title: 'تناسب الصورة', explanation: `نسبة الصورة ${round(sourceRatio)} أقرب إلى قالب ${SIZE_LABELS[size]}.`, metrics: { sourceRatio: round(sourceRatio), targetRatio: targetRatio[size], ratioFit: round(ratioFit) } },
      { title: 'مساحة القطعة', explanation: coverage < .18 ? 'القطعة صغيرة نسبياً؛ يقترح المحرك تكبيرها داخل منطقة البطل.' : coverage > .78 ? 'القطعة كبيرة؛ يقترح المحرك هامشاً آمناً حولها.' : 'مساحة القطعة متوازنة داخل منطقة البطل.', metrics: { coverage: round(coverage), coverageScore: round(coverageScore), safeScore: round(safeScore) } },
    ];
    return { size, score, garmentTransform, reasons };
  }).sort((a, b) => b.score - a.score || a.size.localeCompare(b.size));
}

export function scoreQuality(metrics: Pick<LocalImageMetrics, 'brightness' | 'contrast' | 'sharpness' | 'foreground'>): number {
  const lighting = metrics.brightness >= 58 && metrics.brightness <= 224 ? 24 : 10;
  const contrast = clamp(metrics.contrast * .72, 0, 25);
  const sharpness = clamp(metrics.sharpness * .72, 0, 25);
  const coverage = clamp(25 - Math.abs(metrics.foreground.coverage - .42) * 54, 0, 25);
  return Math.round(clamp(lighting + contrast + sharpness + coverage, 0, 100));
}

export function decideSafeCrop(foreground: LocalImageMetrics['foreground'], margin = .06) {
  const x = clamp(foreground.x - margin, 0, 1);
  const y = clamp(foreground.y - margin, 0, 1);
  const right = clamp(foreground.x + foreground.width + margin, 0, 1);
  const bottom = clamp(foreground.y + foreground.height + margin, 0, 1);
  return { x: round(x), y: round(y), width: round(right - x), height: round(bottom - y), safeMargin: margin };
}

export function chooseReadableBackground(colors: DesignColorSwatch[]): string {
  const dominant = colors[0]?.hex || '#5A4E45';
  return ['#FFFFFF', '#F8F4EC', '#F0ECFF', '#FFF7F0', '#1E1D3D'].sort((a, b) => {
    const scoreA = Math.min(contrastRatio(a, dominant), contrastRatio(a, '#2A2865'));
    const scoreB = Math.min(contrastRatio(b, dominant), contrastRatio(b, '#2A2865'));
    return scoreB - scoreA;
  })[0] || '#FFFFFF';
}

export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(hexToRgb(first));
  const b = relativeLuminance(hexToRgb(second));
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

export function buildEvidenceBoundText(details: AdDetails): string {
  if (details.marketingText.trim()) return details.marketingText.trim();
  const parts: string[] = [];
  if (details.productName.trim()) parts.push(details.productName.trim());
  if (details.colors.filter(Boolean).length) parts.push(`متوفر بالألوان: ${details.colors.filter(Boolean).join('، ')}`);
  if (details.discount.trim()) parts.push(`خصم ${details.discount.trim()}%`);
  if (details.price.trim()) parts.push(`السعر ${details.price.trim()} ${details.currency.trim() || 'ريال'}`);
  if (details.features.filter(Boolean).length) parts.push(details.features.filter(Boolean).slice(0, 2).join(' • '));
  return parts.join(' — ');
}

function qualityWarnings(metrics: LocalImageMetrics): string[] {
  const warnings: string[] = [];
  if (metrics.brightness < 55) warnings.push('الصورة مظلمة وقد تخفي تفاصيل القماش.');
  if (metrics.brightness > 228) warnings.push('الإضاءة قوية وقد تؤثر في دقة لون القطعة.');
  if (metrics.sharpness < 18) warnings.push('الصورة تبدو ناعمة أو مهزوزة؛ صورة أوضح تعطي إعلاناً أفضل.');
  if (Math.min(metrics.width, metrics.height) < 900) warnings.push('دقة الصورة منخفضة نسبياً؛ يفضّل اختيار صورة أكبر.');
  if (metrics.foreground.coverage < .16) warnings.push('توجد مساحة فارغة كبيرة؛ يقترح المحرك قصاً آمناً حول القطعة.');
  if (metrics.foreground.coverage > .86) warnings.push('القطعة قريبة من الحواف؛ راجع القص لتترك هامشاً بسيطاً.');
  return warnings;
}

async function inspectImageLocally(source: string): Promise<LocalImageMetrics> {
  const image = await loadImage(source);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, SAMPLE_EDGE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(48, Math.round(width * scale));
  canvas.height = Math.max(48, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('local-design-canvas-unavailable');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const grayscale = new Float32Array(canvas.width * canvas.height);
  const corners: Array<[number, number, number]> = [];
  const bins = new Map<string, { count: number; rgb: [number, number, number] }>();
  const cornerSize = Math.max(4, Math.floor(Math.min(canvas.width, canvas.height) * .12));
  let sum = 0; let sumSquared = 0; let edges = 0;
  for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
    const index = (y * canvas.width + x) * 4;
    const [red, green, blue] = [pixels[index], pixels[index + 1], pixels[index + 2]];
    const gray = .2126 * red + .7152 * green + .0722 * blue;
    grayscale[y * canvas.width + x] = gray;
    sum += gray; sumSquared += gray * gray;
    if (x > 0) edges += Math.abs(gray - grayscale[y * canvas.width + x - 1]);
    if (y > 0) edges += Math.abs(gray - grayscale[(y - 1) * canvas.width + x]);
    if ((x < cornerSize && y < cornerSize) || (x >= canvas.width - cornerSize && y < cornerSize) || (x < cornerSize && y >= canvas.height - cornerSize) || (x >= canvas.width - cornerSize && y >= canvas.height - cornerSize)) corners.push([red, green, blue]);
  }
  const cornerAverage = averageRgb(corners);
  let minX = canvas.width; let minY = canvas.height; let maxX = 0; let maxY = 0; let foregroundCount = 0;
  for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
    const index = (y * canvas.width + x) * 4;
    const [red, green, blue, alpha] = [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]];
    const distance = Math.hypot(red - cornerAverage[0], green - cornerAverage[1], blue - cornerAverage[2]);
    if (alpha > 20 && (distance > 28 || alpha < 245)) {
      foregroundCount += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      const key = `${Math.round(red / 32)}-${Math.round(green / 32)}-${Math.round(blue / 32)}`;
      const bin = bins.get(key) || { count: 0, rgb: [red, green, blue] as [number, number, number] };
      bin.count += 1; bins.set(key, bin);
    }
  }
  if (!foregroundCount || maxX <= minX || maxY <= minY) { minX = 0; minY = 0; maxX = canvas.width - 1; maxY = canvas.height - 1; }
  const foreground = { x: clamp(minX / canvas.width - .02, 0, 1), y: clamp(minY / canvas.height - .02, 0, 1), width: clamp((maxX - minX + 1) / canvas.width + .04, 0, 1), height: clamp((maxY - minY + 1) / canvas.height + .04, 0, 1), coverage: foregroundCount / (canvas.width * canvas.height) };
  const colors = Array.from(bins.values()).sort((a, b) => b.count - a.count).map(bin => ({ hex: rgbToHex(bin.rgb), label: nearestColorName(bin.rgb), weight: round(bin.count / Math.max(1, foregroundCount)) })).filter((color, index, all) => all.findIndex(other => colorDistance(other.hex, color.hex) < 30) === index).slice(0, 5);
  const brightness = sum / (canvas.width * canvas.height);
  const contrast = Math.sqrt(Math.max(0, sumSquared / (canvas.width * canvas.height) - brightness ** 2));
  const sharpness = clamp(edges / Math.max(1, canvas.width * canvas.height * 2) * 2.2, 0, 100);
  return { width, height, brightness, contrast, sharpness, foreground, colors };
}

function transformFor(size: TemplateSize, coverage: number, subjectRatio: number): GarmentDesignTransform {
  const desiredWidth = clamp(.72 + (.42 - coverage) * .32 + (subjectRatio > 1.1 ? .05 : 0), .58, .91);
  const desiredHeight = size === 'story' ? .96 : size === 'landscape' ? .88 : .93;
  return { x: round((1 - desiredWidth) / 2), y: round((1 - desiredHeight) / 2), width: round(desiredWidth), height: round(desiredHeight) };
}

function fallbackCandidate(): DesignLayoutCandidate { return { size: 'portrait', score: 0, garmentTransform: { x: .14, y: .03, width: .72, height: .94 }, reasons: [] }; }
function preferredCoverage(size: TemplateSize) { return size === 'landscape' ? .35 : size === 'story' ? .42 : .46; }
function verdictFor(score: number): DesignSuggestion['quality']['verdict'] { return score >= 84 ? 'excellent' : score >= 68 ? 'good' : score >= 50 ? 'usable' : 'needs-attention'; }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function round(value: number) { return Math.round(value * 100) / 100; }
function hexToRgb(hex: string): [number, number, number] { const value = hex.replace('#', ''); return [parseInt(value.slice(0, 2), 16) || 0, parseInt(value.slice(2, 4), 16) || 0, parseInt(value.slice(4, 6), 16) || 0]; }
function rgbToHex([red, green, blue]: [number, number, number]) { return `#${[red, green, blue].map(value => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`; }
function relativeLuminance([red, green, blue]: [number, number, number]) { const values = [red, green, blue].map(value => { const normalized = value / 255; return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4; }); return .2126 * values[0] + .7152 * values[1] + .0722 * values[2]; }
function averageRgb(values: Array<[number, number, number]>): [number, number, number] { if (!values.length) return [255, 255, 255]; return values.reduce((sum, value) => [sum[0] + value[0], sum[1] + value[1], sum[2] + value[2]], [0, 0, 0]).map(value => value / values.length) as [number, number, number]; }
function nearestColorName(rgb: [number, number, number]) { return COLOR_NAMES.slice().sort((first, second) => colorDistance(first.hex, rgbToHex(rgb)) - colorDistance(second.hex, rgbToHex(rgb)))[0]?.label || 'لون مقترح'; }
function colorDistance(first: string, second: string) { const [aR, aG, aB] = hexToRgb(first); const [bR, bG, bB] = hexToRgb(second); return Math.hypot(aR - bR, aG - bG, aB - bB); }
function loadImage(source: string): Promise<HTMLImageElement> { return new Promise((resolve, reject) => { const image = new Image(); image.decoding = 'async'; image.onload = () => resolve(image); image.onerror = () => reject(new Error('local-design-image-load')); image.src = source; }); }
