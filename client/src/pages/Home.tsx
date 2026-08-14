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
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import { renderAd } from '@/lib/canvasRenderer';
import { removeBackgroundLocally, type LocalRemovalStage } from '@/lib/localBackgroundRemoval';
import { formatLocalFirstDownloadSize, formatLocalModelSize, getLocalRemovalUnavailableMessage } from '@/lib/localBackgroundRemovalSupport';
import { assessImageBackground, type BackgroundAssessment } from '@/lib/backgroundAssessment';
import { downloadImage, shareToWhatsApp, shareViaWebAPI } from '@/lib/share';
import { getFromStorage, removeFromStorage, saveToStorage } from '@/lib/storage';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  BadgeCheck,
  Check,
  ImagePlus,
  Images,
  LoaderCircle,
  MessageCircle,
  Palette,
  Pencil,
  RotateCcw,
  Send,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';

const LOGO_URL = '/manus-storage/marwan-designer-logo_df9b28d4.png';
const AboutApp = React.lazy(() => import('@/components/AboutApp'));
const BatchWorkspace = React.lazy(() => import('@/components/BatchWorkspace'));
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
const WORKFLOW_STEP_ICONS = { upload: ImagePlus, details: SlidersHorizontal, final: Send } as const;

function isWorkflowStep(value: string | null): value is AdWorkflowStep {
  return value === 'upload' || value === 'details' || value === 'final';
}

type MainApplicationSection = 'create' | 'batch' | 'settings';
type ActiveView = MainApplicationSection | 'about' | 'developer' | 'messages';

