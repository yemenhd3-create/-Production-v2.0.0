import * as React from 'react';
import { useEffect, useState } from 'react';
import type { AdDetails, AdWorkflowStep, TemplateSettings, TryOnResult } from '@shared/types';
import {
  DEFAULT_AD_DETAILS,
  DEFAULT_TEMPLATE_SETTINGS,
  StorageKeys,
} from '@shared/types';
import {
  buildMarketingText,
  createLocalFallbackResult,
  getCanvasDimensions,
  resolveTryOnVisualSource,
} from '@shared/adWorkflow';
import ImageUploader from '@/components/ImageUploader';
import { renderAd } from '@/lib/canvasRenderer';
import { downloadImage, shareToWhatsApp, shareViaWebAPI } from '@/lib/share';
import { getFromStorage, removeFromStorage, saveToStorage } from '@/lib/storage';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Check,
  ChevronRight,
  ImagePlus,
  MessageCircle,
  Pencil,
  Settings,
  Sparkles,
  Wand2,
} from 'lucide-react';

const LOGO_URL = '/manus-storage/marwan-designer-logo_df9b28d4.png';
const AboutApp = React.lazy(() => import('@/components/AboutApp'));
const DeveloperWorkspace = React.lazy(() => import('@/components/DeveloperWorkspace'));
const AdDetailsForm = React.lazy(() => import('@/components/AdDetailsForm'));
const PersonalMessageCenter = React.lazy(() => import('@/components/PersonalMessageCenter'));
const SharePanel = React.lazy(() => import('@/components/SharePanel'));
const TryOnStatusNotice = React.lazy(() => import('@/components/TryOnStatusNotice').then(module => ({ default: module.TryOnStatusNotice })));
const UserTemplateSettings = React.lazy(() => import('@/components/UserTemplateSettings'));
const EMPTY_AD_DETAILS: AdDetails = { ...DEFAULT_AD_DETAILS, features: [] };

const WORKFLOW_STEPS: Array<{ id: AdWorkflowStep; label: string }> = [
  { id: 'upload', label: 'رفع الملابس' },
  { id: 'details', label: 'بيانات الإعلان' },
  { id: 'final', label: 'الإعلان جاهز' },
];

