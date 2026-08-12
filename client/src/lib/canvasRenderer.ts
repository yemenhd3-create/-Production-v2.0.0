import type { AdDetails, TemplateSettings } from '@shared/types';

export interface RenderOptions {
  width?: number;
  height?: number;
  quality?: number;
  visualMode?: 'garment' | 'transparentPerson';
}

const COLORS = {
  ivory: '#FFFBF3',
  purple: '#272260',
  purpleSoft: '#F0ECFF',
  red: '#CC111A',
  redDark: '#A70F17',
  white: '#FFFFFF',
  gray: '#737581',
  line: '#E8E2D8',
};

type Box = { x: number; y: number; width: number; height: number };

/** يرسم قالباً ثابتاً 4:5 أو 9:16، مع طبقات اختيارية من إعدادات المستخدم. */
export async function renderAd(
  details: AdDetails,
  template: TemplateSettings,
  productImageSrc: string,
  options: RenderOptions = {}
): Promise<string> {
  const width = options.width || 1080;
  const height = options.height || 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('تعذر تهيئة مساحة الرسم');

  const sx = width / 1080;
  const sy = height / 1350;
  const x = (value: number) => value * sx;
  const y = (value: number) => value * sy;
  const font = (weight: number, size: number) => `${weight} ${Math.round(size * sx)}px Cairo, Tahoma, Arial, sans-serif`;

  ctx.fillStyle = COLORS.ivory;
  ctx.fillRect(0, 0, width, height);
  roundedRect(ctx, x(28), y(28), width - x(56), height - y(56), x(30));
  ctx.strokeStyle = '#D8D2C8';
  ctx.lineWidth = x(2);
  ctx.stroke();

  drawHeader(ctx, details, template, { x, y, font, width });

  const stage: Box = { x: x(236), y: y(250), width: x(608), height: y(616) };
  await drawProductStage(ctx, stage, productImageSrc, x, y, options.visualMode || 'garment');

  if (template.showQuantity || template.showColors) drawInformationPanel(ctx, details, template, { x, y, font });
  if (template.showPrice && details.price.trim()) drawPricePanel(ctx, details, { x, y, font });
  if (template.showFeatures && details.features.filter(Boolean).length) drawFeatureBadges(ctx, details.features.filter(Boolean).slice(0, 2), { x, y, font, width });
  if (template.showStoreInfo && (details.storeName.trim() || details.storePhone.trim())) drawFooter(ctx, details, { x, y, font, width, height });

  const blob = await canvasToBlob(canvas, 'image/png', options.quality || 0.92);
  return URL.createObjectURL(blob);
}

type Layout = {
  x: (value: number) => number;
  y: (value: number) => number;
  font: (weight: number, size: number) => string;
  width?: number;
  height?: number;
};

function drawHeader(ctx: CanvasRenderingContext2D, details: AdDetails, template: TemplateSettings, layout: Layout) {
  const { x, y, font, width = 1080 } = layout;
  if (template.showDiscount && details.discount.trim()) {
    const cx = x(142);
    const cy = y(145);
    const radius = x(78);
    ctx.save();
    ctx.fillStyle = COLORS.red;
    ctx.shadowColor = 'rgba(120, 0, 0, 0.18)';
    ctx.shadowBlur = x(10);
    ctx.shadowOffsetY = y(5);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = COLORS.redDark;
    ctx.lineWidth = x(3);
    ctx.stroke();
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(800, 27);
    ctx.fillText('خصم', cx, cy - y(20));
    ctx.font = font(900, 45);
    ctx.fillText(`${details.discount.trim()}%`, cx, cy + y(24));
    ctx.restore();
  }

  const title = template.showProductName ? details.productName.trim() : '';
  const headline = template.showHeadline ? details.headline.trim() : '';
  ctx.save();
  ctx.fillStyle = COLORS.purple;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (title) {
    ctx.font = font(900, 53);
    drawWrappedText(ctx, title, width / 2, y(84), x(560), y(62), 2);
  }
  if (headline) {
    ctx.fillStyle = COLORS.gray;
    ctx.font = font(600, 22);
    drawWrappedText(ctx, headline, width / 2, y(title ? 157 : 104), x(500), y(30), 2);
  }
  ctx.restore();

  // طبقة العلامة الثابتة في أقصى اليمين، كما في القالب المرجعي.
  ctx.save();
  roundedRect(ctx, width - x(175), y(80), x(72), y(72), x(19));
  ctx.fillStyle = COLORS.purpleSoft;
  ctx.fill();
  ctx.fillStyle = COLORS.purple;
  ctx.font = font(900, 36);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', width - x(139), y(116));
  ctx.restore();
}

