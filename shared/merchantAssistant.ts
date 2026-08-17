import {
  DEFAULT_PRODUCT_SCALE,
  PRODUCT_SCALE_MAX,
  PRODUCT_SCALE_MIN,
  PRODUCT_SCALE_STEP,
  type AdDetails,
  type TemplateSettings,
  type TemplateVisualTheme,
} from './types';

export type MerchantStoreField = 'storeName' | 'storePhone' | 'storeLocation' | 'storeCategory';
export type MerchantVisibilityElement = 'headline' | 'price' | 'productName' | 'discount' | 'features';
export type MerchantUnsupportedCode = 'price-size' | 'store-name-position' | 'unknown';

export type MerchantCommand =
  | { type: 'set-visual-theme'; theme: TemplateVisualTheme }
  | { type: 'adjust-product-scale'; direction: 'increase' | 'decrease' }
  | { type: 'set-element-visibility'; element: MerchantVisibilityElement; visible: boolean }
  | { type: 'set-store-field'; field: MerchantStoreField; value: string }
  | { type: 'set-default-colors'; colors: string[] }
  | { type: 'unsupported'; code: MerchantUnsupportedCode };

export type MerchantProfile = {
  version: 1;
  onboardingComplete: boolean;
  storeName: string;
  storePhone: string;
  storeLocation: string;
  storeCategory: string;
  preferredTheme?: TemplateVisualTheme;
  preferredProductScale?: number;
  defaultColors: string[];
  hiddenElements: MerchantVisibilityElement[];
  appliedCommandCount: number;
  unsupportedRequests: Partial<Record<Exclude<MerchantUnsupportedCode, 'unknown'>, number>>;
  updatedAt: number;
};

const THEMES: TemplateVisualTheme[] = ['classic', 'midnight', 'rose', 'mint', 'sand'];
const VISIBILITY_FIELDS: Record<MerchantVisibilityElement, keyof Pick<TemplateSettings, 'showHeadline' | 'showPrice' | 'showProductName' | 'showDiscount' | 'showFeatures'>> = {
  headline: 'showHeadline',
  price: 'showPrice',
  productName: 'showProductName',
  discount: 'showDiscount',
  features: 'showFeatures',
};

function cleanText(value: unknown, limit = 80) {
  return typeof value === 'string' ? value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, limit) : '';
}

function normalizeArabic(value: string) {
  return value
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function boundedCount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(1_000, Math.floor(parsed)) : 0;
}

function uniqueColors(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(color => cleanText(color, 24)).filter(Boolean))).slice(0, 4);
}

export function createMerchantProfile(): MerchantProfile {
  return {
    version: 1,
    onboardingComplete: false,
    storeName: '',
    storePhone: '',
    storeLocation: '',
    storeCategory: '',
    defaultColors: [],
    hiddenElements: [],
    appliedCommandCount: 0,
    unsupportedRequests: {},
    updatedAt: Date.now(),
  };
}

export function normalizeMerchantProfile(value: unknown): MerchantProfile {
  const fallback = createMerchantProfile();
  if (!value || typeof value !== 'object') return fallback;
  const source = value as Record<string, unknown>;
  if (source.version !== 1) return fallback;
  const theme = THEMES.includes(source.preferredTheme as TemplateVisualTheme) ? source.preferredTheme as TemplateVisualTheme : undefined;
  const scale = Number(source.preferredProductScale);
  const hiddenElements = Array.isArray(source.hiddenElements)
    ? source.hiddenElements.filter((entry): entry is MerchantVisibilityElement => ['headline', 'price', 'productName', 'discount', 'features'].includes(entry as string))
    : [];
  const unsupported = source.unsupportedRequests && typeof source.unsupportedRequests === 'object'
    ? source.unsupportedRequests as Record<string, unknown>
    : {};
  return {
    version: 1,
    onboardingComplete: source.onboardingComplete === true,
    storeName: cleanText(source.storeName),
    storePhone: cleanText(source.storePhone, 32),
    storeLocation: cleanText(source.storeLocation),
    storeCategory: cleanText(source.storeCategory, 48),
    preferredTheme: theme,
    preferredProductScale: Number.isFinite(scale) ? Math.min(PRODUCT_SCALE_MAX, Math.max(PRODUCT_SCALE_MIN, scale)) : undefined,
    defaultColors: uniqueColors(source.defaultColors),
    hiddenElements: Array.from(new Set(hiddenElements)),
    appliedCommandCount: boundedCount(source.appliedCommandCount),
    unsupportedRequests: {
      'price-size': boundedCount(unsupported['price-size']) || undefined,
      'store-name-position': boundedCount(unsupported['store-name-position']) || undefined,
    },
    updatedAt: Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : fallback.updatedAt,
  };
}

