/**
 * أكبر حمولة JSON يقبلها التطبيق.
 * عقود try-on وإزالة الخلفية تقيد data URL إلى 12,000,000 حرف؛ 13 MiB
 * يترك هامشاً كافياً لغلاف JSON من دون السماح بجسم عام حجمه 50 MiB.
 */
export const API_REQUEST_BODY_LIMIT = "13mb";
export const API_REQUEST_BODY_LIMIT_BYTES = 13 * 1024 * 1024;
export const MAX_IMAGE_DATA_URL_CHARS = 12_000_000;
