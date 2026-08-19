import { and, eq, inArray } from 'drizzle-orm';
import { developerProviders } from '../drizzle/schema';
import { PERFECT_CORP_BACKGROUND_REMOVE } from '../shared/providerPresets';
import type { TryOnPose, TryOnPresentation } from '../shared/types';
import { getDb } from './db';
import { decryptProviderKey } from './developerProviders';
import { removeBackgroundWithPerfectCorp } from './perfectCorp';
import { storagePut } from './storage';

const FASHN_PRODUCT_TO_MODEL = 'product-to-model';
const FASHN_BACKGROUND_REMOVE = 'background-remove';
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 20;

export type TryOnAspectRatio = '4:5' | '9:16';
export type TryOnSelection = { presentation: TryOnPresentation; pose: TryOnPose };
export type CloudTryOnResult = {
  status: 'success';
  imageUrl: string;
  providerId: string;
  message: string;
  isTransparent: boolean;
  transparentSubject?: 'person' | 'garment';
};

type TryOnRuntimeOptions = {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
};

type ProviderRecord = typeof developerProviders.$inferSelect;
type FashnStatusResponse = { status?: string; output?: unknown; error?: string };

const PROMPT_BY_PRESENTATION: Record<TryOnPresentation, string> = {
  'women-fashion': 'adult fashion model wearing the garment, modest professional fashion studio styling',
  'men-fashion': 'adult fashion model wearing the garment, professional fashion studio styling',
  'kids-fashion': 'child fashion mannequin-style catalog presentation wearing the garment, family-friendly studio styling',
  accessories: 'adult fashion model presenting the accessory, clean professional studio styling',
};

const PROMPT_BY_POSE: Record<TryOnPose, string> = {
  'studio-standing': 'front-facing full-body standing pose, white studio background',
  'lifestyle-standing': 'natural standing pose, minimal neutral lifestyle background',
};

/** لا يقبل مزود الصور Prompt حراً من الواجهة؛ الاختيارات المحددة فقط تتحول إلى وصف ثابت. */
export function buildSafeTryOnPrompt(selection?: TryOnSelection) {
  if (!selection) return undefined;
  return `${PROMPT_BY_PRESENTATION[selection.presentation]}, ${PROMPT_BY_POSE[selection.pose]}`;
}

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