async function drawProductStage(ctx: CanvasRenderingContext2D, box: Box, imageSrc: string, x: (value: number) => number, y: (value: number) => number, visualMode: 'garment' | 'transparentPerson') {
  ctx.save();
  ctx.fillStyle = COLORS.white;
  ctx.shadowColor = 'rgba(37, 35, 95, 0.15)';
  ctx.shadowBlur = x(24);
  ctx.shadowOffsetY = y(12);
  roundedRect(ctx, box.x, box.y, box.width, box.height, x(34));
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#E5E1DB';
  ctx.lineWidth = x(2);
  ctx.stroke();
  ctx.restore();

  // الشخص الشفاف يُثبت عند أرضية البطاقة بهامش صغير؛ أما الملابس فتتمركز من دون تمديد أو قص.
  await drawImageContain(ctx, imageSrc, box.x + x(30), box.y + y(30), box.width - x(60), box.height - y(60), visualMode);
}

function drawInformationPanel(ctx: CanvasRenderingContext2D, details: AdDetails, template: TemplateSettings, layout: Layout) {
  const { x, y, font } = layout;
  const items = [
    template.showQuantity && details.quantity.trim() ? { label: 'الكمية', value: details.quantity.trim() } : null,
    template.showColors && details.colors.length ? { label: 'الألوان', value: details.colors.slice(0, 2).join('، ') } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  if (!items.length) return;

  const box: Box = { x: x(54), y: y(552), width: x(170), height: y(items.length === 2 ? 276 : 150) };
  ctx.save();
  ctx.fillStyle = COLORS.white;
  roundedRect(ctx, box.x, box.y, box.width, box.height, x(25));
  ctx.fill();
  ctx.strokeStyle = '#E5E1DB';
  ctx.lineWidth = x(2);
  ctx.stroke();
  items.forEach((item, index) => {
    const itemY = box.y + y(18) + index * y(124);
    ctx.fillStyle = COLORS.purpleSoft;
    roundedRect(ctx, box.x + x(12), itemY, box.width - x(24), y(108), x(16));
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.gray;
    ctx.font = font(700, 19);
    ctx.fillText(item.label, box.x + box.width / 2, itemY + y(17));
    ctx.fillStyle = COLORS.purple;
    ctx.font = font(900, 23);
    drawWrappedText(ctx, item.value, box.x + box.width / 2, itemY + y(47), box.width - x(28), y(27), 2);
  });
  ctx.restore();
}

function drawPricePanel(ctx: CanvasRenderingContext2D, details: AdDetails, layout: Layout) {
  const { x, y, font } = layout;
  const box: Box = { x: x(856), y: y(526), width: x(170), height: y(258) };
  ctx.save();
  ctx.fillStyle = COLORS.red;
  roundedRect(ctx, box.x, box.y, box.width, box.height, x(28));
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = font(700, 21);
  ctx.fillText('السعر', box.x + box.width / 2, box.y + y(30));
  ctx.fillStyle = COLORS.white;
  ctx.font = font(900, 44);
  ctx.fillText(details.price.trim(), box.x + box.width / 2, box.y + y(78));
  ctx.font = font(700, 21);
  ctx.fillText(details.currency.trim() || 'ريال', box.x + box.width / 2, box.y + y(133));
  if (details.discount.trim()) {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = x(2);
    ctx.beginPath();
    ctx.moveTo(box.x + x(22), box.y + y(181));
    ctx.lineTo(box.x + box.width - x(22), box.y + y(181));
    ctx.stroke();
    ctx.font = font(800, 18);
    ctx.fillText(`وفر ${details.discount.trim()}%`, box.x + box.width / 2, box.y + y(202));
  }
  ctx.restore();
}

function drawFeatureBadges(ctx: CanvasRenderingContext2D, features: string[], layout: Layout) {
  const { x, y, font, width = 1080 } = layout;
  const gap = x(16);
  const maxWidth = x(470);
  const badgeWidth = Math.min(maxWidth, (width - x(170) - gap) / features.length);
  const totalWidth = features.length * badgeWidth + (features.length - 1) * gap;
  let badgeX = (width - totalWidth) / 2;
  const badgeY = y(970);
  ctx.save();
  for (const feature of features) {
    ctx.fillStyle = COLORS.purpleSoft;
    roundedRect(ctx, badgeX, badgeY, badgeWidth, y(62), x(20));
    ctx.fill();
    ctx.fillStyle = COLORS.purple;
    ctx.font = font(800, 20);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncateToWidth(ctx, feature, badgeWidth - x(26)), badgeX + badgeWidth / 2, badgeY + y(31));
    badgeX += badgeWidth + gap;
  }
  ctx.restore();
}