function isWorkflowStep(value: string | null): value is AdWorkflowStep {
  return value === 'upload' || value === 'details' || value === 'final';
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<AdWorkflowStep>('upload');
  const [productImage, setProductImage] = useState('');
  const [adDetails, setAdDetails] = useState<AdDetails>(DEFAULT_AD_DETAILS);
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(DEFAULT_TEMPLATE_SETTINGS);
  const [generatedAd, setGeneratedAd] = useState('');
  const [marketingText, setMarketingText] = useState('');
  const [tryOnResult, setTryOnResult] = useState<TryOnResult>({
    status: 'idle',
    message: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeView, setActiveView] = useState<'create' | 'settings' | 'about' | 'developer' | 'messages'>('create');
  const tryOnMutation = trpc.tryOn.run.useMutation();
  const backgroundRemoveMutation = trpc.tryOn.removeBackground.useMutation();
  const announcementQuery = trpc.personal.announcement.useQuery();

  useEffect(() => {
    const savedDetails = getFromStorage<AdDetails>(StorageKeys.LAST_AD_DETAILS);
    const savedTemplate = getFromStorage<TemplateSettings>(StorageKeys.TEMPLATE_SETTINGS);

    if (savedDetails) setAdDetails({ ...DEFAULT_AD_DETAILS, ...savedDetails });
    if (savedTemplate) setTemplateSettings({ ...DEFAULT_TEMPLATE_SETTINGS, ...savedTemplate });
  }, []);

  useEffect(() => {
    saveToStorage(StorageKeys.LAST_AD_DETAILS, adDetails);
  }, [adDetails]);

  useEffect(() => {
    saveToStorage(StorageKeys.TEMPLATE_SETTINGS, templateSettings);
  }, [templateSettings]);

  useEffect(() => {
    return () => {
      if (productImage.startsWith('blob:')) URL.revokeObjectURL(productImage);
    };
  }, [productImage]);

  useEffect(() => {
    return () => {
      if (generatedAd.startsWith('blob:')) URL.revokeObjectURL(generatedAd);
    };
  }, [generatedAd]);

  const handleImageSelect = (imageUrl: string) => {
    setProductImage(imageUrl);
    setGeneratedAd('');
    setTryOnResult({ status: 'idle', message: '' });
    setCurrentStep('details');
  };

  const handleImageRemove = () => {
    setProductImage('');
    setGeneratedAd('');
    setTryOnResult({ status: 'idle', message: '' });
    setCurrentStep('upload');
  };

  const clearAdSession = () => {
    if (!window.confirm('هل تريد مسح صورة الملابس وبيانات الإعلان والتصميم الحالي؟')) return;
    if (productImage.startsWith('blob:')) URL.revokeObjectURL(productImage);
    if (generatedAd.startsWith('blob:')) URL.revokeObjectURL(generatedAd);
    setProductImage('');
    setGeneratedAd('');
    setMarketingText('');
    setAdDetails(EMPTY_AD_DETAILS);
    setTryOnResult({ status: 'idle', message: '' });
    setCurrentStep('upload');
    setActiveView('create');
    removeFromStorage(StorageKeys.LAST_AD_DETAILS);
    removeFromStorage(StorageKeys.LAST_WORKFLOW_STEP);
    toast.success('تم مسح جلسة الإعلان. يمكنك بدء تصميم جديد الآن.');
  };

  const generateAd = async () => {
    if (!productImage) {
      setCurrentStep('upload');
      return;
    }

    setCurrentStep('final');
    setIsGenerating(true);
    setGeneratedAd('');
    setTryOnResult({
      status: 'processing',
      message: 'جارٍ تجهيز الإعلان ومحاولة تجربة الملابس بالذكاء الاصطناعي…',
    });

    try {
      const tryOnWorkflow = await resolveTryOnVisualSource(
        productImage,
        async () => {
          const productImageData = await blobUrlToDataUri(productImage);
          try {
            const aspectRatio = templateSettings.size === 'story' ? '9:16' : '4:5';
            return await tryOnMutation.mutateAsync({
              productImageData,
              aspectRatio,
            });
          } catch (tryOnError) {
            const rawCutout = await backgroundRemoveMutation.mutateAsync({ productImageData });
            return {
              ...rawCutout,
              message: `تعذر التلبيس بالذكاء الاصطناعي، لكن ${rawCutout.message}`,
              transparentSubject: 'garment' as const,
            };
          }
        },
        fetchImageAsBlobUrl
      );
      const imageForCanvas = tryOnWorkflow.imageForCanvas;
      setTryOnResult(tryOnWorkflow.result);

      const dimensions = getCanvasDimensions(templateSettings.size);
      const output = await withTimeout(
        renderAd(adDetails, templateSettings, imageForCanvas, { ...dimensions, visualMode: tryOnWorkflow.result.transparentSubject === 'person' ? 'transparentPerson' : 'garment' }),
        15_000,
        'انتهت مهلة إنشاء الإعلان. جرّب صورة أصغر أو أعد المحاولة.'
      );

      setGeneratedAd(output);
      setMarketingText(buildMarketingText(adDetails));
    } catch (error) {
      console.error('Failed to generate local advertisement:', error);
      setTryOnResult({
        status: 'unavailable',
        message: 'تعذّر إنشاء الإعلان حالياً. تحقق من الصورة ثم حاول مرة أخرى.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedAd) return;
    try {
      downloadImage(generatedAd, `${adDetails.productName.trim() || 'إعلان-ملابس'}-${Date.now()}.png`);
      toast.success('تم حفظ تصميم PNG. افتح التنزيلات أو المعرض لإرساله في واتساب.');
    } catch {
      toast.error('تعذّر تنزيل الإعلان. حاول مرة أخرى.');
    }
  };

  const handleWhatsApp = async () => {
    if (!generatedAd) return;
    try {
      const shared = await shareViaWebAPI(generatedAd, adDetails.productName || 'إعلان ملابس', marketingText);
      if (shared) {
        toast.success('تم فتح نافذة المشاركة. اختر واتساب لإرسال الإعلان.');
        return;
      }
      downloadImage(generatedAd, `${adDetails.productName.trim() || 'إعلان-ملابس'}-${Date.now()}.png`);
      shareToWhatsApp('', marketingText);
      toast.success('حُفظ التصميم وفتح واتساب بالنص فقط. أرفق ملف PNG من التنزيلات؛ لا نشارك رابط المعاينة المؤقت.');
    } catch {
      toast.error('تعذّرت المشاركة عبر واتساب. جرّب تنزيل الصورة أولاً.');
    }
  };

  const handleShare = async () => {
    if (!generatedAd) return;
    try {
      const shared = await shareViaWebAPI(generatedAd, adDetails.productName || 'إعلان ملابس', marketingText);
      if (shared) {
        toast.success('تم فتح نافذة مشاركة الإعلان.');
        return;
      }
      shareToWhatsApp('', marketingText);
      toast.success('تم فتح واتساب بالنص التسويقي كخيار مشاركة بديل.');
    } catch {
      toast.error('تعذّرت مشاركة الإعلان حالياً.');
    }
  };

  const currentIndex = WORKFLOW_STEPS.findIndex(step => step.id === currentStep);

  return (
    <div className="min-h-screen bg-[#fffaf4] text-foreground" dir="rtl">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#fffaf4]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Marwan Designer" className="h-11 w-11 rounded-2xl object-contain shadow-sm" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-primary">مولد إعلانات الملابس</h1>
              <p className="text-xs text-muted-foreground">مشروع شخصي تعليمي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setActiveView('messages')} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm transition active:scale-95" aria-label="رسائل المشروع"><MessageCircle size={19} /></button>
            <button type="button" onClick={() => setActiveView('settings')} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm transition active:scale-95" aria-label="الإعدادات"><Settings size={20} /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6 sm:pt-9">
        {activeView === 'create' && <section className="mb-6 rounded-3xl bg-white p-4 shadow-[0_12px_30px_rgba(37,35,95,0.06)]">
          <div className="flex items-start justify-between gap-1">
            {WORKFLOW_STEPS.map((step, index) => {
              const isCurrent = step.id === currentStep;
              const isDone = index < currentIndex;
              return (
                <div key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black transition ${
                      isCurrent
                        ? 'bg-accent text-accent-foreground shadow-lg shadow-red-200'
                        : isDone
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {isDone ? <Check size={17} /> : index + 1}
                  </div>
                  <span className={`text-[11px] font-bold leading-tight sm:text-xs ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>}

        {activeView === 'settings' && (<React.Suspense fallback={<PageLoading label="جارٍ فتح الإعدادات…" />}><UserTemplateSettings
            settings={templateSettings}
            onChange={setTemplateSettings}
            onBack={() => setActiveView('create')}
            onAbout={() => setActiveView('about')}
          /></React.Suspense>)}

        {activeView === 'messages' && <React.Suspense fallback={<PageLoading label="جارٍ فتح الرسائل…" />}><PersonalMessageCenter onBack={() => setActiveView('create')} /></React.Suspense>}

        {activeView === 'about' && (
          <React.Suspense fallback={<PageLoading label="جارٍ فتح حول التطبيق…" />}>
            <AboutApp onBack={() => setActiveView('settings')} />
          </React.Suspense>
        )}

        {activeView === 'developer' && (
          <React.Suspense fallback={<PageLoading label="جارٍ فتح لوحة المطور…" />}>
            <DeveloperWorkspace onBack={() => setActiveView('create')} />
          </React.Suspense>
        )}

        {activeView === 'create' && announcementQuery.data && (
          <button type="button" onClick={() => setActiveView('messages')} className="mb-5 w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-right text-sm leading-6 text-amber-950"><span className="font-black">رسالة من المطور: </span>{announcementQuery.data.message}</button>
        )}

        {activeView === 'create' && currentStep === 'upload' && (
          <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_40px_rgba(37,35,95,0.08)] sm:p-7">
            <div className="mb-6">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <ImagePlus size={15} /> المرحلة الأولى
              </span>
              <h2 className="text-2xl font-black text-foreground">ارفع صورة الملابس</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">اختر صورة واضحة للقطعة فقط، وسننقلك مباشرة إلى بيانات الإعلان.</p>
            </div>
            <ImageUploader
              onImageSelect={handleImageSelect}
              currentImage={productImage}
              onImageRemove={handleImageRemove}
            />
          </section>
        )}

        {activeView === 'create' && currentStep === 'details' && (
          <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_40px_rgba(37,35,95,0.08)] sm:p-7">
            <div className="mb-6 flex gap-4 rounded-2xl bg-secondary/60 p-3">
              <img src={productImage} alt="صورة القطعة المختارة" className="h-16 w-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-primary">المرحلة الثانية</span>
                <h2 className="mt-1 text-xl font-black text-foreground">بيانات الإعلان</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">جميع الحقول اختيارية؛ لن يتوقف الإعلان إن تركتها فارغة.</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="self-start rounded-lg px-2 py-1 text-xs font-bold text-primary hover:bg-white"
              >
                تغيير
              </button>
            </div>

            <React.Suspense fallback={<PageLoading label="جارٍ تجهيز حقول الإعلان…" />}><AdDetailsForm details={adDetails} onChange={setAdDetails} /></React.Suspense>

            <div className="mt-7 rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Wand2 size={19} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-primary">
                  عند الضغط على زر التوليد سيحاول التطبيق التلبيس بالذكاء الاصطناعي تلقائياً. إذا لم تتوفر النتيجة، سيضع صورة القطعة داخل القالب مباشرة.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={generateAd}
              className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-base font-black text-accent-foreground shadow-lg shadow-red-200 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={20} /> توليد الإعلان
            </button>
          </section>
        )}

        {activeView === 'create' && currentStep === 'final' && (
          <section className="space-y-5">
            <div className="rounded-[28px] bg-white p-5 shadow-[0_16px_40px_rgba(37,35,95,0.08)] sm:p-7">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    <Sparkles size={15} /> المرحلة الثالثة
                  </span>
                  <h2 className="mt-3 text-2xl font-black text-foreground">الإعلان النهائي</h2>
                  <p className="mt-1 text-sm text-muted-foreground">راجع النتيجة ثم نزّلها أو شاركها مباشرة.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('details')}
                  className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-sm font-bold text-primary transition active:scale-95"
                >
                  <Pencil size={16} /> تعديل
                </button>
              </div>

              {isGenerating && (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl bg-secondary/70 p-8 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-primary shadow-sm">
                    <Sparkles className="animate-pulse" size={28} />
                  </div>
                  <h3 className="text-lg font-black text-foreground">جارٍ توليد الإعلان</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">نرتب القالب ونحاول تجهيز تجربة الملابس. لا تغلق الصفحة الآن.</p>
                </div>
              )}

              {!isGenerating && generatedAd && (
                <>
                  <img
                    src={generatedAd}
                    alt="معاينة الإعلان النهائي"
                    className="mx-auto max-h-[560px] w-full rounded-3xl border border-stone-100 bg-stone-50 object-contain shadow-sm"
                  />
                  <React.Suspense fallback={null}><TryOnStatusNotice result={tryOnResult} /></React.Suspense>
                </>
              )}

              {!isGenerating && tryOnResult.status === 'unavailable' && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                  <p className="font-bold text-red-900">{tryOnResult.message}</p>
                  <button type="button" onClick={generateAd} className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white">إعادة المحاولة</button>
                </div>
              )}
            </div>

            {!isGenerating && generatedAd && (
              <>
                <section className="rounded-3xl bg-white p-5 shadow-[0_12px_30px_rgba(37,35,95,0.06)]">
                  <div className="mb-3 flex items-center gap-2 text-primary"><MessageCircle size={19} /><h3 className="font-black">نص الإعلان</h3></div>
                  <p className="text-sm leading-7 text-foreground">{marketingText}</p>
                </section>
                <React.Suspense fallback={<PageLoading label="جارٍ تجهيز خيارات المشاركة…" />}><SharePanel onDownload={handleDownload} onShare={handleShare} onWhatsApp={handleWhatsApp} onEdit={() => setCurrentStep('details')} onClear={clearAdSession} /></React.Suspense>
              </>
            )}
          </section>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur" aria-label="التنقل الرئيسي">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
          <button type="button" onClick={() => setActiveView('create')} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-xs ${activeView === 'create' ? 'font-bold text-primary' : 'font-medium text-muted-foreground'}`}><Sparkles size={20} />إنشاء</button>
          <button type="button" onClick={() => setActiveView('settings')} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-xs ${activeView === 'settings' ? 'font-bold text-primary' : 'font-medium text-muted-foreground'}`}><Settings size={20} />الإعدادات</button>
          <button type="button" onClick={() => setActiveView('developer')} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-xs ${activeView === 'developer' ? 'font-bold text-primary' : 'font-medium text-muted-foreground'}`}><ChevronRight size={20} />المطور</button>
        </div>
      </nav>
    </div>
  );
}

function PageLoading({ label }: { label: string }) {
  return <div className="rounded-[28px] bg-white p-8 text-center text-sm font-bold text-primary shadow-[0_16px_40px_rgba(37,35,95,0.08)]">{label}</div>;
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(
      result => {
        window.clearTimeout(timeout);
        resolve(result);
      },
      error => {
        window.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function blobUrlToDataUri(url: string): Promise<string> {
  return fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('تعذر قراءة صورة الملابس');
      return response.blob();
    })
    .then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('تعذر تجهيز صورة الملابس'));
      reader.readAsDataURL(blob);
    }));
}

async function fetchImageAsBlobUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('تعذر تحميل صورة Try-On النهائية');
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('نتيجة Try-On ليست صورة صالحة');
  return URL.createObjectURL(blob);
}
