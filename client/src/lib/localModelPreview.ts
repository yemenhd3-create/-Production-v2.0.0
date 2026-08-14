import type { ModelPreviewTransform } from '@shared/types';

const POSE_MODEL_URL = '/manus-storage/pose_landmarker_lite_b3cef1dc.task';
const POSE_WASM_LOADER_URL = '/manus-storage/vision_wasm_internal_4aaed55b.js';
const POSE_WASM_BINARY_URL = '/manus-storage/vision_wasm_internal_b810509d.wasm';
const POSE_MODEL_SIZE_BYTES = 5_777_746;
const POSE_CACHE_NAME = 'clothing-ad-pose-landmarker-lite-v1';
const POSE_IDB_NAME = 'clothing-ad-local-models-v1';
const POSE_IDB_STORE = 'models';
const POSE_IDB_KEY = 'pose-landmarker-lite-task';

export const DEFAULT_MODEL_PREVIEW_TRANSFORM: ModelPreviewTransform = {
  x: 0.5,
  y: 0.46,
  scale: 0.58,
  rotation: 0,
};

export type LocalPoseStage = 'downloading' | 'loading' | 'detecting';
export type LocalPoseDetection = {
  found: boolean;
  transform?: ModelPreviewTransform;
  message: string;
};

type PosePoint = { x: number; y: number; visibility?: number };

let poseLandmarkerPromise: Promise<import('@mediapipe/tasks-vision').PoseLandmarker> | null = null;

/**
 * يكشف وضعية العارض داخل المتصفح فقط. الناتج اقتراح أولي لمكان القطعة؛ يبقى
 * التحريك والتحجيم اليدويان هما المرجع النهائي ولا يدّعيان تلبيساً واقعياً.
 */
export async function detectPersonPoseLocally(sourceUrl: string, onStage?: (stage: LocalPoseStage) => void): Promise<LocalPoseDetection> {
  if (typeof WebAssembly === 'undefined') throw new Error('WebAssembly is unavailable');
  const landmarker = await getPoseLandmarker(onStage);
  onStage?.('detecting');
  const image = await loadImage(sourceUrl);
  const result = landmarker.detect(image);
  const landmarks = result.landmarks[0];
  if (!landmarks?.length) return { found: false, message: 'لم نعثر على وضعية واضحة. ضع القطعة يدوياً فوق العارض.' };
  const transform = suggestModelPreviewTransform(landmarks as PosePoint[]);
  if (!transform) return { found: false, message: 'تعذر تحديد الكتفين والجذع بدقة. استخدم التحكم اليدوي.' };
  return { found: true, transform, message: 'اقترحنا موضع القطعة وفق وضعية الكتفين والجذع. يمكنك تعديله بحرية.' };
}

/** يحوّل صورة العارض والقطعة المفرغة إلى معاينة PNG محلية قابلة لإدخالها في قالب الإعلان. */
export async function composeLocalModelPreview(personImageUrl: string, garmentImageUrl: string, transform: ModelPreviewTransform): Promise<string> {
  const [person, garment] = await Promise.all([loadImage(personImageUrl), loadImage(garmentImageUrl)]);
  const naturalWidth = person.naturalWidth || person.width;
  const naturalHeight = person.naturalHeight || person.height;
  const maxDimension = 1440;
  const ratio = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * ratio));
  const height = Math.max(1, Math.round(naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(person, 0, 0, width, height);

  const garmentRatio = (garment.naturalWidth || garment.width) / Math.max(1, garment.naturalHeight || garment.height);
  const drawWidth = clamp(transform.scale, 0.2, 1.15) * width;
  const drawHeight = drawWidth / Math.max(0.1, garmentRatio);
  const centerX = clamp(transform.x, 0.05, 0.95) * width;
  const centerY = clamp(transform.y, 0.05, 0.95) * height;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(clamp(transform.rotation, -30, 30) * Math.PI / 180);
  ctx.drawImage(garment, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
  const blob = await canvasToBlob(canvas);
  return URL.createObjectURL(blob);
}

/** يحسب تحويل القطعة من مواضع الكتفين والوركين فقط، ويعيد null إن كانت النقاط غير موثوقة. */
export function suggestModelPreviewTransform(landmarks: PosePoint[]): ModelPreviewTransform | null {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  if (![leftShoulder, rightShoulder, leftHip, rightHip].every(point => point && (point.visibility ?? 1) >= 0.35)) return null;
  const shoulderX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipY = (leftHip.y + rightHip.y) / 2;
  const shoulderSpan = Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y);
  const torsoHeight = hipY - shoulderY;
  if (shoulderSpan < 0.07 || torsoHeight < 0.08) return null;
  const rotation = Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x) * 180 / Math.PI;
  return {
    x: clamp(shoulderX, 0.1, 0.9),
    y: clamp(shoulderY + torsoHeight * 0.47, 0.12, 0.88),
    scale: clamp(Math.max(shoulderSpan * 1.85, torsoHeight * 0.98), 0.32, 0.85),
    rotation: clamp(rotation, -18, 18),
  };
}

