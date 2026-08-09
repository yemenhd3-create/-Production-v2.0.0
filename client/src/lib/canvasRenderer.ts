/**
 * Canvas Renderer - Professional Ad Generator
 * Generates high-quality advertisement images for clothing products
 * Matches reference design: white background, centered product, discount badge, price panel, footer
 */

import { CanvasSettings, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH } from '@shared/types';

interface RenderOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Main render function - generates complete ad image
 */
export async function renderAd(
  settings: CanvasSettings,
  productImageSrc: string,
  options: RenderOptions = {}
): Promise<string> {
  const width = options.width || DEFAULT_CANVAS_WIDTH;
  const height = options.height || DEFAULT_CANVAS_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // 1. White background
  ctx.fillStyle = settings.backgroundColor || '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. Discount badge (top-left)
  if (settings.showDiscount !== false) {
    drawDiscountBadge(ctx, settings, width, height);
  }

  // 3. Product title (top-center)
  drawProductTitle(ctx, settings, width, height);

  // 4. Quality badge (top-right)
  if (settings.showQualityBadge !== false) {
    drawQualityBadge(ctx, width, height);
  }

  // 5. Product image (center, large)
  if (productImageSrc) {
    await drawProductImage(ctx, productImageSrc, width, height);
  }

  // 6. Left info panel
  drawLeftInfoPanel(ctx, settings, width, height);

  // 7. Right price panel
  drawRightPricePanel(ctx, settings, width, height);

  // 8. Features badges
  drawFeaturesBadges(ctx, settings, width, height);

  // 9. Footer bar
  drawFooterBar(ctx, settings, width, height);

  return canvas.toDataURL('image/png', options.quality || 0.95);
}

/**
 * Draw discount badge (shield shape, top-left)
 */
function drawDiscountBadge(
  ctx: CanvasRenderingContext2D,
  settings: CanvasSettings,
  width: number,
  height: number
) {
  const oldPrice = parseFloat(settings.oldPrice) || 0;
  const newPrice = parseFloat(settings.newPrice) || 0;
  const discount =
    oldPrice > newPrice && oldPrice > 0 ? Math.round(((oldPrice - newPrice) / oldPrice) * 100) : 0;

  if (discount <= 0) return;

  const x = width * 0.02;
  const y = height * 0.01;
  const badgeWidth = width * 0.15;
  const badgeHeight = height * 0.12;

  ctx.save();

  // Shield shape
  ctx.beginPath();
  ctx.moveTo(x + badgeWidth / 2, y);
  ctx.lineTo(x + badgeWidth, y + badgeHeight * 0.2);
  ctx.lineTo(x + badgeWidth, y + badgeHeight * 0.7);
  ctx.quadraticCurveTo(x + badgeWidth, y + badgeHeight, x + badgeWidth / 2, y + badgeHeight);
  ctx.quadraticCurveTo(x, y + badgeHeight, x, y + badgeHeight * 0.7);
  ctx.lineTo(x, y + badgeHeight * 0.2);
  ctx.closePath();

  // Fill with gradient
  const grad = ctx.createLinearGradient(x, y, x, y + badgeHeight);
  grad.addColorStop(0, '#DC2626');
  grad.addColorStop(1, '#991B1B');
  ctx.fillStyle = grad;
  ctx.fill();

  // Border
  ctx.strokeStyle = '#B91C1C';
  ctx.lineWidth = 2;
  ctx.stroke();

  // "خصم" text
  ctx.fillStyle = '#F5C200';
  ctx.font = `bold ${badgeHeight * 0.3}px Cairo, Tahoma, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('خصم', x + badgeWidth / 2, y + badgeHeight * 0.35);

  // Percentage
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${badgeHeight * 0.6}px Cairo, Tahoma, sans-serif`;
  ctx.fillText(`${discount}%`, x + badgeWidth / 2, y + badgeHeight * 0.65);

  ctx.restore();
}

/**
 * Draw product title (top-center)
 */
