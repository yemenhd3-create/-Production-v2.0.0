import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_AD_DETAILS } from '../shared/types';
import { formatMarketingTextForWhatsApp, generateLocalMarketingText, sanitizeMarketingText } from '../shared/marketingText';

const invokeLLM = vi.fn();
vi.mock('./_core/llm', () => ({ invokeLLM }));

const { generateMarketingTextWithFallback } = await import('./marketingText');

const details = {
  ...DEFAULT_AD_DETAILS,
  productName: 'فستان صيفي',
  headline: 'أناقة ناعمة لكل يوم',
  features: ['قطن ناعم', 'مريح للحركة'],
  colors: ['أبيض', 'وردي'],
  price: '5000',
  currency: 'ريال',
  discount: '20',
  quantity: '12 قطعة',
  storeName: 'متجر مروان',
  storePhone: '770976559',
};

describe('مولد النص التسويقي العربي', () => {
  it('ينشئ نصاً محلياً غنياً من البيانات المدخلة فقط عند اختيار طول مفصل', () => {
    const result = generateLocalMarketingText(details, { tone: 'exciting', length: 'long', goal: 'inquiry' }, 1);

    expect(result.source).toBe('local');
    expect(result.text).toContain('فستان صيفي');
    expect(result.text).toContain('قطن ناعم');
    expect(result.text).toContain('أبيض');
    expect(result.text).toContain('5000 ريال');
    expect(result.text).toContain('خصم 20%');
    expect(result.text).toContain('متجر مروان');
    expect(result.text).toContain('770976559');
    expect(result.text).not.toContain('شحن مجاني');
    expect(result.text).not.toContain('ضمان');
  });

  it('يستمر دون اتصال ويبدل الصياغة بحسب النبرة والنسخة', () => {
    const first = generateLocalMarketingText(details, { tone: 'playful', length: 'short', goal: 'purchase' }, 0).text;
    const second = generateLocalMarketingText(details, { tone: 'playful', length: 'short', goal: 'purchase' }, 2).text;

    expect(first.length).toBeLessThan(second.length + 200);
    expect(first).not.toBe(second);
    expect(first).toContain('فستان صيفي');
  });

  it('ينظف الفراغات ويحد النص قبل عرضه أو مشاركته', () => {
    expect(sanitizeMarketingText('  نص   منظم\n وجميل  ')).toBe('نص منظم وجميل');
    expect(sanitizeMarketingText('س'.repeat(600))).toHaveLength(520);
  });

  it('ينسق نصاً قابلاً للنسخ في واتساب بالرموز مع حقول المنتج المدخلة فقط', () => {
    const text = formatMarketingTextForWhatsApp(details, 'إطلالة مريحة بتفاصيل ناعمة.', { goal: 'purchase', format: 'whatsapp' });

    expect(text).toContain('✨ *فستان صيفي*');
    expect(text).toContain('✅ *المميزات*');
    expect(text).toContain('💰 *السعر:* 5000 ريال');
    expect(text).toContain('📲 للتواصل: 770976559');
    expect(text).toContain('\n');
    expect(text).not.toContain('شحن مجاني');
    expect(text).not.toContain('ضمان');
  });

  it('يستخدم نص النموذج المنظم عند نجاح المسار السحابي', async () => {
    invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ text: 'فستان صيفي بتفاصيل أنيقة، تواصلي معنا لمعرفة الألوان المتاحة.' }) } }] });

    const result = await generateMarketingTextWithFallback(details, { tone: 'formal', length: 'medium', goal: 'inquiry' });

    expect(result).toMatchObject({ source: 'cloud' });
    expect(result.text).toContain('فستان صيفي');
    expect(invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5-mini', response_format: expect.any(Object) }));
  });

  it('يرجع للنص المحلي عند تعذر المسار السحابي', async () => {
    invokeLLM.mockRejectedValueOnce(new Error('offline'));

    const result = await generateMarketingTextWithFallback(details, { tone: 'persuasive', length: 'medium', goal: 'purchase' });

    expect(result.source).toBe('local-fallback');
    expect(result.text).toContain('فستان صيفي');
    expect(result.message).toContain('الصياغة المحلية');
  });
});