async function runProviderTask(
  provider: ProviderRecord,
  modelName: string,
  inputs: Record<string, unknown>,
  options: TryOnRuntimeOptions
) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${decryptProviderKey(provider.encryptedApiKey)}`,
  };
  const runResponse = await fetch(endpoint(provider.baseUrl, '/run'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ model_name: modelName, inputs }),
  });
  if (!runResponse.ok) throw new Error(`رفض مزود ${modelName} الطلب (${runResponse.status})`);
  const runData = (await runResponse.json()) as { id?: string; error?: string };
  if (!runData.id) throw new Error(runData.error || `لم يعطِ مزود ${modelName} معرفاً للمهمة`);

  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
  const maxPollAttempts = options.maxPollAttempts ?? MAX_POLL_ATTEMPTS;
  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    await wait(pollIntervalMs);
    const statusResponse = await fetch(endpoint(provider.baseUrl, `/status/${runData.id}`), { headers });
    if (!statusResponse.ok) throw new Error(`تعذر قراءة حالة ${modelName} (${statusResponse.status})`);
    const statusData = (await statusResponse.json()) as FashnStatusResponse;
    if (statusData.status === 'completed') {
      const externalImageUrl = extractOutputImageUrl(statusData.output);
      if (!externalImageUrl) throw new Error(`اكتمل ${modelName} دون رابط صورة صالح`);
      return { externalImageUrl, stored: await storeGeneratedImage(externalImageUrl) };
    }
    if (!['starting', 'in_queue', 'processing'].includes(statusData.status || '')) {
      throw new Error(statusData.error || `فشل مزود ${modelName} في معالجة الصورة`);
    }
  }
  throw new Error(`انتهت مهلة انتظار نتيجة ${modelName}`);
}

async function runBackgroundRemovalProvider(
  provider: ProviderRecord,
  imageData: string,
  options: TryOnRuntimeOptions
) {
  if (provider.model === PERFECT_CORP_BACKGROUND_REMOVE) {
    const externalImageUrl = await removeBackgroundWithPerfectCorp(imageData, decryptProviderKey(provider.encryptedApiKey), options);
    return { externalImageUrl, stored: await storeGeneratedImage(externalImageUrl) };
  }
  return runProviderTask(provider, FASHN_BACKGROUND_REMOVE, { image: imageData, return_base64: false }, options);
}

async function getBackgroundRemovalProvider() {
  const db = await getDb();
  if (!db) throw new Error('قاعدة البيانات غير متاحة حالياً');
  const providers = await db.select().from(developerProviders)
    .where(and(
      eq(developerProviders.isEnabled, 1),
      inArray(developerProviders.model, [PERFECT_CORP_BACKGROUND_REMOVE, FASHN_BACKGROUND_REMOVE])
    )).limit(2);
  return providers.find(provider => provider.model === PERFECT_CORP_BACKGROUND_REMOVE)
    ?? providers.find(provider => provider.model === FASHN_BACKGROUND_REMOVE);
}

/**
 * يشغّل Product-to-Model. إذا أضاف المطور مزوداً آخر باسم `background-remove`،
 * يمرر النتيجة إليه ويحفظ PNG الشفاف قبل عرضه داخل قالب الإعلان.
 */
export async function runProductToModelTryOn(
  productImageData: string,
  aspectRatio: TryOnAspectRatio,
  options: TryOnRuntimeOptions = {},
  selection?: TryOnSelection,
): Promise<CloudTryOnResult> {
  const db = await getDb();
  if (!db) throw new Error('قاعدة البيانات غير متاحة حالياً');
  const provider = (await db.select().from(developerProviders)
    .where(and(eq(developerProviders.isEnabled, 1), eq(developerProviders.model, FASHN_PRODUCT_TO_MODEL)))
    .limit(1))[0];
  if (!provider) throw new Error('لا يوجد مزود Product to Model مفعّل في لوحة المطور');

  const productResult = await runProviderTask(provider, FASHN_PRODUCT_TO_MODEL, {
    product_image: productImageData,
    aspect_ratio: aspectRatio,
    resolution: '1k',
    generation_mode: 'fast',
    num_images: 1,
    output_format: 'png',
    ...(buildSafeTryOnPrompt(selection) ? { prompt: buildSafeTryOnPrompt(selection) } : {}),
  }, options);

  const backgroundProvider = await getBackgroundRemovalProvider();
  if (!backgroundProvider) {
    return {
      status: 'success',
      imageUrl: productResult.stored.url,
      providerId: provider.id,
      message: 'تم تلبيس القطعة بالذكاء الاصطناعي بنجاح. أضف مزود background-remove من لوحة المطور للحصول على PNG بخلفية شفافة.',
      isTransparent: false,
    };
  }

  try {
    const transparentResult = await runBackgroundRemovalProvider(backgroundProvider, productResult.externalImageUrl, options);
    return {
      status: 'success',
      imageUrl: transparentResult.stored.url,
      providerId: provider.id,
      message: 'تم تلبيس القطعة وتفريغ الخلفية بنجاح. استُخدمت نتيجة PNG شفافة داخل القالب.',
      isTransparent: true,
      transparentSubject: 'person',
    };
  } catch (error) {
    console.warn('[Try-On] Background removal failed; keeping the on-model result.', error);
    return {
      status: 'success',
      imageUrl: productResult.stored.url,
      providerId: provider.id,
      message: 'تم تلبيس القطعة بالذكاء الاصطناعي، لكن تعذر تفريغ الخلفية؛ استخدمنا صورة الشخص الناتجة كما هي.',
      isTransparent: false,
    };
  }
}

/** يزيل خلفية صورة الملابس الخام عندما يضيف المطور مزود background-remove في اللوحة. */
export async function removeBackgroundFromProduct(
  productImageData: string,
  options: TryOnRuntimeOptions = {}
): Promise<CloudTryOnResult> {
  const provider = await getBackgroundRemovalProvider();
  if (!provider) throw new Error('لا يوجد مزود إزالة خلفية مفعّل في لوحة المطور');

  const result = await runBackgroundRemovalProvider(provider, productImageData, options);
  return {
    status: 'success',
    imageUrl: result.stored.url,
    providerId: provider.id,
    message: 'تمت إزالة خلفية صورة الملابس وحفظ PNG شفاف داخل القالب الأبيض.',
    isTransparent: true,
    transparentSubject: 'garment',
  };
}
