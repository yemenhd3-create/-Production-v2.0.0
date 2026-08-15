import type { AdDetails, TemplateBadgeType, TemplateSettings, TemplateSize } from '@shared/types';
import { getArtworkTransform } from '@shared/artworkLayout';

export interface RenderOptions {
  width?: number;
  height?: number;
  quality?: number;
  visualMode?: 'garment' | 'transparentPerson';
  garmentTransform?: { x: number; y: number; width: number; height: number };
}

const COLORS = {
  background: '#FFFFFF',
  purple: '#2A2865',
  purpleSoft: '#F0ECFF',
  red: '#D01720',
  redDark: '#AD111A',
  white: '#FFFFFF',
  gray: '#737581',
  line: '#E8E2D8',
};

const TEMPLATE_FONT_FAMILY = 'Cairo, Tahoma, Arial, sans-serif';
type Box = { x: number; y: number; width: number; height: number };
type Geometry = { safe: Box; header: Box; logo: Box; hero: Box; info: Box; price: Box; features: Box; footer: Box; badge: Box };
type Layout = { font: (weight: number, size: number) => string; width: number; height: number; scale: number };

/** يرسم قالباً هندسياً مستقلاً لكل مقاس؛ الملابس دائماً أكبر منطقة بصرية. */
export async function renderAd(details: AdDetails, template: TemplateSettings, productImageSrc: string, options: RenderOptions = {}): Promise<string> {
  await waitForCanvasFonts();
  const { width, height } = resolveCanvasSize(template.size, options.width, options.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('تعذر تهيئة مساحة الرسم');

  const layout: Layout = { width, height, scale: width / 1080, font: (weight, size) => `${weight} ${Math.round(size * (width / 1080))}px ${TEMPLATE_FONT_FAMILY}` };
  const geometry = createGeometry(template.size, width, height);
  ctx.fillStyle = template.smartBackgroundColor || COLORS.background;
  ctx.fillRect(0, 0, width, height);

  const logoTransform = getArtworkTransform(template, 'logo');
  const footerTransform = getArtworkTransform(template, 'footer');
  drawTextHeader(ctx, details, template, geometry.header, layout);
  if (template.showStoreLogo && template.storeLogoArtwork) await drawCircularLogo(ctx, template.storeLogoArtwork, toPixelBox(logoTransform, width, height));

  await drawHero(ctx, productImageSrc, geometry.hero, options.visualMode || 'garment', options.garmentTransform || template.smartGarmentTransform);
  drawBadges(ctx, details, template, geometry.badge, layout);
  if (template.showQuantity || template.showColors) drawInformationPanel(ctx, details, template, geometry.info, layout);
  if (template.showPrice && details.price.trim()) drawPricePanel(ctx, details, geometry.price, layout);
  if (template.showFeatures && details.features.filter(Boolean).length) drawFeatureBadges(ctx, details.features.filter(Boolean).slice(0, 2), geometry.features, layout);
  if (template.showFooterArtwork && template.footerArtwork) await drawArtwork(ctx, template.footerArtwork, toPixelBox(footerTransform, width, height), footerTransform.fit);
  else if (template.showStoreInfo && (details.storeName.trim() || details.storePhone.trim())) drawFooter(ctx, details, geometry.footer, layout);

  const blob = await canvasToBlob(canvas, 'image/png', options.quality || 0.92);
  return URL.createObjectURL(blob);
}

function resolveCanvasSize(size: TemplateSize, requestedWidth?: number, requestedHeight?: number) {
  if (requestedWidth && requestedHeight) return { width: requestedWidth, height: requestedHeight };
  const dimensions: Record<TemplateSize, { width: number; height: number }> = {
    portrait: { width: 1080, height: 1350 }, square: { width: 1080, height: 1080 }, story: { width: 1080, height: 1920 }, whatsapp: { width: 1080, height: 1440 }, landscape: { width: 1200, height: 628 },
  };
  return dimensions[size] || dimensions.portrait;
}

function createGeometry(size: TemplateSize, width: number, height: number): Geometry {
  const box = (x: number, y: number, w: number, h: number): Box => ({ x: width * x, y: height * y, width: width * w, height: height * h });
  if (size === 'landscape') {
    return { safe: box(.035, .06, .93, .88), header: box(.20, .10, .34, .20), logo: box(.55, .10, .09, .17), hero: box(.07, .30, .48, .30), info: box(.61, .42, .14, .18), price: box(.79, .38, .15, .22), features: box(.60, .18, .34, .10), footer: box(0, .627, 1, .351), badge: box(.06, .10, .11, .16) };
  }
  const config: Record<Exclude<TemplateSize, 'landscape'>, { headerY: number; headerH: number; heroY: number; heroH: number; infoY: number; featureY: number; footerY: number; footerH: number }> = {
    portrait: { headerY: .06, headerH: .13, heroY: .20, heroH: .52, infoY: .42, featureY: .75, footerY: .83, footerH: .147 },
    square: { headerY: .06, headerH: .15, heroY: .22, heroH: .48, infoY: .43, featureY: .73, footerY: .793, footerH: .184 },
    story: { headerY: .055, headerH: .10, heroY: .17, heroH: .58, infoY: .44, featureY: .78, footerY: .872, footerH: .103 },
    whatsapp: { headerY: .06, headerH: .12, heroY: .19, heroH: .55, infoY: .43, featureY: .77, footerY: .84, footerH: .138 },
  };
  const c = config[size];
  return { safe: box(.04, .025, .92, .95), header: box(.14, c.headerY, .72, c.headerH), logo: box(.77, c.headerY + c.headerH * .08, .095, c.headerH * .58), hero: box(.17, c.heroY, .66, c.heroH), info: box(.055, c.infoY, .13, .20), price: box(.815, c.infoY, .13, .20), features: box(.14, c.featureY, .72, .06), footer: box(0, c.footerY, 1, c.footerH), badge: box(.075, c.headerY + .01, .12, .10) };
}

function drawTextHeader(ctx: CanvasRenderingContext2D, details: AdDetails, template: TemplateSettings, box: Box, layout: Layout) {
  const title = template.showProductName ? details.productName.trim() : '';
  const headline = template.showHeadline ? details.headline.trim() : '';
  const { font, scale } = layout;
  ctx.save();
  ctx.fillStyle = COLORS.purple;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const isLandscape = layout.width > layout.height;
  const hasSideLayer = template.showQualityMark || (template.showStoreLogo && Boolean(template.storeLogoArtwork));
  const titleCenter = hasSideLayer ? box.x + box.width * .38 : box.x + box.width / 2;
  const titleWidth = hasSideLayer ? box.width * .68 : box.width * .88;
  if (title) {
    ctx.font = font(900, isLandscape ? 38 : 53);
    drawWrappedText(ctx, title, titleCenter, box.y + box.height * .08, titleWidth, (isLandscape ? 45 : 62) * scale, 2);
  }
  if (headline) {
    ctx.fillStyle = COLORS.gray;
    ctx.font = font(600, 22);
    drawWrappedText(ctx, headline, titleCenter, box.y + box.height * (title ? .62 : .25), titleWidth, 30 * scale, 2);
  }
  if (template.showQualityMark) {
    const markSize = Math.min(box.height * .48, 72 * scale);
    roundedRect(ctx, box.x + box.width - markSize, box.y + box.height * .08, markSize, markSize, markSize * .26);
    ctx.fillStyle = COLORS.purpleSoft;
    ctx.fill();
    ctx.fillStyle = COLORS.purple;
    ctx.font = font(900, 36);
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', box.x + box.width - markSize / 2, box.y + box.height * .08 + markSize / 2);
  }
  ctx.restore();
}

async function drawHero(ctx: CanvasRenderingContext2D, imageSrc: string, box: Box, visualMode: 'garment' | 'transparentPerson', transform?: { x: number; y: number; width: number; height: number }) {
  // لا توجد بطاقة أو ظل داخلي: مساحة البطل البيضاء هي خلفية القالب نفسها.
  const padding = Math.min(box.width, box.height) * .015;
  const safeBox = { x: box.x + padding, y: box.y + padding, width: box.width - padding * 2, height: box.height - padding * 2 };
  const selected = transform ? constrainedHeroTransform(safeBox, transform) : safeBox;
  await drawImageContain(ctx, imageSrc, selected.x, selected.y, selected.width, selected.height, visualMode);
}

function constrainedHeroTransform(hero: Box, transform: { x: number; y: number; width: number; height: number }): Box {
  const x = Math.max(0, Math.min(.92, transform.x));
  const y = Math.max(0, Math.min(.92, transform.y));
  const width = Math.max(.35, Math.min(1 - x, transform.width));
  const height = Math.max(.35, Math.min(1 - y, transform.height));
  return { x: hero.x + hero.width * x, y: hero.y + hero.height * y, width: hero.width * width, height: hero.height * height };
}

function getBadgeTypes(template: TemplateSettings, details: AdDetails): Array<Exclude<TemplateBadgeType, 'none'>> {
  const configured = template.badgeTypes?.slice() || [];
  if (configured.length) return configured.slice(0, 3);
  if (template.badgeType && template.badgeType !== 'none') return [template.badgeType];
  return template.showDiscount && details.discount.trim() ? ['discount'] : [];
}

function drawBadges(ctx: CanvasRenderingContext2D, details: AdDetails, template: TemplateSettings, box: Box, layout: Layout) {
  const types = getBadgeTypes(template, details);
  if (!types.length) return;
  const gap = box.width * .08;
  const diameter = Math.min(box.width * (types.length === 1 ? .95 : .58), box.height * .78);
  const totalWidth = diameter * types.length + gap * (types.length - 1);
  const startX = box.x + Math.max(0, (box.width - totalWidth) / 2);
  types.forEach((type, index) => drawBadge(ctx, details, template, type, { x: startX + index * (diameter + gap), y: box.y + (box.height - diameter) / 2, width: diameter, height: diameter }, layout, types.length === 1));
}

function drawBadge(ctx: CanvasRenderingContext2D, details: AdDetails, template: TemplateSettings, type: Exclude<TemplateBadgeType, 'none'>, box: Box, layout: Layout, canUseCustomText: boolean) {
  const labels: Record<Exclude<TemplateBadgeType, 'none'>, string> = { discount: details.discount.trim() ? `خصم\n${details.discount.trim()}%` : 'خصم', new: 'جديد', offer: 'عرض', price: 'سعر', quality: 'جودة' };
  const text = canUseCustomText && template.badgeText.trim() ? template.badgeText.trim() : labels[type];
  const colors: Record<Exclude<TemplateBadgeType, 'none'>, string> = { discount: COLORS.red, new: COLORS.purple, offer: '#F07B16', price: COLORS.redDark, quality: '#198754' };
  const radius = Math.min(box.width, box.height) / 2;
  const cx = box.x + radius;
  const cy = box.y + radius;
  ctx.save();
  ctx.fillStyle = colors[type];
  ctx.shadowColor = 'rgba(0,0,0,.16)';
  ctx.shadowBlur = radius * .18;
  ctx.shadowOffsetY = radius * .08;
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = COLORS.white;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = text.split(/\n|\s{2,}/).filter(Boolean).slice(0, 2);
  ctx.font = layout.font(900, Math.max(17, Math.min(31, radius / layout.scale * .36)));
  lines.forEach((line, index) => ctx.fillText(line, cx, cy + (index - (lines.length - 1) / 2) * radius * .46));
  ctx.restore();
}

function drawInformationPanel(ctx: CanvasRenderingContext2D, details: AdDetails, template: TemplateSettings, box: Box, layout: Layout) {
  const items = [template.showQuantity && details.quantity.trim() ? { label: 'الكمية', value: details.quantity.trim() } : null, template.showColors && details.colors.length ? { label: 'الألوان', value: details.colors.slice(0, 2).join('، ') } : null].filter(Boolean) as Array<{ label: string; value: string }>;
  if (!items.length) return;
  ctx.save();
  const gap = box.height * .06;
  const itemHeight = (box.height - gap * (items.length - 1)) / items.length;
  items.forEach((item, index) => {
    const y = box.y + index * (itemHeight + gap);
    roundedRect(ctx, box.x, y, box.width, itemHeight, Math.min(box.width, itemHeight) * .18);
    ctx.fillStyle = COLORS.purpleSoft; ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.gray; ctx.font = layout.font(700, 19); ctx.fillText(item.label, box.x + box.width / 2, y + itemHeight * .16);
    ctx.fillStyle = COLORS.purple; ctx.font = layout.font(900, 23); drawWrappedText(ctx, item.value, box.x + box.width / 2, y + itemHeight * .46, box.width * .84, itemHeight * .24, 2);
  });
  ctx.restore();
}

function drawPricePanel(ctx: CanvasRenderingContext2D, details: AdDetails, box: Box, layout: Layout) {
  ctx.save();
  roundedRect(ctx, box.x, box.y, box.width, box.height, Math.min(box.width, box.height) * .18);
  ctx.fillStyle = COLORS.red; ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.font = layout.font(700, 21); ctx.fillText('السعر', box.x + box.width / 2, box.y + box.height * .14);
  ctx.fillStyle = COLORS.white; ctx.font = layout.font(900, 44); ctx.fillText(details.price.trim(), box.x + box.width / 2, box.y + box.height * .36);
  ctx.font = layout.font(700, 21); ctx.fillText(details.currency.trim() || 'ريال', box.x + box.width / 2, box.y + box.height * .61);
  if (details.discount.trim()) {
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = Math.max(1, layout.scale * 2); ctx.beginPath(); ctx.moveTo(box.x + box.width * .16, box.y + box.height * .76); ctx.lineTo(box.x + box.width * .84, box.y + box.height * .76); ctx.stroke();
    ctx.font = layout.font(800, 18); ctx.fillText(`وفر ${details.discount.trim()}%`, box.x + box.width / 2, box.y + box.height * .81);
  }
  ctx.restore();
}

function drawFeatureBadges(ctx: CanvasRenderingContext2D, features: string[], box: Box, layout: Layout) {
  const gap = box.width * .025;
  const width = (box.width - gap * (features.length - 1)) / features.length;
  ctx.save();
  features.forEach((feature, index) => {
    const x = box.x + index * (width + gap);
    roundedRect(ctx, x, box.y, width, box.height, Math.min(width, box.height) * .27); ctx.fillStyle = COLORS.purpleSoft; ctx.fill();
    ctx.fillStyle = COLORS.purple; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = layout.font(800, 20); ctx.fillText(truncateToWidth(ctx, feature, width * .84), x + width / 2, box.y + box.height / 2);
  });
  ctx.restore();
}

function drawFooter(ctx: CanvasRenderingContext2D, details: AdDetails, box: Box, layout: Layout) {
  ctx.save();
  roundedRect(ctx, box.x, box.y, box.width, box.height, box.height * .25); ctx.fillStyle = COLORS.red; ctx.fill();
  ctx.fillStyle = COLORS.white; ctx.textBaseline = 'middle';
  if (details.storeName.trim()) { ctx.font = layout.font(900, 27); ctx.textAlign = 'right'; ctx.fillText(truncateToWidth(ctx, details.storeName.trim(), box.width * .58), box.x + box.width * .94, box.y + box.height / 2); }
  if (details.storePhone.trim()) { ctx.font = layout.font(800, 24); ctx.textAlign = 'left'; ctx.direction = 'ltr'; ctx.fillText(details.storePhone.trim(), box.x + box.width * .06, box.y + box.height / 2); }
  ctx.restore();
}

function toPixelBox(transform: { x: number; y: number; width: number; height: number }, width: number, height: number): Box {
  return { x: transform.x * width, y: transform.y * height, width: transform.width * width, height: transform.height * height };
}

async function drawArtwork(ctx: CanvasRenderingContext2D, source: string, box: Box, fit: 'contain' | 'cover' | 'stretch') {
  const image = await loadImage(source);
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (fit === 'stretch') {
    ctx.drawImage(image, box.x, box.y, box.width, box.height);
    ctx.restore();
    return;
  }
  if (fit === 'cover') { ctx.beginPath(); ctx.rect(box.x, box.y, box.width, box.height); ctx.clip(); }
  const ratio = (fit === 'cover' ? Math.max : Math.min)(box.width / image.width, box.height / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  ctx.drawImage(image, box.x + (box.width - drawWidth) / 2, box.y + (box.height - drawHeight) / 2, drawWidth, drawHeight);
  ctx.restore();
}

async function drawCircularLogo(ctx: CanvasRenderingContext2D, source: string, box: Box) {
  const image = await loadImage(source);
  const diameter = Math.min(box.width, box.height);
  const x = box.x + (box.width - diameter) / 2;
  const y = box.y + (box.height - diameter) / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(x + diameter / 2, y + diameter / 2, diameter / 2, 0, Math.PI * 2); ctx.clip();
  const ratio = Math.max(diameter / image.width, diameter / image.height);
  const drawWidth = image.width * ratio; const drawHeight = image.height * ratio;
  ctx.drawImage(image, x + (diameter - drawWidth) / 2, y + (diameter - drawHeight) / 2, drawWidth, drawHeight);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(x + diameter / 2, y + diameter / 2, diameter / 2, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.94)'; ctx.lineWidth = Math.max(2, diameter * .055); ctx.stroke(); ctx.restore();
}

async function drawImageContain(ctx: CanvasRenderingContext2D, imageSrc: string, x: number, y: number, maxWidth: number, maxHeight: number, visualMode: 'garment' | 'transparentPerson') {
  const image = await loadImage(imageSrc);
  const usesPersonPlacement = visualMode === 'transparentPerson';
  const widthLimit = usesPersonPlacement ? maxWidth * .94 : maxWidth;
  const heightLimit = usesPersonPlacement ? maxHeight * .985 : maxHeight;
  const ratio = Math.min(widthLimit / image.width, heightLimit / image.height);
  const drawWidth = Math.max(1, image.width * ratio); const drawHeight = Math.max(1, image.height * ratio);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const drawX = x + (maxWidth - drawWidth) / 2;
  const drawY = usesPersonPlacement ? y + maxHeight - drawHeight - maxHeight * .012 : y + (maxHeight - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight); ctx.restore();
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(); let settled = false;
    const finish = (callback: () => void) => { if (settled) return; settled = true; window.clearTimeout(timeout); callback(); };
    const timeout = window.setTimeout(() => finish(() => reject(new Error('انتهت مهلة تحميل صورة الملابس'))), 12_000);
    image.onload = () => finish(() => resolve(image)); image.onerror = () => finish(() => reject(new Error('تعذر تحميل صورة الملابس في القالب')));
    image.decoding = 'async'; if (!source.startsWith('blob:') && !source.startsWith('data:')) image.crossOrigin = 'anonymous'; image.src = source;
  });
}

async function waitForCanvasFonts() { if (typeof document !== 'undefined' && 'fonts' in document) try { await document.fonts.ready; } catch { /* Tahoma fallback */ } }
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) { const r = Math.min(radius, width / 2, height / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r); ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.closePath(); }
function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, centerX: number, topY: number, maxWidth: number, lineHeight: number, maxLines: number) { const words = text.split(/\s+/).filter(Boolean); let line = ''; let index = 0; for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (ctx.measureText(candidate).width <= maxWidth || !line) { line = candidate; continue; } ctx.fillText(line, centerX, topY + index * lineHeight); index += 1; if (index >= maxLines) return; line = word; } if (line && index < maxLines) ctx.fillText(truncateToWidth(ctx, line, maxWidth), centerX, topY + index * lineHeight); }
function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) { if (ctx.measureText(text).width <= maxWidth) return text; let value = text; while (value.length && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1); return `${value}…`; }
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> { return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('تعذر تصدير الإعلان كصورة'))), type, quality)); }
