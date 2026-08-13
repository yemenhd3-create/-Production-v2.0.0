export const LOCAL_BACKGROUND_MODEL_SIZE_BYTES = 4_574_861;
export const LOCAL_RUNTIME_ENGINE_SIZE_BYTES = 13_479_978;

export function withLocalRemovalTimeout<T>(promise: Promise<T>, milliseconds: number, errorCode: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(errorCode)), milliseconds);
    promise.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

export function getLocalRemovalUnavailableMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : '';
  if (detail.includes('WebAssembly')) return 'هذا المتصفح لا يدعم WebAssembly اللازم للإزالة المحلية.';
  if (detail.includes('MODEL_DOWNLOAD_TIMEOUT')) return 'استغرق تنزيل نموذج الإزالة المحلية وقتاً طويلاً. تحقق من الإنترنت ثم أعد المحاولة، أو ألغِ الخيار لاستخدام المسار السحابي.';
  if (detail.includes('MODEL_DOWNLOAD')) return 'تعذّر تنزيل نموذج الإزالة المحلية. تحقق من الإنترنت في المرة الأولى ثم أعد المحاولة.';
  if (detail.includes('SESSION_INIT_TIMEOUT')) return 'تعذر تجهيز محرك الإزالة المحلية في الوقت المتوقع. جرّب تحديث Chrome أو استخدم Perfect Corp كبديل.';
  if (detail.includes('INFERENCE_TIMEOUT')) return 'استغرق تحليل الملابس محلياً وقتاً طويلاً. جرّب صورة أصغر أو استخدم المسار السحابي.';
  if (detail.includes('SOURCE_IMAGE_TIMEOUT')) return 'تعذّر تجهيز صورة الملابس محلياً في الوقت المتوقع. جرّب التقاط صورة جديدة أو صورة أصغر.';
  return 'تعذّرت إزالة الخلفية محلياً. سنحاول البديل المتاح أو نستخدم صورة الملابس الأصلية.';
}

export function formatLocalModelSize() {
  return `${(LOCAL_BACKGROUND_MODEL_SIZE_BYTES / 1024 / 1024).toFixed(1)}MB`;
}

export function formatLocalFirstDownloadSize() {
  return `${((LOCAL_BACKGROUND_MODEL_SIZE_BYTES + LOCAL_RUNTIME_ENGINE_SIZE_BYTES) / 1024 / 1024).toFixed(1)}MB`;
}

/** يقلب قناع U2NetP العائم إلى قناة alpha، مع حماية القناع المسطّح من القسمة على صفر. */
export function normalizeU2NetMask(mask: ArrayLike<number>) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < mask.length; index += 1) {
    min = Math.min(min, mask[index]);
    max = Math.max(max, mask[index]);
  }
  const range = max - min;
  return Uint8ClampedArray.from(mask, value => range <= 1e-8 ? 0 : Math.round(((value - min) / range) * 255));
}
