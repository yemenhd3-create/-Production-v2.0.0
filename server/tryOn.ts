import { and, eq } from 'drizzle-orm';
import { developerProviders } from '../drizzle/schema';
import { getDb } from './db';
import { decryptProviderKey } from './developerProviders';
import { storagePut } from './storage';

const FASHN_PRODUCT_TO_MODEL = 'product-to-model';
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 20;

export type TryOnAspectRatio = '4:5' | '9:16';
export type CloudTryOnResult = {
  status: 'success';
  imageUrl: string;
  providerId: string;
  message: string;
};

type TryOnRuntimeOptions = {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
};

type FashnStatusResponse = {
  status?: string;
  output?: unknown;
  error?: string;
};

function asUrl(value: unknown): string | undefined {
  return typeof value === 'string' && /^https?:\/\//.test(value) ? value : undefined;
}

/** FASHN may return output as a URL, an array, or an object with a result URL. */
export function extractOutputImageUrl(output: unknown): string | undefined {
  const direct = asUrl(output);
  if (direct) return direct;
  if (Array.isArray(output)) {
    for (const item of output) {
      const url = extractOutputImageUrl(item);
      if (url) return url;
    }
    return undefined;
  }
  if (output && typeof output === 'object') {
    const record = output as Record<string, unknown>;
    for (const key of ['url', 'image_url', 'image', 'result', 'images']) {
      const url = extractOutputImageUrl(record[key]);
      if (url) return url;
    }
  }
  return undefined;
}

function endpoint(baseUrl: string, path: string) {
  return new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/+$/, '')}/`).toString();
}

async function wait(milliseconds: number) {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function storeGeneratedImage(sourceUrl: string) {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error('تعذر تنزيل نتيجة التلبيس من المزود');
  const contentType = response.headers.get('content-type')?.split(';')[0] || 'image/png';
  if (!contentType.startsWith('image/')) throw new Error('استجاب المزود بملف ليس صورة');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > 15 * 1024 * 1024) throw new Error('نتيجة التلبيس أكبر من الحد المسموح');
  return storagePut(`tryon-results/${Date.now()}.png`, bytes, contentType);
}

/**
 * Runs FASHN Product to Model when a developer has explicitly configured an enabled
 * `product-to-model` provider. API keys remain on the server and are never returned.
 */
export async function runProductToModelTryOn(
  productImageData: string,
  aspectRatio: TryOnAspectRatio,
  options: TryOnRuntimeOptions = {}
): Promise<CloudTryOnResult> {
  const db = await getDb();
  if (!db) throw new Error('قاعدة البيانات غير متاحة حالياً');
  const provider = (await db
    .select()
    .from(developerProviders)
    .where(and(eq(developerProviders.isEnabled, 1), eq(developerProviders.model, FASHN_PRODUCT_TO_MODEL)))
    .limit(1))[0];

  if (!provider) {
    throw new Error('لا يوجد مزود Product to Model مفعّل في لوحة المطور');
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${decryptProviderKey(provider.encryptedApiKey)}`,
  };
  const runResponse = await fetch(endpoint(provider.baseUrl, '/run'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model_name: FASHN_PRODUCT_TO_MODEL,
      inputs: {
        product_image: productImageData,
        aspect_ratio: aspectRatio,
        resolution: '1k',
      },
    }),
  });
  if (!runResponse.ok) throw new Error(`رفض مزود Try-On الطلب (${runResponse.status})`);

  const runData = (await runResponse.json()) as { id?: string; error?: string };
  if (!runData.id) throw new Error(runData.error || 'لم يعطِ مزود Try-On معرفاً للمهمة');

  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
  const maxPollAttempts = options.maxPollAttempts ?? MAX_POLL_ATTEMPTS;
  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    await wait(pollIntervalMs);
    const statusResponse = await fetch(endpoint(provider.baseUrl, `/status/${runData.id}`), { headers });
    if (!statusResponse.ok) throw new Error(`تعذر قراءة حالة Try-On (${statusResponse.status})`);
    const statusData = (await statusResponse.json()) as FashnStatusResponse;
    if (statusData.status === 'completed') {
      const externalImageUrl = extractOutputImageUrl(statusData.output);
      if (!externalImageUrl) throw new Error('اكتمل Try-On دون رابط صورة صالح');
      const stored = await storeGeneratedImage(externalImageUrl);
      return {
        status: 'success',
        imageUrl: stored.url,
        providerId: provider.id,
        message: 'تم تلبيس القطعة بالذكاء الاصطناعي بنجاح.',
      };
    }
    if (!['starting', 'in_queue', 'processing'].includes(statusData.status || '')) {
      throw new Error(statusData.error || 'فشل مزود Try-On في معالجة الصورة');
    }
  }

  throw new Error('انتهت مهلة انتظار نتيجة Try-On');
}
