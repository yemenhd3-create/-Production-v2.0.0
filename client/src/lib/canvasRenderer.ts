import type { AdDetails, TemplateSettings } from '@shared/types';

export interface RenderOptions {
  width?: number;
  height?: number;
  quality?: number;
}

const COLORS = {
  ivory: '#FFF9F0',
  purple: '#25235F',
  purpleSoft: '#EFEDFF',
  red: '#C9151D',
  gold: '#E6A300',
  gray: '#6B7280',
  line: '#E9E3DA',
  white: '#FFFFFF',
};

/**
 * Builds the final social image from the uploaded garment and all optional display settings.
 * The image source can be an AI Try-On result later; for now the local garment image is a safe fallback.
 */
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

  const scale = width / 1080;
  const s = (value: number) => value * scale;

  ctx.fillStyle = COLORS.ivory;
  ctx.fillRect(0, 0, width, height);

  // A fixed branded frame keeps the advertisement consistent across all products.
  roundedRect(ctx, s(28), s(28), width - s(56), height - s(56), s(32));
  ctx.strokeStyle = COLORS.purple;
  ctx.globalAlpha = 0.14;
  ctx.lineWidth = s(3);
  ctx.stroke();
  ctx.globalAlpha = 1;

  drawHeader(ctx, details, template, width, height, s);

  const imageBox = {
    x: s(246),
    y: height * 0.19,
    width: width - s(492),
    height: height * 0.51,
  };
  await drawProductStage(ctx, imageBox, productImageSrc, s);

  if (template.showQuantity || template.showColors) {
    drawInformationPanel(ctx, details, template, width, height, s);
  }

  if (template.showPrice && details.price.trim()) {
    drawPricePanel(ctx, details, width, height, s);
  }

  if (template.showFeatures && details.features.filter(Boolean).length) {
    drawFeatureBadges(ctx, details.features.filter(Boolean).slice(0, 3), width, height, s);
  }

  if (template.showStoreInfo && (details.storeName.trim() || details.storePhone.trim())) {
    drawFooter(ctx, details, width, height, s);
  }

  const blob = await canvasToBlob(canvas, 'image/png', options.quality || 0.9);
  return URL.createObjectURL(blob);
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  details: AdDetails,
  template: TemplateSettings,
  width: number,
  height: number,
  s: (value: number) => number
) {
  if (template.showDiscount && details.discount.trim()) {
    const badgeX = s(76);
    const badgeY = s(70);
    const badgeSize = s(154);
    ctx.save();
    ctx.fillStyle = COLORS.red;
    ctx.beginPath();
    ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#A71017';
    ctx.lineWidth = s(4);
    ctx.stroke();
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${s(27)}px Cairo, Tahoma, sans-serif`;
    ctx.fillText('خصم', badgeX + badgeSize / 2, badgeY + badgeSize * 0.37);
    ctx.font = `900 ${s(48)}px Cairo, Tahoma, sans-serif`;
    ctx.fillText(`${details.discount}%`, badgeX + badgeSize / 2, badgeY + badgeSize * 0.67);
    ctx.restore();
  }

  const title = template.showProductName ? details.productName.trim() : '';
  const headline = template.showHeadline ? details.headline.trim() : '';
  const centerX = width / 2;
  const titleY = s(84);

  ctx.save();
  ctx.fillStyle = COLORS.purple;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (title) {
    ctx.font = `900 ${s(55)}px Cairo, Tahoma, sans-serif`;
    drawWrappedText(ctx, title, centerX, titleY, width * 0.55, s(64), 2);
  }
  if (headline) {
    ctx.fillStyle = COLORS.gray;
    ctx.font = `600 ${s(26)}px Cairo, Tahoma, sans-serif`;
    const headlineY = title ? titleY + s(70) : titleY + s(6);
    drawWrappedText(ctx, headline, centerX, headlineY, width * 0.55, s(34), 2);
  }
  ctx.restore();

  // Fixed quality mark; this carries the visual identity without inventing a store claim.
  ctx.save();
  const markX = width - s(150);
  const markY = s(84);
  ctx.fillStyle = COLORS.purpleSoft;
  roundedRect(ctx, markX, markY, s(76), s(76), s(22));
  ctx.fill();
  ctx.fillStyle = COLORS.purple;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${s(32)}px Cairo, Tahoma, sans-serif`;
  ctx.fillText('✓', markX + s(38), markY + s(37));
  ctx.restore();
}

async function drawProductStage(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  imageSrc: string,
  s: (value: number) => number
) {
  ctx.save();
  ctx.fillStyle = COLORS.white;
  ctx.shadowColor = 'rgba(37, 35, 95, 0.12)';
  ctx.shadowBlur = s(28);
  ctx.shadowOffsetY = s(12);
  roundedRect(ctx, box.x, box.y, box.width, box.height, s(34));
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = s(2);
  ctx.stroke();
  ctx.restore();

  await drawImageContain(ctx, imageSrc, box.x + s(26), box.y + s(26), box.width - s(52), box.height - s(52));
}

function drawInformationPanel(
  ctx: CanvasRenderingContext2D,
  details: AdDetails,
  template: TemplateSettings,
  width: number,
  height: number,
  s: (value: number) => number
) {
  const items = [
    template.showQuantity && details.quantity.trim()
      ? { label: 'الكمية', value: details.quantity.trim() }
      : null,
    template.showColors && details.colors.length
      ? { label: 'الألوان', value: details.colors.slice(0, 2).join('، ') }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (!items.length) return;

  const panelWidth = s(180);
  const panelX = s(54);
  const panelY = height * 0.43;
  const itemHeight = s(118);
  const panelHeight = items.length * itemHeight + s(26);

  ctx.save();
  ctx.fillStyle = COLORS.white;
  roundedRect(ctx, panelX, panelY, panelWidth, panelHeight, s(24));
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = s(2);
  ctx.stroke();

  items.forEach((item, index) => {
    const top = panelY + s(14) + index * itemHeight;
    ctx.fillStyle = COLORS.purpleSoft;
    roundedRect(ctx, panelX + s(12), top, panelWidth - s(24), itemHeight - s(12), s(17));
    ctx.fill();
    ctx.fillStyle = COLORS.gray;
    ctx.font = `700 ${s(19)}px Cairo, Tahoma, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(item.label, panelX + panelWidth / 2, top + s(17));
    ctx.fillStyle = COLORS.purple;
    ctx.font = `900 ${s(22)}px Cairo, Tahoma, sans-serif`;
    drawWrappedText(ctx, item.value, panelX + panelWidth / 2, top + s(47), panelWidth - s(32), s(26), 2);
  });
  ctx.restore();
}

function drawPricePanel(
  ctx: CanvasRenderingContext2D,
  details: AdDetails,
  width: number,
  height: number,
  s: (value: number) => number
) {
  const panelWidth = s(184);
  const panelX = width - panelWidth - s(54);
  const panelY = height * 0.42;
  const panelHeight = s(250);

  ctx.save();
  ctx.fillStyle = COLORS.red;
  roundedRect(ctx, panelX, panelY, panelWidth, panelHeight, s(27));
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `700 ${s(22)}px Cairo, Tahoma, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('السعر', panelX + panelWidth / 2, panelY + s(30));

  ctx.fillStyle = COLORS.white;
  ctx.font = `900 ${s(48)}px Cairo, Tahoma, sans-serif`;
  ctx.fillText(details.price.trim(), panelX + panelWidth / 2, panelY + s(76));
  ctx.font = `700 ${s(22)}px Cairo, Tahoma, sans-serif`;
  ctx.fillText(details.currency, panelX + panelWidth / 2, panelY + s(137));

  if (details.discount.trim()) {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = s(2);
    ctx.beginPath();
    ctx.moveTo(panelX + s(24), panelY + s(185));
    ctx.lineTo(panelX + panelWidth - s(24), panelY + s(185));
    ctx.stroke();
    ctx.fillStyle = COLORS.white;
    ctx.font = `800 ${s(20)}px Cairo, Tahoma, sans-serif`;
    ctx.fillText(`وفر ${details.discount}%`, panelX + panelWidth / 2, panelY + s(204));
  }
  ctx.restore();
}

function drawFeatureBadges(
  ctx: CanvasRenderingContext2D,
  features: string[],
  width: number,
  height: number,
  s: (value: number) => number
) {
  const y = height * 0.75;
  const gap = s(14);
  const maxWidth = width - s(120);
  let x = (width - Math.min(maxWidth, features.length * s(255) + (features.length - 1) * gap)) / 2;

  ctx.save();
  features.forEach(feature => {
    const badgeWidth = Math.min(s(255), maxWidth / features.length - gap);
    ctx.fillStyle = COLORS.purpleSoft;
    roundedRect(ctx, x, y, badgeWidth, s(64), s(20));
    ctx.fill();
    ctx.fillStyle = COLORS.purple;
    ctx.font = `800 ${s(21)}px Cairo, Tahoma, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const safeText = truncateToWidth(ctx, feature, badgeWidth - s(24));
    ctx.fillText(safeText, x + badgeWidth / 2, y + s(32));
    x += badgeWidth + gap;
  });
  ctx.restore();
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  details: AdDetails,
  width: number,
  height: number,
  s: (value: number) => number
) {
  const footerHeight = s(104);
  const footerY = height - s(52) - footerHeight;
  ctx.save();
  ctx.fillStyle = COLORS.red;
  roundedRect(ctx, s(50), footerY, width - s(100), footerHeight, s(24));
  ctx.fill();

  ctx.fillStyle = COLORS.white;
  ctx.textBaseline = 'middle';
  if (details.storeName.trim()) {
    ctx.font = `900 ${s(28)}px Cairo, Tahoma, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(details.storeName.trim(), width - s(78), footerY + footerHeight / 2);
  }
  if (details.storePhone.trim()) {
    ctx.font = `700 ${s(25)}px Cairo, Tahoma, sans-serif`;
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    ctx.fillText(details.storePhone.trim(), s(78), footerY + footerHeight / 2);
  }
  ctx.restore();
}

async function drawImageContain(
  ctx: CanvasRenderingContext2D,
  imageSrc: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
) {
  const image = await loadImage(imageSrc);
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * ratio;
  const height = image.height * ratio;
  ctx.save();
  ctx.drawImage(image, x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height);
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
    const timeout = window.setTimeout(() => finish(() => reject(new Error('انتهت مهلة تحميل صورة الملابس'))), 10_000);
    image.onload = () => finish(() => resolve(image));
    image.onerror = () => finish(() => reject(new Error('تعذر تحميل صورة الملابس')));
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.src = source;

    if (typeof image.decode === 'function') {
      image.decode().then(() => finish(() => resolve(image))).catch(() => {
        // onload/onerror remain as a compatible fallback for data URLs and older browsers.
      });
    }
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

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = '';
  let lineIndex = 0;

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
      continue;
    }
    ctx.fillText(line, x, y + lineIndex * lineHeight);
    lineIndex += 1;
    if (lineIndex >= maxLines) return;
    line = word;
  }

  if (line && lineIndex < maxLines) ctx.fillText(truncateToWidth(ctx, line, maxWidth), x, y + lineIndex * lineHeight);
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  let output = text;
  while (output.length && ctx.measureText(`${output}${ellipsis}`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}${ellipsis}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('تعذر تصدير الإعلان كصورة'));
    }, type, quality);
  });
}
