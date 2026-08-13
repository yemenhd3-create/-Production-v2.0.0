export type LocalInferenceReadiness = 'ready' | 'limited' | 'not-ready';

export interface CompatibilitySignals {
  hasWebAssembly: boolean;
  hasWebGPU: boolean;
  isSecureContext: boolean;
}

export interface CompatibilityAssessment {
  readiness: LocalInferenceReadiness;
  title: string;
  description: string;
  nextStep: string;
}

/** يحول قدرات المتصفح إلى رسالة عملية؛ لا ينزّل نموذجاً ولا يعالج صوراً. */
export function assessLocalInferenceCompatibility(signals: CompatibilitySignals): CompatibilityAssessment {
  if (!signals.hasWebAssembly || !signals.isSecureContext) {
    return {
      readiness: 'not-ready',
      title: 'الإزالة المحلية غير جاهزة على هذا المتصفح',
      description: 'يتطلب تشغيل نموذج داخل الهاتف WebAssembly واتصالاً آمناً بالموقع. ما زال بإمكانك استخدام إزالة الخلفية السحابية أو الصورة الأصلية.',
      nextStep: 'افتح التطبيق من رابط HTTPS المحدّث في Chrome Android ثم أعد الفحص.',
    };
  }

  if (!signals.hasWebGPU) {
    return {
      readiness: 'limited',
      title: 'هاتفك يدعم الوضع المحلي الأساسي',
      description: 'WebAssembly متاح، لكن لم يظهر WebGPU. يمكن تجربة نموذج محلي لاحقاً، إلا أن السرعة قد تكون أبطأ من التطبيقات الأصلية.',
      nextStep: 'يمكننا اختبار نموذج خفيف لاحقاً، مع بقاء Perfect Corp كخيار أسرع عند توفر الإنترنت.',
    };
  }

  return {
    readiness: 'ready',
    title: 'هاتفك مناسب لتجربة الإزالة المحلية',
    description: 'ظهر WebAssembly وWebGPU على اتصال آمن؛ وهذا أفضل أساس لتجربة نموذج إزالة خلفية يعمل داخل المتصفح بعد تنزيله مرة واحدة.',
    nextStep: 'الخطوة التالية هي اختبار نموذج واضح الترخيص بحجم معلن ومن دون إدخاله في تحميل التطبيق الأولي.',
  };
}

export function formatBytes(value?: number) {
  if (!value || value <= 0) return 'غير متاح';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
