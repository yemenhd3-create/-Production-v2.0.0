import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { developerProviders } from '../drizzle/schema';
import { PERFECT_CORP_API_BASE_URL, PERFECT_CORP_BACKGROUND_REMOVE } from '../shared/providerPresets';
import { parseConnectedLeaderPreset, type ConnectedLeaderAdapter } from '../shared/connectedLeaderPresets';
import type { DeveloperProviderSummary } from '../shared/types';
import { getDb } from './db';

type ProviderInput = {
  id?: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  enabled: boolean;
};

export type ProviderConnectionResult = {
  reachable: boolean;
  status?: number;
  message: string;
};

export type EnabledConnectedLeaderProvider = {
  adapter: ConnectedLeaderAdapter;
  baseUrl: string;
  model: string;
  apiKey: string;
};

function encryptionKey() {
  const secret = process.env.JWT_SECRET ?? '';
  if (!secret) throw new Error('JWT_SECRET is required for provider encryption');
  return createHash('sha256').update(secret).digest();
}

export function encryptProviderKey(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const payload = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${payload.toString('base64url')}`;
}

export function decryptProviderKey(value: string) {
  const [ivRaw, tagRaw, payloadRaw] = value.split('.');
  if (!ivRaw || !tagRaw || !payloadRaw) throw new Error('Invalid encrypted provider key');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(payloadRaw, 'base64url')), decipher.final()]).toString('utf8');
}

export function toProviderSummary(provider: typeof developerProviders.$inferSelect): DeveloperProviderSummary {
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    model: provider.model,
    enabled: provider.isEnabled === 1,
    hasApiKey: Boolean(provider.encryptedApiKey),
    updatedAt: provider.updatedAt.getTime(),
  };
}

export async function listDeveloperProviders(): Promise<DeveloperProviderSummary[]> {
  const db = await getDb();
  if (!db) throw new Error('قاعدة البيانات غير متاحة حالياً');
  const providers = await db.select().from(developerProviders).orderBy(desc(developerProviders.updatedAt));
  return providers.map(toProviderSummary);
}

export async function saveDeveloperProvider(input: ProviderInput): Promise<DeveloperProviderSummary> {
  const db = await getDb();
  if (!db) throw new Error('قاعدة البيانات غير متاحة حالياً');

  const id = input.id ?? crypto.randomUUID();
  const existing = input.id
    ? (await db.select().from(developerProviders).where(eq(developerProviders.id, input.id)).limit(1))[0]
    : undefined;
  const encryptedApiKey = input.apiKey?.trim() ? encryptProviderKey(input.apiKey.trim()) : existing?.encryptedApiKey;
  if (!encryptedApiKey) throw new Error('أدخل مفتاح API للمزود الجديد');

  const isPerfectCorpBackgroundRemoval = input.model.trim() === PERFECT_CORP_BACKGROUND_REMOVE;
  const values = {
    id,
    name: input.name.trim(),
    baseUrl: isPerfectCorpBackgroundRemoval ? PERFECT_CORP_API_BASE_URL : input.baseUrl.trim(),
    model: input.model.trim(),
    encryptedApiKey,
    isEnabled: input.enabled ? 1 : 0,
  };
  await db.insert(developerProviders).values(values).onDuplicateKeyUpdate({ set: {
    name: values.name,
    baseUrl: values.baseUrl,
    model: values.model,
    encryptedApiKey: values.encryptedApiKey,
    isEnabled: values.isEnabled,
  } });

  const saved = (await db.select().from(developerProviders).where(eq(developerProviders.id, id)).limit(1))[0];
  if (!saved) throw new Error('تعذر حفظ مزود الذكاء الاصطناعي');
  return toProviderSummary(saved);
}

export async function deleteDeveloperProvider(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('قاعدة البيانات غير متاحة حالياً');
  await db.delete(developerProviders).where(eq(developerProviders.id, id));
}

/** يعيد بدائل القائد المثبتة مسبقاً فقط؛ لا يقبل روابط أو عمليات حرة عند وقت التنفيذ. */
export async function listEnabledConnectedLeaderProviders(): Promise<EnabledConnectedLeaderProvider[]> {
  const db = await getDb();
  if (!db) return [];
  const providers = await db.select().from(developerProviders).where(eq(developerProviders.isEnabled, 1));
  return providers.flatMap(provider => {
    const preset = parseConnectedLeaderPreset(provider.model);
    if (!preset || provider.baseUrl !== preset.baseUrl || !provider.encryptedApiKey) return [];
    try {
      return [{ adapter: preset.id, baseUrl: preset.baseUrl, model: preset.model.split(':').at(-1) ?? '', apiKey: decryptProviderKey(provider.encryptedApiKey) }];
    } catch {
      return [];
    }
  });
}

function assertSafeProviderUrl(value: string) {
  const url = new URL(value);
  const blockedHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/i.test(url.hostname)
    || /^10\./.test(url.hostname)
    || /^192\.168\./.test(url.hostname)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname);
  if (url.protocol !== 'https:' || blockedHost) {
    throw new Error('اختبار الاتصال يقبل روابط HTTPS العامة فقط');
  }
  return url;
}

export function resolveProviderCheckUrl(provider: Pick<typeof developerProviders.$inferSelect, 'baseUrl' | 'model'>) {
  const connectedLeaderPreset = parseConnectedLeaderPreset(provider.model);
  if (connectedLeaderPreset && provider.baseUrl === connectedLeaderPreset.baseUrl) {
    return new URL('models', `${connectedLeaderPreset.baseUrl}/`);
  }
  return assertSafeProviderUrl(provider.baseUrl);
}

/** Performs a lightweight reachability check without returning a key or provider response body. */
export async function checkDeveloperProvider(id: string): Promise<ProviderConnectionResult> {
  const db = await getDb();
  if (!db) throw new Error('قاعدة البيانات غير متاحة حالياً');
  const provider = (await db.select().from(developerProviders).where(eq(developerProviders.id, id)).limit(1))[0];
  if (!provider) throw new Error('المزود غير موجود');

  const isPerfectCorpBackgroundRemoval = provider.model === PERFECT_CORP_BACKGROUND_REMOVE;
  const connectedLeaderPreset = parseConnectedLeaderPreset(provider.model);
  const url = isPerfectCorpBackgroundRemoval
    ? new URL('/s2s/v2.0/file', PERFECT_CORP_API_BASE_URL)
    : resolveProviderCheckUrl(provider);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, isPerfectCorpBackgroundRemoval ? {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${decryptProviderKey(provider.encryptedApiKey)}` },
      body: JSON.stringify({ files: [{ content_type: 'image/png', file_name: 'connection-check.png', file_size: 1 }] }),
      signal: controller.signal,
    } : {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${decryptProviderKey(provider.encryptedApiKey)}` },
      signal: controller.signal,
    });
    return {
      reachable: response.ok,
      status: response.status,
      message: response.ok
        ? connectedLeaderPreset?.id === 'llm7'
          ? 'وصل كتالوج LLM7. تُؤكَّد صلاحية المفتاح عند أول رد نصي فقط لأن الكتالوج متاح علناً.'
          : 'تم التحقق من اتصال المزود والمفتاح.'
        : response.status === 401 ? 'تعذر التحقق من المفتاح؛ راجعه في حساب المزود.' : 'استجاب المزود بخطأ عند اختبار الاتصال.',
    };
  } catch {
    return { reachable: false, message: 'تعذر الوصول إلى المزود خلال مهلة الاختبار.' };
  } finally {
    clearTimeout(timeout);
  }
}