export function formatPoseModelSize(): string {
  return `${(POSE_MODEL_SIZE_BYTES / (1024 * 1024)).toFixed(1)}MB`;
}

async function getPoseLandmarker(onStage?: (stage: LocalPoseStage) => void) {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const modelBytes = await getCachedPoseModel(() => onStage?.('downloading'));
      await cachePoseRuntimeAssets();
      onStage?.('loading');
      return vision.PoseLandmarker.createFromOptions(
        { wasmLoaderPath: POSE_WASM_LOADER_URL, wasmBinaryPath: POSE_WASM_BINARY_URL },
        {
          baseOptions: { modelAssetBuffer: new Uint8Array(modelBytes) },
          runningMode: 'IMAGE',
          numPoses: 1,
          minPoseDetectionConfidence: 0.45,
          minPosePresenceConfidence: 0.45,
        }
      );
    })().catch(error => {
      poseLandmarkerPromise = null;
      throw error;
    });
  }
  return poseLandmarkerPromise;
}

export async function getCachedPoseModel(onCacheMiss?: () => void): Promise<ArrayBuffer> {
  const cache = 'caches' in window ? await caches.open(POSE_CACHE_NAME) : null;
  const cached = await cache?.match(POSE_MODEL_URL);
  if (cached) {
    const bytes = await cached.arrayBuffer();
    if (bytes.byteLength) {
      void savePoseModelToIndexedDb(bytes.slice(0));
      return bytes;
    }
  }
  const persisted = await loadPoseModelFromIndexedDb();
  if (persisted?.byteLength) {
    if (cache) void cache.put(POSE_MODEL_URL, new Response(persisted.slice(0), { headers: { 'content-type': 'application/octet-stream' } }));
    return persisted;
  }
  onCacheMiss?.();
  const response = await fetch(POSE_MODEL_URL, { cache: 'force-cache' });
  if (!response.ok) throw new Error('POSE_MODEL_DOWNLOAD');
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength) throw new Error('POSE_MODEL_DOWNLOAD');
  if (cache) await cache.put(POSE_MODEL_URL, new Response(bytes.slice(0), { headers: { 'content-type': 'application/octet-stream' } }));
  await savePoseModelToIndexedDb(bytes.slice(0));
  void requestPersistentStorage();
  return bytes;
}

export async function cachePoseRuntimeAssets(): Promise<void> {
  try {
    if (!('caches' in window)) return;
    const cache = await caches.open(POSE_CACHE_NAME);
    await Promise.all([POSE_WASM_LOADER_URL, POSE_WASM_BINARY_URL].map(async url => {
      if (await cache.match(url)) return;
      const response = await fetch(url, { cache: 'force-cache' });
      if (response.ok) await cache.put(url, response.clone());
    }));
  } catch {
    // يبقى المتصفح قادراً على استخدام ذاكرته المضمنة إن تعذر تخزين مورد ثانوي.
  }
}

function openPoseDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const request = indexedDB.open(POSE_IDB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(POSE_IDB_STORE)) request.result.createObjectStore(POSE_IDB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function loadPoseModelFromIndexedDb(): Promise<ArrayBuffer | null> {
  const database = await openPoseDatabase();
  if (!database) return null;
  return new Promise(resolve => {
    try {
      const request = database.transaction(POSE_IDB_STORE, 'readonly').objectStore(POSE_IDB_STORE).get(POSE_IDB_KEY);
      request.onsuccess = () => {
        database.close();
        const value = request.result as { byteLength?: unknown; slice?: unknown } | undefined;
        resolve(value && typeof value.byteLength === 'number' && typeof value.slice === 'function' ? value as unknown as ArrayBuffer : null);
      };
      request.onerror = () => { database.close(); resolve(null); };
    } catch { database.close(); resolve(null); }
  });
}

async function savePoseModelToIndexedDb(model: ArrayBuffer): Promise<void> {
  const database = await openPoseDatabase();
  if (!database) return;
  await new Promise<void>(resolve => {
    try {
      const transaction = database.transaction(POSE_IDB_STORE, 'readwrite');
      transaction.objectStore(POSE_IDB_STORE).put(model, POSE_IDB_KEY);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); resolve(); };
      transaction.onabort = () => { database.close(); resolve(); };
    } catch { database.close(); resolve(); }
  });
}

async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted?.())) await navigator.storage.persist();
  } catch { /* يبقى التخزين العادي مستخدماً إن رفضه المتصفح. */ }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('تعذر قراءة الصورة محلياً'));
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('تعذر إنشاء معاينة العارض')), 'image/png'));
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
