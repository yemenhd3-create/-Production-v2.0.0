export const MAX_PRIVATE_KEY_BATCH = 40;
export const MAX_PARALLEL_PRIVATE_KEY_CHECKS = 4;

export type PrivateKeyProviderId = 'gemini' | 'hugging-face' | 'openrouter' | 'groq' | 'replicate';
export type PrivateKeyInspectionState = 'valid' | 'invalid' | 'limited' | 'unavailable' | 'unrecognized';

export type PrivateKeyInspectionResult = {
  index: number;
  provider: PrivateKeyProviderId | null;
  providerLabel: string;
  state: PrivateKeyInspectionState;
  message: string;
  suggestedUses: string[];
};

type ProviderDefinition = {
  id: PrivateKeyProviderId;
  label: string;
  pattern: RegExp;
  endpoint: string;
  header: (key: string) => HeadersInit;
  suggestedUses: string[];
};

const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'gemini',
    label: 'Google Gemini API',
    pattern: /^AIza[\w-]{20,}$/,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    header: key => ({ Accept: 'application/json', 'x-goog-api-key': key }),
    suggestedUses: ['تقوية القائد المتصل للنصوص والتخطيط', 'تحليل نصي اختياري دون إرسال الصور تلقائياً'],
  },
  {
    id: 'hugging-face',
    label: 'Hugging Face',
    pattern: /^hf_[A-Za-z0-9]{10,}$/,
    endpoint: 'https://huggingface.co/api/whoami-v2',
    header: key => ({ Accept: 'application/json', Authorization: `Bearer ${key}` }),
    suggestedUses: ['الوصول إلى نماذج أو ملفات مسموح بها', 'تجارب Inference Providers عند توافرها في الحساب'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    pattern: /^sk-or-v1-[A-Za-z0-9_-]{10,}$/,
    endpoint: 'https://openrouter.ai/api/v1/models',
    header: key => ({ Accept: 'application/json', Authorization: `Bearer ${key}` }),
    suggestedUses: ['بوابة نماذج متعددة للقائد المتصل', 'اختيار نموذج بديل عند تعذر مزود أساسي'],
  },
  {
    id: 'groq',
    label: 'Groq',
    pattern: /^gsk_[A-Za-z0-9_-]{10,}$/,
    endpoint: 'https://api.groq.com/openai/v1/models',
    header: key => ({ Accept: 'application/json', Authorization: `Bearer ${key}` }),
    suggestedUses: ['ردود محادثة سريعة', 'بديل نصي متصل للقائد عند توافر الحصة'],
  },
  {
    id: 'replicate',
    label: 'Replicate',
    pattern: /^r8_[A-Za-z0-9_-]{10,}$/,
    endpoint: 'https://api.replicate.com/v1/account',
    header: key => ({ Accept: 'application/json', Authorization: `Bearer ${key}` }),
    suggestedUses: ['تجارب نماذج صور عند توافر رصيد', 'تقييم مزود صور قبل دمجه في التطبيق'],
  },
];

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function splitPrivateKeyBatch(value: string) {
  const entries = value.split(/[\s,;]+/).map(item => item.trim()).filter(Boolean);
  if (entries.length > MAX_PRIVATE_KEY_BATCH) {
    throw new Error(`أدخل ${MAX_PRIVATE_KEY_BATCH} مفتاحاً كحد أقصى في الدفعة الواحدة.`);
  }
  return entries;
}

export function identifyPrivateKeyProvider(value: string): ProviderDefinition | undefined {
  return PROVIDERS.find(provider => provider.pattern.test(value));
}

function staticResult(index: number, provider: ProviderDefinition | undefined): PrivateKeyInspectionResult {
  if (!provider) {
    return {
      index,
      provider: null,
      providerLabel: 'موفّر غير معروف',
      state: 'unrecognized',
      message: 'لم نرسل هذا المفتاح إلى أي جهة لأن صيغته لا تحدد موفّره بدرجة كافية.',
      suggestedUses: ['احتفظ به خارج هذه المحادثة حتى تعرف مصدره من لوحة الموقع الذي أنشأته.'],
    };
  }
  return {
    index,
    provider: provider.id,
    providerLabel: provider.label,
    state: 'unavailable',
    message: 'تعذر تنفيذ فحص الاتصال.',
    suggestedUses: provider.suggestedUses,
  };
}

async function inspectKnownKey(index: number, key: string, provider: ProviderDefinition, request: FetchLike): Promise<PrivateKeyInspectionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await request(provider.endpoint, {
      method: 'GET',
      headers: provider.header(key),
      signal: controller.signal,
    });
    const base = staticResult(index, provider);
    if (response.ok) {
      return { ...base, state: 'valid', message: 'المفتاح صالح للاستدعاء في هذا الحساب. لم يُحفظ المفتاح.' };
    }
    if (response.status === 401 || response.status === 403) {
      return { ...base, state: 'invalid', message: 'رفض الموفّر المفتاح أو لا يمنحه صلاحية لهذا الفحص.' };
    }
    if (response.status === 402 || response.status === 429) {
      return { ...base, state: 'limited', message: 'تم التعرف إلى المفتاح، لكن الرصيد أو الحصة أو حد الطلبات يمنع الفحص حالياً.' };
    }
    return { ...base, state: 'unavailable', message: 'استجاب الموفّر بخطأ مؤقت؛ لم نكرر الطلب ولم نحتفظ بالمفتاح.' };
  } catch {
    return { ...staticResult(index, provider), message: 'تعذر الوصول إلى الموفّر خلال مهلة الفحص. لم نكرر الطلب ولم نحتفظ بالمفتاح.' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The raw key values live only for the duration of this request. Results intentionally
 * contain no raw key, mask, fingerprint, response body, endpoint, or account identity.
 */
export async function inspectPrivateKeyBatch(rawKeys: string, request: FetchLike = fetch): Promise<PrivateKeyInspectionResult[]> {
  const keys = splitPrivateKeyBatch(rawKeys);
  const results: PrivateKeyInspectionResult[] = [];
  for (let start = 0; start < keys.length; start += MAX_PARALLEL_PRIVATE_KEY_CHECKS) {
    const group = keys.slice(start, start + MAX_PARALLEL_PRIVATE_KEY_CHECKS);
    const inspected = await Promise.all(group.map((key, offset) => {
      const index = start + offset + 1;
      const provider = identifyPrivateKeyProvider(key);
      return provider ? inspectKnownKey(index, key, provider, request) : Promise.resolve(staticResult(index, undefined));
    }));
    results.push(...inspected);
  }
  return results;
}