function isMainApplicationSection(value: ActiveView): value is MainApplicationSection {
  return value === 'create' || value === 'batch' || value === 'settings';
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<AdWorkflowStep>('upload');
  const [productImage, setProductImage] = useState('');
  const [adDetails, setAdDetails] = useState<AdDetails>(DEFAULT_AD_DETAILS);
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(DEFAULT_TEMPLATE_SETTINGS);
  const [generatedAd, setGeneratedAd] = useState('');
  const [lastVisualSource, setLastVisualSource] = useState('');
  const [marketingText, setMarketingText] = useState('');
  const [tryOnResult, setTryOnResult] = useState<TryOnResult>({
    status: 'idle',
    message: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [useLocalBackgroundRemoval, setUseLocalBackgroundRemoval] = useState(true);
  const [backgroundAssessment, setBackgroundAssessment] = useState<BackgroundAssessment>('unknown');
  const [preferOriginalImage, setPreferOriginalImage] = useState(false);
  const [isReviewingImage, setIsReviewingImage] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const saved = getFromStorage<MainApplicationSection>(StorageKeys.LAST_APP_SECTION);
    return saved === 'batch' || saved === 'settings' ? saved : 'create';
  });
  const tryOnMutation = trpc.tryOn.run.useMutation();
  const backgroundRemoveMutation = trpc.tryOn.removeBackground.useMutation();
  const marketingTextMutation = trpc.marketingText.generate.useMutation();
  const announcementQuery = trpc.personal.announcement.useQuery();

  useEffect(() => {
    const savedDetails = getFromStorage<AdDetails>(StorageKeys.LAST_AD_DETAILS);
    const savedTemplate = getFromStorage<TemplateSettings>(StorageKeys.TEMPLATE_SETTINGS);

    if (savedDetails) setAdDetails({ ...DEFAULT_AD_DETAILS, ...savedDetails });
    if (savedTemplate) setTemplateSettings({ ...DEFAULT_TEMPLATE_SETTINGS, ...savedTemplate });
    setHasRestoredDraft(Boolean(savedDetails && hasMeaningfulDraft(savedDetails)));
    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;
    if (hasMeaningfulDraft(adDetails)) saveToStorage(StorageKeys.LAST_AD_DETAILS, adDetails);
    else removeFromStorage(StorageKeys.LAST_AD_DETAILS);
  }, [adDetails, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    saveToStorage(StorageKeys.TEMPLATE_SETTINGS, templateSettings);
  }, [templateSettings, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady || !isMainApplicationSection(activeView)) return;
    saveToStorage(StorageKeys.LAST_APP_SECTION, activeView);
  }, [activeView, isStorageReady]);

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
    setLastVisualSource('');
    setTryOnResult({ status: 'idle', message: '' });
    setCurrentStep('upload');
    setIsReviewingImage(true);
    setBackgroundAssessment('analyzing');
    setPreferOriginalImage(false);
    void assessImageBackground(imageUrl).then(result => {
      setBackgroundAssessment(result);
      if (result === 'simple') setPreferOriginalImage(true);
    });
    toast.success('تمت إضافة الصورة. راجعها ثم تابع إلى بيانات الإعلان.');
  };

  const handleImageRemove = () => {
    setProductImage('');
    setGeneratedAd('');
    setLastVisualSource('');
    setTryOnResult({ status: 'idle', message: '' });
    setBackgroundAssessment('unknown');
    setPreferOriginalImage(false);
    setIsReviewingImage(false);
    setCurrentStep('upload');
  };

  const handleStepNavigation = (target: AdWorkflowStep) => {
    const targetIndex = WORKFLOW_STEPS.findIndex(step => step.id === target);
    const currentIndex = WORKFLOW_STEPS.findIndex(step => step.id === currentStep);
    if (targetIndex > currentIndex) {
      toast.message('أكمل المرحلة الحالية أولاً ثم انتقل تلقائياً للمرحلة التالية.');
      return;
    }
    if (target === 'details' && !productImage) {
      setCurrentStep('upload');
      return;
    }
    if (target === 'details' && isReviewingImage) {
      setCurrentStep('upload');
      toast.message('راجع الصورة أولاً ثم اضغط «متابعة إلى بيانات الإعلان».');
      return;
    }
    setCurrentStep(target);
  };

  const clearAdSession = () => {
    if (!window.confirm('هل تريد مسح صورة الملابس وبيانات الإعلان والتصميم الحالي؟')) return;
    if (productImage.startsWith('blob:')) URL.revokeObjectURL(productImage);
    if (generatedAd.startsWith('blob:')) URL.revokeObjectURL(generatedAd);
    setProductImage('');
    setGeneratedAd('');
    setLastVisualSource('');
    setMarketingText('');
    setIsReviewingImage(false);
    resetDraftFields();
    setTryOnResult({ status: 'idle', message: '' });
    setCurrentStep('upload');
    setActiveView('create');
    removeFromStorage(StorageKeys.LAST_WORKFLOW_STEP);
    toast.success('تم مسح جلسة الإعلان. يمكنك بدء تصميم جديد الآن.');
  };

  const resetDraftFields = () => {
    setAdDetails(EMPTY_AD_DETAILS);
    setHasRestoredDraft(false);
    removeFromStorage(StorageKeys.LAST_AD_DETAILS);
  };

  const discardRestoredDraft = () => {
    resetDraftFields();
    toast.success('بدأت مسودة بيانات جديدة. إعدادات القالب والشعار والتذييل بقيت محفوظة.');
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
      message: 'نجهّز الصورة والقالب للإعلان…',
    });

    let localFallbackMessage = '';

    try {
      if (useLocalBackgroundRemoval) {
        try {
          const localImage = await removeBackgroundLocally(productImage, stage => {
            setTryOnResult({ status: 'processing', message: getLocalStageMessage(stage) });
          });
          setTryOnResult({
            status: 'success',
            imageUrl: localImage.imageUrl,
            providerId: 'local-u2netp',
            message: 'تم تجهيز الملابس بخلفية شفافة على هذا الهاتف.',
            isTransparent: true,
            transparentSubject: 'garment',
          });
          const dimensions = getCanvasDimensions(templateSettings.size);
          setLastVisualSource(localImage.imageUrl);
          const output = await withTimeout(
            renderAd(adDetails, templateSettings, localImage.imageUrl, { ...dimensions, visualMode: 'garment' }),
            15_000,
            'انتهت مهلة إنشاء الإعلان. جرّب صورة أصغر أو أعد المحاولة.'
          );
          setGeneratedAd(output);
          setMarketingText(buildMarketingText(adDetails));
          return;
        } catch (localError) {
          localFallbackMessage = getLocalRemovalUnavailableMessage(localError);
          toast.error(`${localFallbackMessage} سنكمل بطريقة بديلة.`);
          setTryOnResult({ status: 'processing', message: 'تعذرت الإزالة المحلية؛ نكمل بطريقة بديلة للصورة…' });
        }
      }

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
            if (preferOriginalImage) {
              return {
                imageUrl: productImage,
                providerId: 'original-image',
                message: 'احتفظنا بصورة القطعة كما هي لأن الخلفية تبدو بسيطة، لتجنب قص الملابس الفاتحة.',
              };
            }
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
      setLastVisualSource(imageForCanvas);
      const resolvedResult = localFallbackMessage && tryOnWorkflow.result.status === 'fallback'
        ? { ...tryOnWorkflow.result, message: `${localFallbackMessage} ${tryOnWorkflow.result.message}` }
        : tryOnWorkflow.result;
      setTryOnResult(resolvedResult);

      const dimensions = getCanvasDimensions(templateSettings.size);
      const output = await withTimeout(
        renderAd(adDetails, templateSettings, imageForCanvas, { ...dimensions, visualMode: resolvedResult.transparentSubject === 'person' ? 'transparentPerson' : 'garment' }),
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

  const regenerateWithCurrentSettings = async () => {
    const source = lastVisualSource || productImage;
    if (!source) {
      setCurrentStep('upload');
      return;
    }
    setIsGenerating(true);
    setGeneratedAd('');
    try {
      const dimensions = getCanvasDimensions(templateSettings.size);
      const output = await withTimeout(
        renderAd(adDetails, templateSettings, source, { ...dimensions, visualMode: tryOnResult.transparentSubject === 'person' ? 'transparentPerson' : 'garment' }),
        15_000,
        'انتهت مهلة إعادة بناء الإعلان. أعد المحاولة أو جرّب صورة أصغر.'
      );
      setGeneratedAd(output);
      setMarketingText(buildMarketingText(adDetails));
      toast.success('تمت إعادة توليد الإعلان بالإعدادات الجديدة من دون طلب الذكاء الاصطناعي مرة أخرى.');
    } catch (error) {
      console.error('Failed to regenerate advertisement with updated template:', error);
      toast.error('تعذرت إعادة توليد الإعلان بالتغييرات الجديدة. حاول مرة أخرى.');
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
    <div className="reference-shell min-h-screen text-foreground" dir="rtl">
      <header className="sticky top-0 z-20 bg-[#fdfbf8]/92 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-[44px_minmax(0,1fr)_48px] items-center gap-3 px-5 py-4">
          <button type="button" onClick={() => setActiveView('messages')} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-white text-primary shadow-sm transition hover:bg-primary/5 active:scale-95" aria-label="رسائل المشروع"><MessageCircle size={20} /></button>
          <div className="min-w-0 text-center"><h1 className="text-[15px] font-black leading-5 tracking-tight text-primary sm:text-xl">استوديو إعلانات الملابس</h1><p className="mt-0.5 text-[10px] font-bold text-muted-foreground">صمّم إعلانك بخطوات سهلة</p></div>
          <button type="button" onClick={() => setActiveView('settings')} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm transition hover:bg-primary/5 active:scale-95" aria-label="الإعدادات"><img src={LOGO_URL} alt="شعار التطبيق" className="h-full w-full object-contain" /></button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-5 sm:pt-8">
        {activeView === 'create' && <PwaInstallPrompt />}

        {activeView === 'create' && <section className={`reference-card mb-6 p-4 ${currentStep === 'upload' ? 'hidden' : ''}`}>
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-xs font-black text-primary">خطوة {currentIndex + 1} من {WORKFLOW_STEPS.length}</span>
            <span className="text-[11px] font-medium text-muted-foreground">من صورة القطعة إلى إعلان جاهز</span>
          </div>
          <div className="flex items-start justify-between gap-1">
            {WORKFLOW_STEPS.map((step, index) => {
              const isCurrent = step.id === currentStep;
              const isDone = index < currentIndex;
              const StepIcon = WORKFLOW_STEP_ICONS[step.id];
              return (
                <button key={step.id} type="button" onClick={() => handleStepNavigation(step.id)} disabled={index > currentIndex} aria-current={isCurrent ? 'step' : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-2 rounded-2xl px-1 py-1 text-center transition ${isCurrent ? 'bg-primary/[.06]' : ''} ${index <= currentIndex ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed'}`}>
                  <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black transition ${
                    isCurrent
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : isDone
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {isDone ? <Check size={17} /> : <StepIcon size={17} />}
                  </div>
                  <span className={`text-[11px] font-bold leading-tight sm:text-xs ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>}

        {activeView === 'settings' && (<React.Suspense fallback={<PageLoading label="جارٍ فتح الإعدادات…" />}><UserTemplateSettings
            settings={templateSettings}
            onChange={setTemplateSettings}
            onBack={() => setActiveView('create')}
            onAbout={() => setActiveView('about')}
            onDeveloper={() => setActiveView('developer')}
          /></React.Suspense>)}

        {activeView === 'batch' && <React.Suspense fallback={<PageLoading label="جارٍ فتح مساحة الدفعة…" />}><BatchWorkspace details={adDetails} template={templateSettings} onDetailsChange={setAdDetails} onBack={() => setActiveView('create')} generateCloudText={(details, preferences, variant) => marketingTextMutation.mutateAsync({ details, preferences, variant })} /></React.Suspense>}

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
          <section className="reference-card p-5 sm:p-7">
            <div className="mb-6">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><ImagePlus size={15} />الخطوة الأولى</span>
              <h2 className="text-2xl font-black text-primary">جاهز لصناعة إعلانك؟</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">اختر طريقة العمل ثم ارفع صورة واضحة للقطعة.</p>
            </div>
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-black text-primary">اختر طريقة العمل</h3>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setActiveView('create')} aria-pressed className="rounded-[24px] border-2 border-primary bg-primary/[0.045] p-4 text-right shadow-sm transition active:scale-[0.98]"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><ImagePlus size={25} /></span><span className="block text-base font-black text-primary">إعلان فردي</span><span className="mt-1 block text-xs text-muted-foreground">قطعة واحدة</span><span className="mt-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check size={14} /></span></button>
                <button type="button" onClick={() => setActiveView('batch')} className="rounded-[24px] border border-[#e8e4ed] bg-white p-4 text-right shadow-sm transition hover:border-primary/30 active:scale-[0.98]"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Images size={25} /></span><span className="block text-base font-black text-primary">إنشاء دفعة</span><span className="mt-1 block text-xs text-muted-foreground">حتى 10 صور</span></button>
              </div>
            </div>
            {hasRestoredDraft && <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-right">
              <RotateCcw size={19} className="mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1"><p className="text-sm font-black text-primary">استعدنا بيانات آخر مسودة</p><p className="mt-1 text-xs leading-5 text-muted-foreground">ارفع صورة القطعة لإكمالها، أو ابدأ حقولاً جديدة من دون مسح إعدادات القالب.</p></div>
              <button type="button" onClick={discardRestoredDraft} className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-black text-primary shadow-sm transition active:scale-95">بدء جديد</button>
            </div>}
            {isReviewingImage && productImage ? (
              <SingleImageReview image={productImage} onImageSelect={handleImageSelect} onImageRemove={handleImageRemove} onContinue={() => { setIsReviewingImage(false); setCurrentStep('details'); toast.success('الصورة جاهزة. أضف بيانات الإعلان التي تريدها.'); }} />
            ) : (
              <ImageUploader
                onImageSelect={handleImageSelect}
                currentImage={productImage}
                onImageRemove={handleImageRemove}
              />
            )}
          </section>
        )}

        {activeView === 'create' && currentStep === 'details' && (
          <section className="reference-card p-5 sm:p-7">
            <div className="mb-6 flex gap-4 rounded-[22px] border border-[#e9e5ef] bg-white p-3 shadow-sm">
              <img src={productImage} alt="صورة القطعة المختارة" className="h-16 w-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-primary">الصورة جاهزة</span>
                <h2 className="mt-1 text-xl font-black text-foreground">بيانات الإعلان</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">يكفي اسم المنتج والسعر إن وجدا. أضف تفاصيل أكثر فقط إذا احتجت.</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="self-start rounded-lg px-2 py-1 text-xs font-bold text-primary hover:bg-white"
              >
                تغيير
              </button>
            </div>

            <React.Suspense fallback={<PageLoading label="جارٍ تجهيز حقول الإعلان…" />}><AdDetailsForm details={adDetails} onChange={setAdDetails} generateCloudText={(details, preferences, variant) => marketingTextMutation.mutateAsync({ details, preferences, variant })} /></React.Suspense>

            <div className="reference-local-note mt-5"><BadgeCheck size={18} />سيجهّز التطبيق الخلفية والنص تلقائياً على الهاتف.</div>

            <details className="mt-4 rounded-2xl border border-dashed border-primary/20 bg-white px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-black text-primary marker:hidden">خيارات الصورة المتقدمة</summary>
              <div className="mt-4 border-t border-primary/10 pt-4">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/10 bg-primary/[0.04] p-4 text-right transition active:scale-[0.99]">
                  <input
                    type="checkbox"
                    checked={useLocalBackgroundRemoval}
                    onChange={event => setUseLocalBackgroundRemoval(event.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 accent-primary"
                  />
                  <span><span className="block text-sm font-black text-primary">إزالة الخلفية محلياً على الهاتف</span><span className="mt-1 block text-xs leading-6 text-muted-foreground">تعمل دون إرسال الصورة. ألغِ التحديد فقط عند رغبتك في تجربة الطريقة البديلة.</span></span>
                </label>

                {backgroundAssessment === 'analyzing' && <p className="mt-3 text-xs font-bold text-muted-foreground" aria-live="polite">جارٍ فحص خلفية الصورة بصورة محلية…</p>}
                {backgroundAssessment === 'simple' && <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-right transition active:scale-[0.99]"><input type="checkbox" checked={preferOriginalImage} onChange={event => setPreferOriginalImage(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-sky-700" /><span><span className="block text-sm font-black text-sky-950">احتفظ بالصورة إذا كانت الخلفية بسيطة</span><span className="mt-1 block text-xs leading-6 text-sky-900">خيار محافظ للملابس الفاتحة عند تعذر تجهيز الخلفية.</span></span></label>}
                {backgroundAssessment === 'mixed' && <p className="mt-3 rounded-2xl bg-secondary/65 p-3 text-xs font-bold leading-5 text-muted-foreground">الخلفية متنوعة؛ سيختار التطبيق أفضل مسار تلقائياً إذا تعذر الإعداد المحلي.</p>}
              </div>
            </details>

            <button
              type="button"
              onClick={generateAd}
              className="reference-primary mt-5 w-full"
            >
              <Sparkles size={20} /> إنشاء الإعلان
            </button>
          </section>
        )}

        {activeView === 'create' && currentStep === 'final' && (
          <section className="space-y-5">
            <div className="reference-card p-5 sm:p-7">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><BadgeCheck size={15} /> الإعلان جاهز</span>
                  <h2 className="mt-3 text-2xl font-black text-primary">إعلانك أصبح جاهزاً</h2>
                  <p className="mt-1 text-sm text-muted-foreground">راجع النتيجة ثم نزّلها أو شاركها مباشرة.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={isGenerating} onClick={regenerateWithCurrentSettings} className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"><RotateCcw size={16} />{isGenerating ? 'جارٍ التحديث' : 'إعادة توليد بالتغييرات الجديدة'}</button><button
                    type="button"
                    onClick={() => setCurrentStep('details')}
                    className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-sm font-bold text-primary transition active:scale-95"
                  >
                    <Pencil size={16} /> تعديل
                  </button></div>
              </div>

              {isGenerating && (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl bg-secondary/70 p-8 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-primary shadow-sm">
                    <Sparkles className="animate-pulse" size={28} />
                  </div>
                  <h3 className="text-lg font-black text-foreground">جارٍ توليد الإعلان</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground" aria-live="polite">{tryOnResult.message || 'نرتب القالب ونجهز الصورة. لا تغلق الصفحة الآن.'}</p>
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
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center" role="alert">
                  <p className="font-bold text-red-900">{tryOnResult.message}</p>
                  <button type="button" onClick={generateAd} className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white">إعادة المحاولة</button>
                </div>
              )}
            </div>

            {!isGenerating && generatedAd && (
              <>
                <section className="rounded-3xl bg-white p-5 shadow-[0_12px_30px_rgba(37,35,95,0.06)]">
                  <div className="mb-3 flex items-center justify-between gap-2 text-primary"><span className="flex items-center gap-2"><MessageCircle size={19} /><h3 className="font-black">نص الإعلان</h3></span><span className="text-[11px] font-bold text-muted-foreground">قابل للتحرير قبل المشاركة</span></div>
                  <textarea value={marketingText} onChange={event => { setMarketingText(event.target.value); setAdDetails(current => ({ ...current, marketingText: event.target.value })); }} className="min-h-28 w-full rounded-2xl border border-primary/15 bg-secondary/25 p-4 text-right text-sm leading-7 text-foreground outline-none transition focus:border-primary focus:bg-white" aria-label="تعديل نص الإعلان" />
                </section>
                <React.Suspense fallback={<PageLoading label="جارٍ تجهيز خيارات المشاركة…" />}><SharePanel onDownload={handleDownload} onShare={handleShare} onWhatsApp={handleWhatsApp} onEdit={() => setCurrentStep('details')} onClear={clearAdSession} /></React.Suspense>
              </>
            )}
          </section>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ece8f0] bg-[#fdfbf8]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl" aria-label="التنقل الرئيسي">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <button type="button" onClick={() => setActiveView('settings')} aria-current={activeView === 'settings' ? 'page' : undefined} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs transition active:scale-95 ${activeView === 'settings' ? 'bg-primary/10 text-primary' : 'font-medium text-muted-foreground hover:bg-primary/5'}`}><Settings size={20} />الإعدادات</button>
          <button type="button" onClick={() => setActiveView('batch')} aria-current={activeView === 'batch' ? 'page' : undefined} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs transition active:scale-95 ${activeView === 'batch' ? 'bg-primary/10 text-primary' : 'font-medium text-muted-foreground hover:bg-primary/5'}`}><Images size={20} />دفعات</button>
          <button type="button" onClick={() => setActiveView('create')} aria-current={activeView === 'create' ? 'page' : undefined} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs transition active:scale-95 ${activeView === 'create' ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10' : 'font-medium text-muted-foreground hover:bg-primary/5'}`}><span className={`flex h-9 w-9 items-center justify-center rounded-full ${activeView === 'create' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-white text-muted-foreground'}`}><Sparkles size={19} /></span>إنشاء</button>
        </div>
      </nav>
    </div>
  );
}

function PageLoading({ label }: { label: string }) {
  return <div className="rounded-[28px] border border-primary/10 bg-white p-8 text-center shadow-[0_16px_40px_rgba(37,35,95,0.08)]"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LoaderCircle className="animate-spin" size={22} /></div><p className="text-sm font-black text-primary">{label}</p><p className="mt-1 text-xs text-muted-foreground">لا تغلق الصفحة، ستظهر أدواتك خلال لحظات.</p></div>;
}

function SingleImageReview({ image, onImageSelect, onImageRemove, onContinue }: { image: string; onImageSelect: (imageUrl: string) => void; onImageRemove: () => void; onContinue: () => void }) {
  return <div className="space-y-5">
    <div className="rounded-2xl border border-primary/10 bg-primary/[0.045] p-4">
      <div className="flex items-start gap-3"><BadgeCheck size={20} className="mt-0.5 shrink-0 text-primary" /><div><h3 className="text-sm font-black text-primary">راجع الصورة قبل المتابعة</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">تأكد أن قطعة الملابس واضحة. يمكنك تغيير الصورة أو حذفها والعودة للرفع.</p></div></div>
    </div>
    <ImageUploader onImageSelect={onImageSelect} currentImage={image} onImageRemove={onImageRemove} />
    <button type="button" onClick={onContinue} className="reference-primary w-full"><SlidersHorizontal size={20} />متابعة إلى بيانات الإعلان</button>
  </div>;
}

function hasMeaningfulDraft(details: AdDetails) {
  const textFields = [details.productName, details.headline, details.discount, details.quantity, details.price, details.storeName, details.storePhone, details.marketingText];
  return textFields.some(value => value.trim().length > 0) || details.colors.length > 0;
}

function getLocalStageMessage(stage: LocalRemovalStage) {
  const messages: Record<LocalRemovalStage, string> = {
    downloading: `نجهّز أداة الإزالة المحلية للمرة الأولى (نحو ${formatLocalModelSize()})…`,
    loading: 'نشغّل أداة الإزالة على الهاتف…',
    processing: 'نفصل الملابس عن الخلفية…',
    finishing: 'نجهّز الصورة للإعلان…',
  };
  return messages[stage];
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
