import { Link } from 'wouter';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, Cpu, HardDrive, LockKeyhole, MonitorSmartphone, RefreshCw, Sparkles, WifiOff, XCircle } from 'lucide-react';
import { assessLocalInferenceCompatibility, formatBytes, type CompatibilityAssessment } from '@/lib/deviceCompatibility';

type BrowserGpu = { requestAdapter: (options?: { powerPreference?: 'high-performance' | 'low-power' }) => Promise<unknown | null> };
type BrowserNavigator = Navigator & {
  gpu?: BrowserGpu;
  deviceMemory?: number;
  storage?: { estimate?: () => Promise<{ quota?: number; usage?: number }> };
};

type CheckResult = {
  assessment: CompatibilityAssessment;
  hasWebAssembly: boolean;
  hasWebGPU: boolean;
  webGpuDetail: string;
  isSecureContext: boolean;
  storageQuota?: number;
  storageUsage?: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
};

function statusIcon(ok: boolean) {
  return ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /> : <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" />;
}

export default function DeviceCompatibilityCheck() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const runCheck = useCallback(async () => {
    setIsChecking(true);
    const browser = navigator as BrowserNavigator;
    const hasWebAssembly = typeof WebAssembly !== 'undefined' && typeof WebAssembly.validate === 'function';
    let hasWebGPU = false;
    let webGpuDetail = 'لم يعلن المتصفح دعماً لـ WebGPU.';

    if (browser.gpu?.requestAdapter) {
      try {
        const adapter = await browser.gpu.requestAdapter({ powerPreference: 'high-performance' });
        hasWebGPU = Boolean(adapter);
        webGpuDetail = adapter ? 'تم العثور على معالج رسومي يمكن للمتصفح استخدامه.' : 'ظهر WebGPU، لكن لم يتمكن المتصفح من فتح معالج رسومي.';
      } catch {
        webGpuDetail = 'ظهر WebGPU، لكن منع المتصفح اختبار المعالج الرسومي حالياً.';
      }
    }

    let storageQuota: number | undefined;
    let storageUsage: number | undefined;
    try {
      const estimate = await browser.storage?.estimate?.();
      storageQuota = estimate?.quota;
      storageUsage = estimate?.usage;
    } catch {
      // معلومات التخزين مساعدة فقط؛ لا تؤثر في قرار التوافق.
    }

    const isSecureContext = window.isSecureContext;
    setResult({
      assessment: assessLocalInferenceCompatibility({ hasWebAssembly, hasWebGPU, isSecureContext }),
      hasWebAssembly,
      hasWebGPU,
      webGpuDetail,
      isSecureContext,
      storageQuota,
      storageUsage,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: browser.deviceMemory,
    });
    setIsChecking(false);
  }, []);

  useEffect(() => { void runCheck(); }, [runCheck]);

  const readinessClass = result?.assessment.readiness === 'ready'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
    : result?.assessment.readiness === 'limited'
      ? 'border-amber-200 bg-amber-50 text-amber-950'
      : 'border-red-200 bg-red-50 text-red-950';

  return (
    <main className="min-h-screen bg-[#fffaf4] px-4 py-6 text-foreground sm:py-10" dir="rtl">
      <section className="mx-auto w-full max-w-xl">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-black text-primary transition hover:bg-white active:scale-95"><ArrowRight className="h-4 w-4" /> العودة إلى التطبيق</Link>

        <header className="mt-5 rounded-[28px] bg-primary px-6 py-7 text-primary-foreground shadow-[0_18px_42px_rgba(42,40,101,0.20)] sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black"><MonitorSmartphone className="h-4 w-4" /> فحص الهاتف المحلي</span>
          <h1 className="mt-4 text-2xl font-black sm:text-3xl">هل يدعم هاتفك إزالة الخلفية دون إنترنت؟</h1>
          <p className="mt-3 text-sm leading-7 text-white/85">هذا الفحص لا يرفع صورة، ولا ينزّل نموذج ذكاء اصطناعي، ولا يستخدم مفتاح API.</p>
        </header>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_14px_38px_rgba(37,35,95,0.08)] sm:p-7" aria-live="polite">
          {isChecking || !result ? <div className="flex min-h-52 flex-col items-center justify-center text-center"><span className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" /><p className="mt-4 text-sm font-black text-primary">جارٍ فحص تقنيات هاتفك…</p></div> : <>
            <div className={`rounded-2xl border p-4 ${readinessClass}`}>
              <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-6 w-6 shrink-0" /><div><h2 className="font-black">{result.assessment.title}</h2><p className="mt-2 text-sm leading-6 opacity-85">{result.assessment.description}</p></div></div>
              <p className="mt-3 border-t border-current/10 pt-3 text-xs font-bold leading-6">{result.assessment.nextStep}</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <CapabilityCard icon={<Cpu className="h-5 w-5" />} title="WebAssembly" ok={result.hasWebAssembly} detail={result.hasWebAssembly ? 'متاح لتشغيل نموذج خفيف داخل المتصفح.' : 'غير متاح؛ لا يمكن تشغيل نموذج محلي في هذا المتصفح.'} />
              <CapabilityCard icon={<Sparkles className="h-5 w-5" />} title="WebGPU" ok={result.hasWebGPU} detail={result.webGpuDetail} />
              <CapabilityCard icon={<LockKeyhole className="h-5 w-5" />} title="اتصال آمن" ok={result.isSecureContext} detail={result.isSecureContext ? 'الصفحة تعمل عبر اتصال آمن مناسب للتخزين المحلي.' : 'الصفحة ليست في سياق آمن؛ افتحها من رابط HTTPS.'} />
              <CapabilityCard icon={<HardDrive className="h-5 w-5" />} title="تخزين النموذج" ok={Boolean(result.storageQuota)} detail={result.storageQuota ? `المتاح للتطبيق تقريباً ${formatBytes(result.storageQuota - (result.storageUsage || 0))}.` : 'لم يشارك المتصفح تقدير مساحة التخزين؛ لا يمنع ذلك التجربة.'} warning={!result.storageQuota} />
            </div>

            <section className="mt-5 rounded-2xl bg-secondary/60 p-4 text-sm leading-7 text-muted-foreground">
              <div className="flex items-center gap-2 font-black text-primary"><WifiOff className="h-4 w-4" /> ماذا تعني النتيجة؟</div>
              <p className="mt-2">حتى عند ظهور النتيجة «جاهز»، يحتاج النموذج إلى تنزيل أول مرة فقط. بعد تخزينه يمكنه العمل محلياً دون إرسال صورة الملابس إلى الإنترنت. هذا الفحص يقيس التوافق فقط، لا الجودة النهائية للنموذج.</p>
              <p className="mt-2 text-xs">معلومات مساعدة: {result.hardwareConcurrency ? `${result.hardwareConcurrency} أنوية منطقية` : 'عدد الأنوية غير متاح'}{result.deviceMemory ? ` · ذاكرة جهاز معلنة ${result.deviceMemory}GB` : ''}.</p>
            </section>

            <button type="button" onClick={() => void runCheck()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground transition active:scale-[0.98]"><RefreshCw className="h-4 w-4" /> إعادة الفحص</button>
          </>}
        </section>

        <p className="mt-5 text-center text-xs font-medium leading-6 text-muted-foreground"><CircleAlert className="mb-0.5 ml-1 inline h-3.5 w-3.5" /> لن تظهر أو تُحفظ الصور أو مفاتيح API في صفحة الاختبار.</p>
      </section>
    </main>
  );
}

function CapabilityCard({ icon, title, ok, detail, warning = false }: { icon: React.ReactNode; title: string; ok: boolean; detail: string; warning?: boolean }) {
  return <article className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-primary"><span className="rounded-xl bg-primary/10 p-2">{icon}</span><span className="text-sm font-black">{title}</span></span>{warning ? <CircleAlert className="h-5 w-5 text-amber-600" /> : statusIcon(ok)}</div><p className="mt-3 text-xs leading-6 text-muted-foreground">{detail}</p></article>;
}
