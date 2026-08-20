import type { MLCEngineInterface } from '@mlc-ai/web-llm';

export const LOCAL_LEADER_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
export const LOCAL_LEADER_MODEL_LABEL = 'Llama 3.2 1B — محلي اختياري';
export const LOCAL_LEADER_VRAM_MB = 879;

export type LocalModelCapability = {
  supported: boolean;
  message: string;
};

type GpuNavigator = Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } };
let engine: MLCEngineInterface | null = null;
let worker: Worker | null = null;

export function getLocalModelCapability(navigatorLike: GpuNavigator | undefined = typeof navigator === 'undefined' ? undefined : navigator as GpuNavigator): LocalModelCapability {
  if (!navigatorLike?.gpu?.requestAdapter) return { supported: false, message: 'هذا المتصفح لا يعلن دعماً لـ WebGPU. سيبقى القائد المحلي بالقواعد الذكية من دون تنزيل نموذج.' };
  return { supported: true, message: 'هذا المتصفح يدعم WebGPU مبدئياً. يمكنك تنزيل نموذج واحد اختياري بعد اتصال بالإنترنت.' };
}

async function webllm() {
  return import('@mlc-ai/web-llm');
}

export async function isLocalLeaderModelCached() {
  const api = await webllm();
  return api.hasModelInCache(LOCAL_LEADER_MODEL_ID);
}

export async function loadLocalLeaderModel(onProgress: (text: string) => void) {
  const capability = getLocalModelCapability();
  if (!capability.supported) throw new Error(capability.message);
  if (engine) return engine;
  const api = await webllm();
  const nextWorker = new Worker(new URL('../workers/localLeaderModel.worker.ts', import.meta.url), { type: 'module' });
  try {
    const nextEngine = await api.CreateWebWorkerMLCEngine(nextWorker, LOCAL_LEADER_MODEL_ID, {
      initProgressCallback: report => onProgress(report.text),
    });
    worker = nextWorker;
    engine = nextEngine;
    return nextEngine;
  } catch (error) {
    nextWorker.terminate();
    throw error;
  }
}

export async function askLocalLeaderModel(request: string) {
  if (!engine) throw new Error('نموذج القائد المحلي غير جاهز بعد. نزّله أولاً أو استخدم القائد المحلي الأساسي.');
  const response = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: 'أنت مساعد عربي محلي لمشروع تعليمي لتجهيز صور الملابس وقوالب التصميم. أجب بلطف وباختصار. لا تدعِ القدرة على رؤية صور غير مرفقة، ولا تطلب مفاتيح أو معلومات خاصة، ولا تطبق تغييرات؛ اشرح الاقتراح ثم ذكّر أن التطبيق يطلب التأكيد قبل التعديل.' },
      { role: 'user', content: request.slice(0, 800) },
    ],
    temperature: 0.35,
    max_tokens: 260,
  });
  const content = response.choices[0]?.message?.content;
  return typeof content === 'string' && content.trim() ? content.trim().slice(0, 900) : 'لم ينتج النموذج المحلي رداً صالحاً. يمكنك متابعة استخدام القائد المحلي الأساسي.';
}

export async function removeLocalLeaderModel() {
  const activeEngine = engine;
  engine = null;
  worker?.terminate();
  worker = null;
  await activeEngine?.unload?.();
  const api = await webllm();
  await api.deleteModelAllInfoInCache(LOCAL_LEADER_MODEL_ID);
}