function hasAny(input: string, terms: string[]) {
  return terms.some(term => input.includes(term));
}

function parseColors(input: string) {
  const palette: Array<[string, string[]]> = [
    ['أسود', ['اسود', 'اسود']],
    ['ذهبي', ['ذهبي', 'ذهب']],
    ['أحمر', ['احمر', 'حمراء']],
    ['أزرق', ['ازرق', 'زرقاء']],
    ['أبيض', ['ابيض', 'بيضاء']],
    ['وردي', ['وردي', 'زهري']],
    ['أخضر', ['اخضر', 'خضراء']],
  ];
  return palette.filter(([, aliases]) => hasAny(input, aliases)).map(([color]) => color).slice(0, 4);
}

export function parseMerchantCommands(raw: string): MerchantCommand[] {
  const input = normalizeArabic(raw);
  if (!input) return [{ type: 'unsupported', code: 'unknown' }];
  const commands: MerchantCommand[] = [];

  if (hasAny(input, ['اسم المحل فوق', 'اسم المتجر فوق', 'ضع اسم المحل فوق'])) commands.push({ type: 'unsupported', code: 'store-name-position' });
  if (hasAny(input, ['كبر السعر', 'خلي السعر كبير', 'السعر كبير'])) commands.push({ type: 'unsupported', code: 'price-size' });

  const themeAliases: Array<[TemplateVisualTheme, string[]]> = [
    ['midnight', ['ليلي', 'ليل', 'داكن']],
    ['rose', ['وردي', 'روز']],
    ['mint', ['نعناعي', 'مينت']],
    ['sand', ['رملي', 'رملي']],
    ['classic', ['كلاسيكي', 'تقليدي']],
  ];
  const matchedTheme = themeAliases.find(([, aliases]) => hasAny(input, aliases));
  if (matchedTheme && hasAny(input, ['قالب', 'نمط', 'ثيم', 'استخدم'])) commands.push({ type: 'set-visual-theme', theme: matchedTheme[0] });

  const asksForProduct = hasAny(input, ['صوره الملابس', 'صورة الملابس', 'القطعه', 'القطعة', 'الملابس', 'المنتج']);
  if (asksForProduct && hasAny(input, ['كبر', 'كبّر', 'اكبر', 'أكبر'])) commands.push({ type: 'adjust-product-scale', direction: 'increase' });
  if (asksForProduct && hasAny(input, ['صغر', 'صغّر', 'اصغر', 'أصغر'])) commands.push({ type: 'adjust-product-scale', direction: 'decrease' });

  const visibility: Array<[MerchantVisibilityElement, string[]]> = [
    ['headline', ['العنوان', 'العنوان الرئيسي']],
    ['price', ['السعر']],
    ['productName', ['اسم المنتج']],
    ['discount', ['الخصم']],
    ['features', ['المميزات', 'المزايا']],
  ];
  const hide = hasAny(input, ['لا تظهر', 'اخف', 'اخفي', 'اخفاء']);
  const show = hasAny(input, ['اظهر', 'أظهر', 'اعرض']);
  visibility.forEach(([element, aliases]) => {
    if (hasAny(input, aliases) && hide) commands.push({ type: 'set-element-visibility', element, visible: false });
    if (hasAny(input, aliases) && show && !hide) commands.push({ type: 'set-element-visibility', element, visible: true });
  });

  const colors = parseColors(input);
  if (colors.length > 0 && hasAny(input, ['الواني', 'ألواني', 'الوان', 'ألوان', 'لون'])) commands.push({ type: 'set-default-colors', colors });

  const nameMatch = raw.match(/(?:اسم\s+(?:المحل|المتجر)|اسمنا)\s*(?:هو|:)?\s*([^،,.\n]{2,60})/i);
  if (nameMatch) commands.push({ type: 'set-store-field', field: 'storeName', value: cleanText(nameMatch[1]) });
  const phoneMatch = raw.match(/(?:رقم(?:نا)?|واتساب)\s*(?:هو|:)?\s*([+0-9\s-]{6,32})/i);
  if (phoneMatch) commands.push({ type: 'set-store-field', field: 'storePhone', value: cleanText(phoneMatch[1], 32) });

  return commands.length > 0 ? commands : [{ type: 'unsupported', code: 'unknown' }];
}

export type MerchantCommandApplication = {
  template: TemplateSettings;
  profile: MerchantProfile;
  detailsPatch: Partial<Pick<AdDetails, 'storeName' | 'storePhone' | 'colors'>>;
  applied: MerchantCommand[];
  unsupported: MerchantUnsupportedCode[];
};

