import type {
  AdDetails,
  MarketingTextGoal,
  MarketingTextLength,
  MarketingTextPreferences,
  MarketingTextTone,
} from './types';

export const DEFAULT_MARKETING_TEXT_PREFERENCES: MarketingTextPreferences = {
  tone: 'persuasive',
  length: 'medium',
  goal: 'purchase',
};

export const MARKETING_TEXT_TONE_LABELS: Record<MarketingTextTone, string> = {
  exciting: 'مثير وجذاب',
  persuasive: 'مقنع وواثق',
  formal: 'رسمي وأنيق',
  playful: 'مرح ومبهج',
};

export const MARKETING_TEXT_LENGTH_LABELS: Record<MarketingTextLength, string> = {
  short: 'قصير',
  medium: 'متوسط',
  long: 'مفصل',
};

export const MARKETING_TEXT_GOAL_LABELS: Record<MarketingTextGoal, string> = {
  purchase: 'تشجيع الطلب',
  inquiry: 'تشجيع الاستفسار',
  showcase: 'عرض المنتج',
};

export type LocalMarketingTextResult = {
  text: string;
  source: 'local';
};

const clean = (value: string | undefined) => (value || '').replace(/\s+/g, ' ').trim();

export function resolveMarketingTextPreferences(
  preferences?: Partial<MarketingTextPreferences>
): MarketingTextPreferences {
  const tone = preferences?.tone;
  const length = preferences?.length;
  const goal = preferences?.goal;
  return {
    tone: tone === 'exciting' || tone === 'persuasive' || tone === 'formal' || tone === 'playful'
      ? tone
      : DEFAULT_MARKETING_TEXT_PREFERENCES.tone,
    length: length === 'short' || length === 'medium' || length === 'long'
      ? length
      : DEFAULT_MARKETING_TEXT_PREFERENCES.length,
    goal: goal === 'purchase' || goal === 'inquiry' || goal === 'showcase'
      ? goal
      : DEFAULT_MARKETING_TEXT_PREFERENCES.goal,
  };
}

function choose<T>(values: readonly T[], variant: number): T {
  return values[Math.abs(variant) % values.length];
}

function benefitLead(product: string, tone: MarketingTextTone, variant: number) {
  const leads: Record<MarketingTextTone, readonly string[]> = {
    exciting: [
      `${product} بتفاصيل تلفت الأنظار`,
      `امنح إطلالتك لمسة مميزة مع ${product}`,
      `${product} اختيار أنيق يضيف حضوراً أجمل`,
    ],
    persuasive: [
      `${product} يجمع بين الأناقة والعملية`,
      `اختيار مدروس لمن يبحث عن ${product} بتفاصيل جميلة`,
      `${product} مصمم ليكون إضافة مميزة لخزانتك`,
    ],
    formal: [
      `اكتشف ${product} بتفاصيل أنيقة`,
      `${product} خيار متوازن للاستخدام اليومي والمناسبات`,
      `نقدم ${product} بصياغة تجمع الوضوح والأناقة`,
    ],
    playful: [
      `لأن الإطلالة الجميلة تبدأ بتفصيل مميز: ${product}`,
      `${product} يضيف لمسة مبهجة إلى يومك`,
      `اختيار لطيف ومختلف مع ${product}`,
    ],
  };
  return choose(leads[tone], variant);
}

function callToAction(goal: MarketingTextGoal, product: string, variant: number) {
  const actions: Record<MarketingTextGoal, readonly string[]> = {
    purchase: [
      `اطلب ${product} الآن`,
      `أضف ${product} إلى اختياراتك اليوم`,
      `ابدأ طلبك الآن واستمتع بتفاصيله`,
    ],
    inquiry: [
      'راسلنا لمعرفة التفاصيل المتاحة',
      'تواصل معنا للاستفسار عن المقاسات والتوفر',
      'اسألنا الآن عن التفاصيل التي تهمك',
    ],
    showcase: [
      'اكتشف تفاصيله عن قرب',
      'تعرّف على ألوانه وتفاصيله المتاحة',
      'شاهد التفاصيل واختر ما يناسبك',
    ],
  };
  return choose(actions[goal], variant);
}

/**
 * مؤلف محلي لا يحتاج اتصالاً أو نموذجاً خارجياً. لا يذكر إلا بيانات أدخلها المستخدم،
 * ويغيّر الصياغة وفق النبرة والطول والهدف من دون اختلاق خصم أو ضمان أو ندرة.
 */
export function generateLocalMarketingText(
  details: AdDetails,
  suppliedPreferences?: Partial<MarketingTextPreferences>,
  variant = 0
): LocalMarketingTextResult {
  const preferences = resolveMarketingTextPreferences(suppliedPreferences || details.marketingPreferences);
  const product = clean(details.productName) || 'هذه القطعة المميزة';
  const features = details.features.map(clean).filter(Boolean).slice(0, 2);
  const colors = details.colors.map(clean).filter(Boolean).slice(0, 3);
  const headline = clean(details.headline);
  const price = clean(details.price);
  const currency = clean(details.currency);
  const discount = clean(details.discount);
  const quantity = clean(details.quantity);
  const store = clean(details.storeName);
  const phone = clean(details.storePhone);

  const lead = benefitLead(product, preferences.tone, variant);
  const featureSentence = features.length > 0 ? `يتميّز بـ ${features.join('، ')}.` : '';
  const colorSentence = colors.length > 0 ? `متوفر بألوان ${colors.join('، ')}.` : '';
  const offerParts = [
    price ? `السعر ${price}${currency ? ` ${currency}` : ''}.` : '',
    discount ? `خصم ${discount}%.` : '',
    quantity ? `الكمية المتاحة: ${quantity}.` : '',
  ].filter(Boolean);
  const contact = [
    store ? `متاح لدى ${store}.` : '',
    phone ? `${preferences.goal === 'inquiry' ? 'للتواصل' : 'للطلب والاستفسار'}: ${phone}.` : '',
  ].filter(Boolean);
  const action = callToAction(preferences.goal, product, variant + 1);

  const sentences = [
    `${lead}${headline ? ` — ${headline}` : ''}.`,
    featureSentence,
    colorSentence,
    ...offerParts,
    ...contact,
    `${action}.`,
  ].filter(Boolean);

  const selected = preferences.length === 'short'
    ? [sentences[0], sentences[sentences.length - 1]]
    : preferences.length === 'medium'
      ? [sentences[0], featureSentence || colorSentence || offerParts[0], contact.join(' '), sentences[sentences.length - 1]]
      : sentences;

  return {
    text: sanitizeMarketingText(selected.filter(Boolean).join(' ')),
    source: 'local',
  };
}

/** تحافظ على مخرجات قابلة للعرض والمشاركة ولا تسمح بنص طويل جداً أو أسطر زائدة. */
export function sanitizeMarketingText(value: string, maxLength = 520): string {
  return clean(value).slice(0, maxLength).trim();
}