function drawProductTitle(
  ctx: CanvasRenderingContext2D,
  settings: CanvasSettings,
  width: number,
  height: number
) {
  const y = height * 0.03;
  const maxWidth = width * 0.6;

  ctx.save();
  ctx.fillStyle = settings.textColor || '#000000';
  ctx.font = `bold ${height * 0.06}px Cairo, Tahoma, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Draw title with text wrapping
  const title = settings.productName || 'اسم المنتج';
  wrapText(ctx, title, width / 2, y, maxWidth, height * 0.08);

  ctx.restore();
}

/**
 * Draw quality badge (top-right)
 */
function drawQualityBadge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const x = width * 0.85;
  const y = height * 0.02;
  const badgeSize = height * 0.08;

  ctx.save();

  // Circle background
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.arc(x, y + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // Icon or text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${badgeSize * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', x, y + badgeSize / 2);

  ctx.restore();
}

/**
 * Draw product image (center)
 */
async function drawProductImage(
  ctx: CanvasRenderingContext2D,
  imageSrc: string,
  width: number,
  height: number
) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      ctx.save();

      // Calculate dimensions to fit image in center area
      const maxWidth = width * 0.5;
      const maxHeight = height * 0.5;
      const imgAspect = img.width / img.height;

      let drawWidth = maxWidth;
      let drawHeight = maxWidth / imgAspect;

      if (drawHeight > maxHeight) {
        drawHeight = maxHeight;
        drawWidth = maxHeight * imgAspect;
      }

      const x = (width - drawWidth) / 2;
      const y = height * 0.2;

      // Draw image
      ctx.drawImage(img, x, y, drawWidth, drawHeight);

      ctx.restore();
      resolve();
    };

    img.onerror = () => {
      console.error('Failed to load product image');
      resolve();
    };

    img.src = imageSrc;
  });
}

/**
 * Draw left info panel (quantity, pieces, colors)
 */
function drawLeftInfoPanel(
  ctx: CanvasRenderingContext2D,
  settings: CanvasSettings,
  width: number,
  height: number
) {
  const x = width * 0.02;
  const y = height * 0.5;
  const panelWidth = width * 0.15;
  const panelHeight = height * 0.35;
  const itemHeight = panelHeight * 0.2;

  ctx.save();

  // Panel background
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(x, y, panelWidth, panelHeight);

  // Border
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  // Items
  const items = [
    { icon: '👕', label: 'العدد', value: settings.quantity || '1' },
    { icon: '📏', label: 'الكمية', value: '1' },
    { icon: '🎨', label: 'الألوان', value: settings.colors?.length || '0' },
  ];

  items.forEach((item, index) => {
    const itemY = y + index * itemHeight + itemHeight * 0.1;

    // Icon
    ctx.font = `${itemHeight * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(item.icon, x + panelWidth / 2, itemY);

    // Label
    ctx.fillStyle = '#666666';
    ctx.font = `${itemHeight * 0.25}px Cairo`;
    ctx.textAlign = 'center';
    ctx.fillText(item.label, x + panelWidth / 2, itemY + itemHeight * 0.25);

    // Value
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${itemHeight * 0.3}px Cairo`;
    ctx.fillText(String(item.value), x + panelWidth / 2, itemY + itemHeight * 0.5);
  });

  ctx.restore();
}

/**
 * Draw right price panel
 */
function drawRightPricePanel(
  ctx: CanvasRenderingContext2D,
  settings: CanvasSettings,
  width: number,
  height: number
) {
  const x = width * 0.83;
  const y = height * 0.5;
  const panelWidth = width * 0.15;
  const panelHeight = height * 0.35;

  ctx.save();

  // Panel background (red)
  ctx.fillStyle = '#C41A1A';
  ctx.fillRect(x, y, panelWidth, panelHeight);

  // Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${panelHeight * 0.15}px Cairo`;
  ctx.textAlign = 'center';
  ctx.fillText(settings.subtitle || 'عنوان', x + panelWidth / 2, y + panelHeight * 0.1);

  // Divider
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + panelWidth * 0.1, y + panelHeight * 0.2);
  ctx.lineTo(x + panelWidth * 0.9, y + panelHeight * 0.2);
  ctx.stroke();

  // Old price (strikethrough)
  ctx.fillStyle = '#FFD700';
  ctx.font = `${panelHeight * 0.12}px Cairo`;
  ctx.textAlign = 'center';
  const oldPriceY = y + panelHeight * 0.35;
  ctx.fillText(
    `${settings.oldPrice} ${settings.currency}`,
    x + panelWidth / 2,
    oldPriceY
  );
  // Strikethrough line
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + panelWidth * 0.15, oldPriceY - panelHeight * 0.03);
  ctx.lineTo(x + panelWidth * 0.85, oldPriceY - panelHeight * 0.03);
  ctx.stroke();

  // New price (large, bold)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${panelHeight * 0.25}px Cairo`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `${settings.newPrice}`,
    x + panelWidth / 2,
    y + panelHeight * 0.6
  );

  // Currency
  ctx.font = `${panelHeight * 0.12}px Cairo`;
  ctx.fillText(
    settings.currency,
    x + panelWidth / 2,
    y + panelHeight * 0.75
  );

  ctx.restore();
}

/**
 * Draw features badges
 */
function drawFeaturesBadges(
  ctx: CanvasRenderingContext2D,
  settings: CanvasSettings,
  width: number,
  height: number
) {
  const features = [
    { icon: '⭐', text: 'جودة عالية' },
    { icon: '✨', text: 'قطن ناعم' },
  ];

  const x = width * 0.02;
  const y = height * 0.88;
  const badgeWidth = width * 0.15;
  const badgeHeight = height * 0.08;

  ctx.save();

  features.forEach((feature, index) => {
    const badgeY = y + index * (badgeHeight + height * 0.02);

    // Badge background
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(x, badgeY, badgeWidth, badgeHeight);

    // Border
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, badgeY, badgeWidth, badgeHeight);

    // Icon
    ctx.font = `${badgeHeight * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(feature.icon, x + badgeWidth * 0.2, badgeY + badgeHeight / 2);

    // Text
    ctx.font = `${badgeHeight * 0.35}px Cairo`;
    ctx.textAlign = 'right';
    ctx.fillText(feature.text, x + badgeWidth * 0.9, badgeY + badgeHeight / 2);
  });

  ctx.restore();
}

/**
 * Draw footer bar with store info
 */
function drawFooterBar(
  ctx: CanvasRenderingContext2D,
  settings: CanvasSettings,
  width: number,
  height: number
) {
  const footerHeight = height * 0.08;
  const footerY = height - footerHeight;

  ctx.save();

  // Background
  ctx.fillStyle = '#8B0000';
  ctx.fillRect(0, footerY, width, footerHeight);

  // Store info
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${footerHeight * 0.4}px Cairo`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const padding = width * 0.02;
  const centerY = footerY + footerHeight / 2;

  // Store name
  ctx.fillText(settings.storeName, width - padding, centerY);

  // Phone
  ctx.font = `${footerHeight * 0.35}px Cairo`;
  ctx.fillText(`☎ ${settings.storePhone}`, width * 0.5, centerY);

  // Location
  ctx.fillText(`📍 ${settings.storeLocation}`, padding, centerY);

  ctx.restore();
}

/**
 * Helper function to wrap text
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, lineY);
      line = words[i] + ' ';
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, lineY);
  }
}

/**
 * Download canvas as image
 */
export function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string = 'ad.png'
): void {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
