import { PERFECT_CORP_API_BASE_URL } from '../shared/providerPresets';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 30;

export type PerfectCorpRuntimeOptions = {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
};

type PerfectCorpFileRequest = {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
};

type PerfectCorpFileResponse = {
  data?: {
    files?: Array<{
      file_id?: string;
      requests?: PerfectCorpFileRequest[];
    }>;
  };
  error_code?: string;
};

type PerfectCorpTaskResponse = {
  data?: { task_id?: string };
  error_code?: string;
};

type PerfectCorpTaskStatusResponse = {
  data?: {
    task_status?: 'running' | 'success' | 'error';
    error?: string | null;
    error_message?: string;
    results?: { url?: string };
  };
  error_code?: string;
};

function endpoint(path: string) {
  return new URL(path.replace(/^\//, ''), `${PERFECT_CORP_API_BASE_URL}/`).toString();
}

function apiHeaders(apiKey: string) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

function errorMessage(action: string, response: Response, errorCode?: string) {
  const suffix = errorCode ? ` (${errorCode})` : '';
  return `تعذر ${action} من Perfect Corp (${response.status})${suffix}`;
}

function assertHttpsUrl(value: string, message: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error(message);
  return url.toString();
}

function imageFileFromDataUrl(imageData: string) {
  const match = /^data:(image\/(?:png|jpe?g));base64,([A-Za-z0-9+/]+={0,2})$/.exec(imageData);
  if (!match) throw new Error('تقبل Perfect Corp صور JPG أو PNG بصيغة صورة صحيحة فقط');

  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.byteLength || bytes.byteLength >= MAX_FILE_SIZE_BYTES) {
    throw new Error('صورة Perfect Corp يجب أن تكون أصغر من 10MB');
  }

  const mimeType = match[1] === 'image/jpeg' ? 'image/jpg' : match[1];
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  return { bytes, mimeType, fileName: `garment-${Date.now()}.${extension}` };
}

async function wait(milliseconds: number) {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

/** يطلب رابط رفع موقّعاً ثم يرفع بايتات الصورة، ولا يرسل مفتاح API إلى الواجهة. */
export async function uploadFileToPerfectCorp(imageData: string, apiKey: string): Promise<string> {
  const image = imageFileFromDataUrl(imageData);
  const createResponse = await fetch(endpoint('/s2s/v2.0/file'), {
    method: 'POST',
    headers: { ...apiHeaders(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: [{ content_type: image.mimeType, file_name: image.fileName, file_size: image.bytes.byteLength }],
    }),
  });
  const createData = (await createResponse.json().catch(() => ({}))) as PerfectCorpFileResponse;
  if (!createResponse.ok) throw new Error(errorMessage('طلب رابط رفع الصورة', createResponse, createData.error_code));

  const file = createData.data?.files?.[0];
  const uploadRequest = file?.requests?.[0];
  if (!file?.file_id || !uploadRequest?.url) throw new Error('لم تُرجع Perfect Corp معرّف الملف أو رابط الرفع');

  const uploadUrl = assertHttpsUrl(uploadRequest.url, 'رابط رفع Perfect Corp يجب أن يكون HTTPS');
  const uploadResponse = await fetch(uploadUrl, {
    method: uploadRequest.method || 'PUT',
    headers: uploadRequest.headers,
    body: image.bytes,
  });
  if (!uploadResponse.ok) throw new Error(`تعذر رفع الصورة إلى Perfect Corp (${uploadResponse.status})`);
  return file.file_id;
}

/** يبدأ مهمة SOD لإزالة الخلفية ويرجع معرّفها للاستطلاع. */
export async function runPerfectCorpBackgroundRemovalTask(
  source: { src_file_id: string } | { src_file_url: string },
  apiKey: string
): Promise<string> {
  const response = await fetch(endpoint('/s2s/v2.0/task/sod'), {
    method: 'POST',
    headers: { ...apiHeaders(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify(source),
  });
  const data = (await response.json().catch(() => ({}))) as PerfectCorpTaskResponse;
  if (!response.ok) throw new Error(errorMessage('بدء مهمة إزالة الخلفية', response, data.error_code));
  if (!data.data?.task_id) throw new Error('لم تُرجع Perfect Corp معرّف مهمة إزالة الخلفية');
  return data.data.task_id;
}

/** يستطلع المهمة ضمن المهلة ويعيد رابط PNG المفرغ المؤقت عند النجاح. */
export async function pollPerfectCorpTaskStatus(
  taskId: string,
  apiKey: string,
  options: PerfectCorpRuntimeOptions = {}
): Promise<string> {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxPollAttempts = options.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;

  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    await wait(pollIntervalMs);
    const response = await fetch(endpoint(`/s2s/v2.0/task/sod/${encodeURIComponent(taskId)}`), { headers: apiHeaders(apiKey) });
    const data = (await response.json().catch(() => ({}))) as PerfectCorpTaskStatusResponse;
    if (!response.ok) throw new Error(errorMessage('قراءة حالة إزالة الخلفية', response, data.error_code));

    if (data.data?.task_status === 'success') {
      const resultUrl = data.data.results?.url;
      if (!resultUrl) throw new Error('اكتملت إزالة الخلفية من Perfect Corp دون رابط للصورة الناتجة');
      return assertHttpsUrl(resultUrl, 'رابط نتيجة Perfect Corp يجب أن يكون HTTPS');
    }
    if (data.data?.task_status === 'error') {
      throw new Error(data.data.error_message || data.data.error || 'فشلت Perfect Corp في إزالة الخلفية');
    }
  }

  throw new Error('انتهت مهلة انتظار Perfect Corp لإزالة الخلفية');
}

export async function removeBackgroundWithPerfectCorp(
  imageSource: string,
  apiKey: string,
  options: PerfectCorpRuntimeOptions = {}
): Promise<string> {
  const source = imageSource.startsWith('data:image/')
    ? { src_file_id: await uploadFileToPerfectCorp(imageSource, apiKey) }
    : { src_file_url: assertHttpsUrl(imageSource, 'رابط صورة Perfect Corp يجب أن يكون HTTPS عاماً') };
  const taskId = await runPerfectCorpBackgroundRemovalTask(source, apiKey);
  return pollPerfectCorpTaskStatus(taskId, apiKey, options);
}
