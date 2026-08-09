/**
 * AI Integration Module
 * Handles integration with multiple AI providers for text and image generation
 */

import { ProductData, TextGenerationResponse } from '@shared/types';

const KIMI_API_KEY = import.meta.env.VITE_KIMI_API_KEY || '';
const KIMI_API_BASE_URL = 'https://api.tokenrouter.com/v1';
const AIML_API_KEY = import.meta.env.VITE_AIML_API_KEY || '';

/**
 * Generate marketing text using Kimi AI
 */
export async function generateMarketingTextWithAI(
  product: ProductData
): Promise<TextGenerationResponse> {
  if (!KIMI_API_KEY) {
    throw new Error('Kimi API key not configured');
  }

  try {
    const prompt = `أنت خبير تسويق متخصص في الملابس والأزياء. 
    
اكتب وصفاً تسويقياً احترافياً قصيراً (50-100 كلمة) للمنتج التالي:
- اسم المنتج: ${product.productName}
- الوصف: ${product.subtitle}
- السعر: ${product.newPrice} ${product.currency}
- المتجر: ${product.storeName}
${product.season ? `- الموسم: ${product.season}` : ''}

الوصف يجب أن يكون:
✓ جذاب وملهم
✓ يركز على الفوائد والجودة
✓ يشجع على الشراء
✓ باللغة العربية الفصحى مع كلمات عامية مناسبة`;

    const response = await fetch(`${KIMI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          {
            role: 'system',
            content: 'أنت مساعد تسويق احترافي متخصص في كتابة الأوصاف التسويقية للملابس والأزياء.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Kimi API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    return {
      text,
      title: product.productName,
      description: text,
      keywords: extractKeywords(text),
    };
  } catch (error) {
    console.error('Failed to generate marketing text:', error);
    throw error;
  }
}

/**
 * Generate product title using AI
 */
export async function generateProductTitle(product: ProductData): Promise<string> {
  if (!KIMI_API_KEY) {
    throw new Error('Kimi API key not configured');
  }

  try {
    const prompt = `اكتب عنواناً جذاباً وقصيراً (5-10 كلمات) لمنتج الملابس التالي:
${product.productName} - ${product.subtitle}

العنوان يجب أن يكون:
✓ جذاب وملهم
✓ يشجع على الشراء
✓ باللغة العربية`;

    const response = await fetch(`${KIMI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || product.productName;
  } catch (error) {
    console.error('Failed to generate title:', error);
    return product.productName;
  }
}

/**
 * Generate image using AIML API
 */
export async function generateImageWithAI(prompt: string): Promise<string> {
  if (!AIML_API_KEY) {
    throw new Error('AIML API key not configured');
  }

  try {
    const response = await fetch('https://api.aimlapi.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AIML_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `${prompt} - professional product photo, high quality, studio lighting, white background, Arabic text`,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Image generation failed: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data?.[0]?.url || '';
  } catch (error) {
    console.error('Failed to generate image:', error);
    throw error;
  }
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const words = text.split(/\s+/);
  const stopWords = ['في', 'من', 'إلى', 'هذا', 'ذلك', 'التي', 'الذي', 'و', 'أو'];

  return words
    .filter((word) => word.length > 3 && !stopWords.includes(word))
    .slice(0, 5)
    .map((word) => word.replace(/[،.!?]/g, ''));
}

/**
 * Check if AI keys are configured
 */
export function isAIConfigured(): boolean {
  return Boolean(KIMI_API_KEY || AIML_API_KEY);
}

/**
 * Get configured AI providers
 */
export function getConfiguredProviders(): string[] {
  const providers: string[] = [];

  if (KIMI_API_KEY) {
    providers.push('Kimi (Moonshot)');
  }

  if (AIML_API_KEY) {
    providers.push('AIML API');
  }

  return providers;
}

/**
 * Generate batch descriptions for multiple products
 */
export async function generateBatchDescriptions(
  products: ProductData[]
): Promise<TextGenerationResponse[]> {
  const results: TextGenerationResponse[] = [];

  for (const product of products) {
    try {
      const result = await generateMarketingTextWithAI(product);
      results.push(result);
    } catch (error) {
      console.error(`Failed to generate description for ${product.productName}:`, error);
      results.push({
        text: `${product.productName} - ${product.subtitle}`,
        title: product.productName,
        description: product.subtitle,
        keywords: [],
      });
    }
  }

  return results;
}
