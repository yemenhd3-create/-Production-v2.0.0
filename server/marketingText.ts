import { formatMarketingTextForWhatsApp, generateLocalMarketingText, resolveMarketingTextPreferences, sanitizeMarketingText } from '../shared/marketingText';
import type { AdDetails, MarketingTextPreferences } from '../shared/types';
import { invokeLLM } from './_core/llm';

export type MarketingTextGenerationResult = {
  text: string;
  source: 'cloud' | 'local-fallback';
  message?: string;
};

export async function generateMarketingTextWithFallback(
  details: AdDetails,
  preferences?: Partial<MarketingTextPreferences>,
  variant = 0
): Promise<MarketingTextGenerationResult> {
  const resolvedPreferences = resolveMarketingTextPreferences(preferences || details.marketingPreferences);
  const local = generateLocalMarketingText(details, resolvedPreferences, variant);

  try {
    const response = await invokeLLM({
      model: 'gpt-5-mini',
      maxTokens: 420,
      messages: [
        {
          role: 'system',
          content: 'أنت كاتب نصوص تسويقية عربية لمنتجات الملابس. اكتب بالفصحى الطبيعية في اتجاه RTL. كن جذاباً ومبهجاً ومقنعاً دون مبالغة أو ضغط. لا تخترع خامة أو سعراً أو خصماً أو كمية أو ضماناً أو تقييمات أو شحن أو ندرة غير موجودة في البيانات. لا تذكر أنك ذكاء اصطناعي. أعد JSON فقط وفق المخطط.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            details: {
              productName: details.productName,
              headline: details.headline,
              features: details.features,
              colors: details.colors,
              price: details.price,
              currency: details.currency,
              discount: details.discount,
              quantity: details.quantity,
              storeName: details.storeName,
              storePhone: details.storePhone,
            },
            preferences: resolvedPreferences,
            copyVariant: variant,
            rules: {
              short: 'جملة أو جملتان قصيرتان.',
              medium: '2 إلى 3 جمل موجزة.',
              long: '3 إلى 5 جمل موجزة.',
            },
          }),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'arabic_marketing_copy',
          strict: true,
          schema: {
            type: 'object',
            properties: { text: { type: 'string', minLength: 8, maxLength: 520 } },
            required: ['text'],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices[0]?.message.content;
    const raw = typeof content === 'string' ? content : '';
    const parsed = JSON.parse(raw) as { text?: unknown };
    const text = typeof parsed.text === 'string' ? sanitizeMarketingText(parsed.text) : '';
    if (text.length < 8) throw new Error('لم يرجع النموذج نصاً صالحاً');
    return { text: resolvedPreferences.format === 'whatsapp' ? formatMarketingTextForWhatsApp(details, text, resolvedPreferences) : text, source: 'cloud' };
  } catch {
    return {
      text: local.text,
      source: 'local-fallback',
      message: 'تعذر التوليد السحابي، فاستخدمنا الصياغة المحلية على هذا الهاتف.',
    };
  }
}