function drawFooter(ctx: CanvasRenderingContext2D, details: AdDetails, layout: Layout) {
  const { x, y, font, width = 1080, height = 1350 } = layout;
  const footerHeight = y(100);
  const footerY = height - y(78) - footerHeight;
  ctx.save();
  ctx.fillStyle = COLORS.red;
  roundedRect(ctx, x(54), footerY, width - x(108), footerHeight, x(23));
  ctx.fill();
  ctx.fillStyle = COLORS.white;
  ctx.textBaseline = 'middle';
  if (details.storeName.trim()) {
    ctx.font = font(900, 27);
    ctx.textAlign = 'right';
    ctx.fillText(truncateToWidth(ctx, details.storeName.trim(), x(380)), width - x(82), footerY + footerHeight / 2);
  }
  if (details.storePhone.trim()) {
    ctx.font = font(800, 24);
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    ctx.fillText(details.storePhone.trim(), x(82), footerY + footerHeight / 2);
  }
  ctx.restore();
}

async function drawImageContain(ctx: CanvasRenderingContext2D, imageSrc: string, x: number, y: number, maxWidth: number, maxHeight: number, visualMode: 'garment' | 'transparentPerson') {
  const image = await loadImage(imageSrc);
  const widthLimit = visualMode === 'transparentPerson' ? maxWidth * 0.9 : maxWidth;
  const heightLimit = visualMode === 'transparentPerson' ? maxHeight * 0.96 : maxHeight;
  const ratio = Math.min(widthLimit / image.width, heightLimit / image.height);
  const drawWidth = Math.max(1, image.width * ratio);
  const drawHeight = Math.max(1, image.height * ratio);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const drawX = x + (maxWidth - drawWidth) / 2;
  const drawY = visualMode === 'transparentPerson'
    ? y + maxHeight - drawHeight - maxHeight * 0.025
    : y + (maxHeight - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      callback();
    };
    const timeout = window.setTimeout(() => finish(() => reject(new Error('انتهت مهلة تحميل صورة الملابس'))), 12_000);
    image.onload = () => finish(() => resolve(image));
    image.onerror = () => finish(() => reject(new Error('تعذر تحميل صورة الملابس في القالب')));
    image.decoding = 'async';
    if (!source.startsWith('blob:') && !source.startsWith('data:')) image.crossOrigin = 'anonymous';
    image.src = source;
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, centerX: number, topY: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = '';
  let lineIndex = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    ctx.fillText(line, centerX, topY + lineIndex * lineHeight);
    lineIndex += 1;
    if (lineIndex >= maxLines) return;
    line = word;
  }
  if (line && lineIndex < maxLines) ctx.fillText(truncateToWidth(ctx, line, maxWidth), centerX, topY + lineIndex * lineHeight);
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1);
  return `${value}…`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('تعذر تصدير الإعلان كصورة'))), type, quality);
  });
}
