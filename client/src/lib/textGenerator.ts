/**
 * Text Generation Utilities
 * Generates marketing text and descriptions for products
 */

import { ProductData } from '@shared/types';

/**
 * Generate marketing description
 */
export function generateDescription(product: ProductData): string {
  const descriptions = [
    `${product.productName} - ${product.subtitle}. جودة عالية وتصميم مميز.`,
    `احصل على ${product.productName} بأفضل سعر. ${product.subtitle} - خصم حتى الآن!`,
    `${product.productName} الأصلي - ${product.subtitle}. متوفر الآن في ${product.storeName}.`,
    `تسوق ${product.productName} - ${product.subtitle}. جودة مضمونة وسعر منافس.`,
    `${product.productName} - ${product.subtitle}. الخيار الأمثل للأناقة والراحة.`,
  ];

  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Generate title variations
 */
export function generateTitles(product: ProductData): string[] {
  return [
    `${product.productName} - ${product.subtitle}`,
    `احصل على ${product.productName} الآن`,
    `${product.subtitle} - ${product.productName}`,
    `تسوق ${product.productName} بسعر خاص`,
    `${product.productName} الأصلي`,
  ];
}

/**
 * Generate hashtags
 */
export function generateHashtags(product: ProductData): string[] {
  const tags = [
    '#' + product.productName.replace(/\s+/g, ''),
    '#' + product.storeName.replace(/\s+/g, ''),
    '#تسوق',
    '#أزياء',
    '#عرض_خاص',
    '#خصم',
    '#جودة',
    '#أصلي',
  ];

  const uniqueTags = Array.from(new Set(tags));
  return uniqueTags.slice(0, 10);
}

/**
 * Generate call-to-action
 */
export function generateCTA(product: ProductData): string[] {
  return [
    `اطلب الآن من ${product.storeName}`,
    `توفر محدودة - اشتري الآن`,
    `لا تفوت هذا العرض الرائع`,
    `اتصل بنا على ${product.storeName}`,
    `اشتري الآن وتمتع بالخصم`,
  ];
}

/**
 * Generate full marketing text
 */
export function generateMarketingText(product: ProductData): string {
  const description = generateDescription(product);
  const cta = generateCTA(product)[0];
  const hashtags = generateHashtags(product).join(' ');

  return `${description}\n\n${cta}\n\n${hashtags}`;
}

/**
 * Generate seasonal text
 */
export function generateSeasonalText(product: ProductData): string {
  const season = product.season || 'الصيف';
  const seasonalTexts: Record<string, string> = {
    الصيف: 'تجهز لفصل الصيف مع مجموعتنا الجديدة',
    الشتاء: 'دفء وراحة في فصل الشتاء',
    الربيع: 'استقبل الربيع بأناقة جديدة',
    الخريف: 'ألوان الخريف في مجموعتنا الحصرية',
  };

  return seasonalTexts[season] || `احصل على ${product.productName} الآن`;
}

/**
 * Generate price comparison text
 */
export function generatePriceText(product: ProductData): string {
  const oldPrice = parseFloat(product.oldPrice) || 0;
  const newPrice = parseFloat(product.newPrice) || 0;

  if (oldPrice > newPrice) {
    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    return `وفر ${discount}% - من ${oldPrice} ${product.currency} إلى ${newPrice} ${product.currency}`;
  }

  return `السعر: ${newPrice} ${product.currency}`;
}

/**
 * Generate product features text
 */
export function generateFeaturesText(product: ProductData): string {
  const features: string[] = [];

  if (product.colors && product.colors.length > 0) {
    features.push(`متوفر بـ ${product.colors.length} ألوان`);
  }

  if (product.sizes && product.sizes.length > 0) {
    features.push(`مقاسات متعددة`);
  }

  if (product.season) {
    features.push(`مناسب لـ ${product.season}`);
  }

  features.push('جودة عالية');
  features.push('توصيل سريع');

  return features.join(' • ');
}

/**
 * Generate Instagram caption
 */
export function generateInstagramCaption(product: ProductData): string {
  const title = generateTitles(product)[0];
  const features = generateFeaturesText(product);
  const hashtags = generateHashtags(product).join(' ');

  return `${title}\n\n${features}\n\n${hashtags}`;
}

/**
 * Generate WhatsApp message
 */
export function generateWhatsAppMessage(product: ProductData): string {
  return `مرحباً! 👋\n\nتحقق من ${product.productName}\n${product.subtitle}\n\nالسعر: ${product.newPrice} ${product.currency}\n\nللطلب: اتصل بنا الآن ☎️`;
}

/**
 * Generate email subject
 */
export function generateEmailSubject(product: ProductData): string {
  const subjects = [
    `عرض خاص: ${product.productName}`,
    `لا تفوت: ${product.subtitle}`,
    `خصم حتى الآن على ${product.productName}`,
    `${product.productName} - عرض محدود الوقت`,
  ];

  return subjects[Math.floor(Math.random() * subjects.length)];
}

/**
 * Generate email body
 */
export function generateEmailBody(product: ProductData): string {
  return `
مرحباً،

نود أن نعرض عليك منتجنا الجديد:

${product.productName}
${product.subtitle}

السعر الأصلي: ${product.oldPrice} ${product.currency}
السعر الحالي: ${product.newPrice} ${product.currency}

${generateFeaturesText(product)}

للطلب والمزيد من المعلومات، يرجى التواصل معنا:
${product.storeName}

شكراً لك! 🙏
  `.trim();
}

/**
 * Generate SMS message
 */
export function generateSMSMessage(product: ProductData): string {
  const discount = Math.round(
    ((parseFloat(product.oldPrice) - parseFloat(product.newPrice)) / parseFloat(product.oldPrice)) *
      100
  );

  return `${product.productName} - خصم ${discount}% الآن! السعر: ${product.newPrice} ${product.currency}. اطلب من ${product.storeName}`;
}

/**
 * Generate TikTok caption
 */
export function generateTikTokCaption(product: ProductData): string {
  return `${product.productName} 🔥\n${product.subtitle}\nخصم حتى الآن! 💰\n\n${generateHashtags(product).join(' ')}`;
}

/**
 * Validate text length
 */
export function validateTextLength(text: string, maxLength: number = 280): boolean {
  return text.length <= maxLength;
}

/**
 * Truncate text
 */
export function truncateText(text: string, maxLength: number = 280): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Count words
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Count characters
 */
export function countCharacters(text: string): number {
  return text.length;
}

/**
 * Generate random promotional phrase
 */
export function generatePromoPhrase(): string {
  const phrases = [
    'عرض حصري',
    'فرصة ذهبية',
    'أسعار مجنونة',
    'خصم كبير',
    'عرض محدود',
    'جودة مضمونة',
    'توصيل سريع',
    'ضمان أصلي',
    'أفضل سعر',
    'أكثر مبيعاً',
  ];

  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Generate product summary
 */
export function generateProductSummary(product: ProductData): string {
  return `
اسم المنتج: ${product.productName}
الوصف: ${product.subtitle}
المتجر: ${product.storeName}
السعر: ${product.newPrice} ${product.currency}
الموسم: ${product.season || 'عام'}
  `.trim();
}