export function applyMerchantCommands(template: TemplateSettings, profile: MerchantProfile, commands: MerchantCommand[]): MerchantCommandApplication {
  let nextTemplate = { ...template };
  let nextProfile = normalizeMerchantProfile(profile);
  const detailsPatch: MerchantCommandApplication['detailsPatch'] = {};
  const applied: MerchantCommand[] = [];
  const unsupported: MerchantUnsupportedCode[] = [];

  commands.forEach(command => {
    if (command.type === 'unsupported') {
      unsupported.push(command.code);
      if (command.code !== 'unknown') nextProfile = {
        ...nextProfile,
        unsupportedRequests: { ...nextProfile.unsupportedRequests, [command.code]: Math.min(1_000, (nextProfile.unsupportedRequests[command.code] || 0) + 1) },
      };
      return;
    }
    if (command.type === 'set-visual-theme') {
      nextTemplate = { ...nextTemplate, visualTheme: command.theme };
      nextProfile = { ...nextProfile, preferredTheme: command.theme };
    }
    if (command.type === 'adjust-product-scale') {
      const current = nextTemplate.productScale ?? DEFAULT_PRODUCT_SCALE;
      const delta = command.direction === 'increase' ? PRODUCT_SCALE_STEP : -PRODUCT_SCALE_STEP;
      const scale = Math.min(PRODUCT_SCALE_MAX, Math.max(PRODUCT_SCALE_MIN, Math.round((current + delta) * 100) / 100));
      nextTemplate = { ...nextTemplate, productScale: scale };
      nextProfile = { ...nextProfile, preferredProductScale: scale };
    }
    if (command.type === 'set-element-visibility') {
      nextTemplate = { ...nextTemplate, [VISIBILITY_FIELDS[command.element]]: command.visible };
      const hidden = new Set(nextProfile.hiddenElements);
      if (command.visible) hidden.delete(command.element); else hidden.add(command.element);
      nextProfile = { ...nextProfile, hiddenElements: Array.from(hidden) };
    }
    if (command.type === 'set-store-field') {
      nextProfile = { ...nextProfile, [command.field]: cleanText(command.value, command.field === 'storePhone' ? 32 : 80) };
      if (command.field === 'storeName' || command.field === 'storePhone') detailsPatch[command.field] = nextProfile[command.field];
    }
    if (command.type === 'set-default-colors') {
      nextProfile = { ...nextProfile, defaultColors: uniqueColors(command.colors) };
      detailsPatch.colors = nextProfile.defaultColors;
    }
    applied.push(command);
  });

  nextProfile = { ...nextProfile, appliedCommandCount: Math.min(1_000, nextProfile.appliedCommandCount + applied.length), updatedAt: Date.now() };
  return { template: nextTemplate, profile: nextProfile, detailsPatch, applied, unsupported };
}

export function describeMerchantCommands(commands: MerchantCommand[]) {
  const descriptions = commands.map(command => {
    if (command.type === 'set-visual-theme') return `تغيير النمط إلى ${command.theme}.`;
    if (command.type === 'adjust-product-scale') return command.direction === 'increase' ? 'تكبير صورة القطعة ضمن المنطقة الآمنة.' : 'تصغير صورة القطعة ضمن المنطقة الآمنة.';
    if (command.type === 'set-element-visibility') return `${command.visible ? 'إظهار' : 'إخفاء'} ${command.element}.`;
    if (command.type === 'set-store-field') return 'تحديث معلومة المتجر المحددة.';
    if (command.type === 'set-default-colors') return `حفظ الألوان المفضلة: ${command.colors.join('، ')}.`;
    if (command.code === 'price-size') return 'تكبير السعر غير متاح في إعدادات التصميم الحالية؛ يمكن حفظه كاقتراح للمطور فقط.';
    if (command.code === 'store-name-position') return 'تغيير موضع اسم المتجر غير متاح في العقد الحالي؛ لم نغير التصميم.';
    return 'لم أفهم أمراً آمناً يمكن تطبيقه. جرّب نمطاً أو حجم القطعة أو ظهور العنوان.';
  });
  return descriptions.join('\n');
}

export function buildDeveloperInsight(profile: MerchantProfile) {
  const requests = profile.unsupportedRequests;
  if ((requests['price-size'] || 0) > 0) return 'اقتراح محلي للمطور: طلب التاجرون التحكم في حجم السعر، لكن هذا الخيار غير مدعوم في العقد الحالي. لا تُرسل هذه الملاحظة تلقائياً.';
  if ((requests['store-name-position'] || 0) > 0) return 'اقتراح محلي للمطور: طُلب تغيير موضع اسم المتجر، وهو غير مدعوم في العقد الحالي. لا تُرسل هذه الملاحظة تلقائياً.';
  return 'لا توجد ملاحظة تحسين متكررة بعد. ستظهر هنا فقط طلبات غير مدعومة وبصورة مجمعة.';
}
