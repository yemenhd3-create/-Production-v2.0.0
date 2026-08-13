import type {
  AdDetails,
  CanvasSettings,
  TemplateSettings,
  TryOnResult,
} from './types';

export function buildMarketingText(details: AdDetails): string {
  if (details.marketingText.trim()) return details.marketingText.trim();

  const product = details.productName.trim() || 'قطعة مميزة';
  const headline = details.headline.trim();
  const features = details.features.filter(Boolean).slice(0, 2).join('، ');
  const price = details.price.trim() ? ` بسعر ${details.price.trim()} ${details.currency}` : '';
  const store = details.storeName.trim();
  const phone = details.storePhone.trim();
  const callToAction = price
    ? `${price}. اطلبها الآن قبل نفاد الكمية.`
    : 'اطلبها الآن قبل نفاد الكمية.';

  return [
    product,
    headline,
    features ? `تتميز بـ ${features}` : '',
    callToAction,
    store ? `متوفر لدى ${store}` : '',
    phone ? `للطلب: ${phone}` : '',
  ]
    .filter(Boolean)
    .join(' — ');
}

export function createLocalFallbackResult(reason?: string): TryOnResult {
  return {
    status: 'fallback',
    message: reason
      ? `تعذّر التلبيس بالذكاء الاصطناعي (${reason})؛ استخدمنا صورة القطعة الأصلية داخل القالب.`
      : 'تعذّر التلبيس بالذكاء الاصطناعي؛ استخدمنا صورة القطعة الأصلية داخل القالب.',
  };
}

export type CloudTryOnResponse = {
  imageUrl: string;
  providerId: string;
  message: string;
  isTransparent?: boolean;
  transparentSubject?: 'person' | 'garment';
};

/** Resolves the exact image source the Home workflow passes to Canvas. */
export async function resolveTryOnVisualSource(
  productImage: string,
  runCloudTryOn: () => Promise<CloudTryOnResponse>,
  prepareResultImage: (url: string) => Promise<string>
): Promise<{ imageForCanvas: string; result: TryOnResult }> {
  try {
    const cloudResult = await runCloudTryOn();
    const imageForCanvas = await prepareResultImage(cloudResult.imageUrl);
    return {
      imageForCanvas,
      result: {
        status: 'success',
        imageUrl: cloudResult.imageUrl,
        providerId: cloudResult.providerId,
        message: cloudResult.message,
        isTransparent: cloudResult.isTransparent === true,
        transparentSubject: cloudResult.transparentSubject,
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'تعذر الاتصال بالمزود';
    return { imageForCanvas: productImage, result: createLocalFallbackResult(reason) };
  }
}

export function deriveOldPrice(price: string, discount: string): string {
  const currentPrice = Number.parseFloat(price);
  const percentage = Number.parseFloat(discount);

  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return '';
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage >= 100) return '';

  return (currentPrice / (1 - percentage / 100)).toFixed(0);
}

export function getCanvasDimensions(size: TemplateSettings['size']) {
  const dimensions = {
    portrait: { width: 1080, height: 1350 },
    square: { width: 1080, height: 1080 },
    story: { width: 1080, height: 1920 },
    whatsapp: { width: 1080, height: 1440 },
    landscape: { width: 1200, height: 628 },
  } as const;
  return dimensions[size] || dimensions.portrait;
}

/** Temporary adapter while the Canvas renderer is migrated to the redesigned contract. */
export function toCanvasSettings(
  details: AdDetails,
  template: TemplateSettings
): CanvasSettings {
  return {
    storeName: template.showStoreInfo ? details.storeName.trim() : '',
    storePhone: template.showStoreInfo ? details.storePhone.trim() : '',
    storeLocation: '',
    defaultCurrency: details.currency,
    backgroundColor: '#FFFDF7',
    textColor: '#25235F',
    accentColor: '#C9151D',
    showQualityBadge: template.showFeatures,
    showDiscount: template.showDiscount && Boolean(deriveOldPrice(details.price, details.discount)),
    productName: template.showProductName ? details.productName.trim() : '',
    subtitle: template.showHeadline ? details.headline.trim() : '',
    oldPrice: deriveOldPrice(details.price, details.discount),
    newPrice: template.showPrice ? details.price.trim() : '',
    currency: details.currency,
    colors: template.showColors ? details.colors : [],
    quantity: template.showQuantity ? Number.parseInt(details.quantity, 10) || undefined : undefined,
  };
}
