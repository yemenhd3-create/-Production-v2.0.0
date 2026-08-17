import * as React from 'react';
import { useEffect, useState } from 'react';
import type { AdDetails, AdWorkflowStep, DesignSuggestion, TemplateSettings, TemplateSize, TryOnResult } from '@shared/types';
import {
  DEFAULT_AD_DETAILS,
  DEFAULT_PRODUCT_SCALE,
  DEFAULT_TEMPLATE_SETTINGS,
  PRODUCT_SCALE_MAX,
  PRODUCT_SCALE_MIN,
  PRODUCT_SCALE_STEP,
  StorageKeys,
} from '@shared/types';
import {
  buildMarketingText,
  getCanvasDimensions,
} from '@shared/adWorkflow';
import ImageUploader from '@/components/ImageUploader';
import LocalDesignSuggestionCard from '@/components/LocalDesignSuggestionCard';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import DesignPassportCard from '@/components/DesignPassportCard';
import DesignContractCard from '@/components/DesignContractCard';
import { renderAd } from '@/lib/canvasRenderer';
import { createDesignPassport, passportFilename, passportToJson, type DesignPassport } from '@/lib/designPassport';
import { applyDesignDocument, applyDesignRepair, compileDesignDocument } from '@/lib/designCompiler';
import { evaluateDesignContract } from '@/lib/designContract';
import { canExportDesign, evaluateDesignQuality, type DesignQualityReport } from '@/lib/designQualityGate';
import { inspectRenderedPixelTruth } from '@/lib/pixelTruthGate';
import { appendDesignHistory, createDesignHistory, designDocumentFingerprint, parseDesignHistory, redoDesignHistory, removeDesignHistoryEntry, replayDesignHistory, serializeDesignHistory, undoDesignHistory, type DesignHistoryDocument, type DesignHistoryEntry } from '@/lib/designHistory';
import { applyDesignSuggestion } from '@/lib/designSuggestionApplication';
import { buildDesignBenchmarks, createQualityFingerprint, detectDesignRegression } from '@/lib/designBenchmark';
import { createSuggestionFromMetrics } from '@/lib/localDesignIntelligence';
import { prepareLocalAnalysis } from '@/lib/localAnalysisCache';
import { clearPreferenceProfile, loadPreferenceProfile, recordLayoutPreference, setPreferenceEnabled } from '@/lib/localArtDirectorPreferences';
import { removeBackgroundLocally, type LocalRemovalStage } from '@/lib/localBackgroundRemoval';
import { formatLocalFirstDownloadSize, formatLocalModelSize } from '@/lib/localBackgroundRemovalSupport';
import { downloadImage, shareToWhatsApp, shareViaWebAPI } from '@/lib/share';
import { getFromStorage, removeFromStorage, saveToStorage } from '@/lib/storage';
import { clearMerchantProfile, loadMerchantProfile, saveMerchantProfile } from '@/lib/merchantMemory';
import { applyMerchantCommands, type MerchantCommand, type MerchantProfile } from '@shared/merchantAssistant';
import { trpc } from '@/lib/trpc';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import type { DesignContractReport, DesignRepairId } from '@shared/designDocument';
import type { DesignBenchmark, DesignQualityFingerprint, DesignRegression } from '@shared/designBenchmark';
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
  Bot,
  Wand2,
} from 'lucide-react';

const LOGO_URL = '/manus-storage/marwan-designer-logo_df9b28d4.png';
const AboutApp = React.lazy(() => import('@/components/AboutApp'));
const BatchWorkspace = React.lazy(() => import('@/components/BatchWorkspace'));
const DeveloperWorkspace = React.lazy(() => import('@/components/DeveloperWorkspace'));
const AdDetailsForm = React.lazy(() => import('@/components/AdDetailsForm'));
const PersonalMessageCenter = React.lazy(() => import('@/components/PersonalMessageCenter'));
const SharePanel = React.lazy(() => import('@/components/SharePanel'));
const DesignQualityGateCard = React.lazy(() => import('@/components/DesignQualityGateCard'));
const TryOnStatusNotice = React.lazy(() => import('@/components/TryOnStatusNotice').then(module => ({ default: module.TryOnStatusNotice })));
const UserTemplateSettings = React.lazy(() => import('@/components/UserTemplateSettings'));
const MerchantAssistantWorkspace = React.lazy(() => import('@/components/MerchantAssistantWorkspace'));
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

type MainApplicationSection = 'create' | 'batch' | 'assistant' | 'settings';
type ActiveView = MainApplicationSection | 'about' | 'developer' | 'messages';
type VisualRepairStatus = 'idle' | 'repairing' | 'verified' | 'blocked' | 'failed' | 'undone';
type VisualRepairSnapshot = {
  templateSettings: TemplateSettings;
  generatedAdBlob: Blob;
  qualityGateReport: DesignQualityReport | null;
  designContractReport: DesignContractReport | null;
  marketingText: string;
};

function isMainApplicationSection(value: ActiveView): value is MainApplicationSection {
  return value === 'create' || value === 'batch' || value === 'assistant' || value === 'settings';
}

export default function Home({ friendTestMode = false }: { friendTestMode?: boolean }) {
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
  const [isReviewingImage, setIsReviewingImage] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [designSuggestion, setDesignSuggestion] = useState<DesignSuggestion | null>(null);
  const [selectedSuggestedSize, setSelectedSuggestedSize] = useState<TemplateSize>('portrait');
  const [preferenceProfile, setPreferenceProfile] = useState(() => loadPreferenceProfile());
  const [merchantProfile, setMerchantProfile] = useState(() => loadMerchantProfile());
  const [templateBeforeSuggestion, setTemplateBeforeSuggestion] = useState<TemplateSettings | null>(null);
  const [comparisonPreviews, setComparisonPreviews] = useState<{ current: string; suggested: string } | null>(null);
  const [isDesignAnalyzing, setIsDesignAnalyzing] = useState(false);
  const [localPreparation, setLocalPreparation] = useState<{ status: 'idle' | 'analyzing' | 'ready' | 'failed'; cache?: 'hit' | 'miss'; elapsedMs?: number }>({ status: 'idle' });
  const [designBenchmarks, setDesignBenchmarks] = useState<DesignBenchmark[]>([]);
  const [designRegression, setDesignRegression] = useState<DesignRegression | null>(null);
  const [designPassport, setDesignPassport] = useState<DesignPassport | null>(null);
  const [isCreatingPassport, setIsCreatingPassport] = useState(false);
  const [designContractReport, setDesignContractReport] = useState<DesignContractReport | null>(null);
  const [isCheckingDesignContract, setIsCheckingDesignContract] = useState(false);
  const [qualityGateReport, setQualityGateReport] = useState<DesignQualityReport | null>(null);
  const [isCheckingQualityGate, setIsCheckingQualityGate] = useState(false);
  const [templateBeforeContractRepair, setTemplateBeforeContractRepair] = useState<TemplateSettings | null>(null);
  const [visualRepairSnapshot, setVisualRepairSnapshot] = useState<VisualRepairSnapshot | null>(null);
  const [visualRepairStatus, setVisualRepairStatus] = useState<VisualRepairStatus>('idle');
  const [designHistory, setDesignHistory] = useState<DesignHistoryDocument | null>(null);
  const [designRedoEntries, setDesignRedoEntries] = useState<DesignHistoryEntry[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const saved = getFromStorage<MainApplicationSection>(StorageKeys.LAST_APP_SECTION);
    return saved === 'batch' || saved === 'assistant' || saved === 'settings' ? saved : 'create';
  });
  const marketingTextMutation = trpc.marketingText.generate.useMutation();
  const announcementQuery = trpc.personal.announcement.useQuery(undefined, { enabled: !friendTestMode });

  useEffect(() => {
    const savedDetails = getFromStorage<AdDetails>(StorageKeys.LAST_AD_DETAILS);
    const savedTemplate = getFromStorage<TemplateSettings>(StorageKeys.TEMPLATE_SETTINGS);
    const savedSuggestion = getFromStorage<DesignSuggestion>(StorageKeys.DESIGN_SUGGESTION);

    if (savedDetails) setAdDetails({ ...DEFAULT_AD_DETAILS, ...savedDetails });
    if (savedTemplate) setTemplateSettings({ ...DEFAULT_TEMPLATE_SETTINGS, ...savedTemplate });
    if (savedSuggestion?.version === 1) {
      setDesignSuggestion(savedSuggestion);
      setSelectedSuggestedSize(savedSuggestion.selectedLayout);
    }
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
    if (!isStorageReady) return;
    if (designSuggestion) saveToStorage(StorageKeys.DESIGN_SUGGESTION, designSuggestion);
    else removeFromStorage(StorageKeys.DESIGN_SUGGESTION);
  }, [designSuggestion, isStorageReady]);

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

  useEffect(() => {
    if (!productImage) return;
    let active = true;
    setIsDesignAnalyzing(true);
    setLocalPreparation({ status: 'analyzing' });
    void prepareLocalAnalysis(productImage).then(preparation => {
      if (!active) return;
      const suggestion = createSuggestionFromMetrics(preparation.metrics, adDetails);
      setDesignSuggestion(suggestion);
      setSelectedSuggestedSize(suggestion.selectedLayout);
      setLocalPreparation({ status: 'ready', cache: preparation.cache, elapsedMs: preparation.elapsedMs });
    }).catch(() => {
      if (active) {
        setDesignSuggestion(null);
        setLocalPreparation({ status: 'failed' });
      }
    }).finally(() => {
      if (active) setIsDesignAnalyzing(false);
    });
    return () => { active = false; };
  }, [productImage]);

  useEffect(() => {
    if (!designSuggestion) { setDesignBenchmarks([]); setDesignRegression(null); return; }
    const benchmarks = buildDesignBenchmarks(adDetails, templateSettings, designSuggestion);
    setDesignBenchmarks(benchmarks);
    const selected = benchmarks.find(item => item.template === selectedSuggestedSize) || benchmarks[0];
    const baseline = getFromStorage<DesignQualityFingerprint>(StorageKeys.DESIGN_QUALITY_BASELINE);
    setDesignRegression(baseline && selected ? detectDesignRegression(baseline, createQualityFingerprint(adDetails, templateSettings, designSuggestion, selected)) : null);
  }, [designSuggestion, selectedSuggestedSize, templateSettings, adDetails]);

  useEffect(() => {
    if (!productImage || !designSuggestion) { setComparisonPreviews(null); return; }
    let active = true;
    let previews: { current: string; suggested: string } | null = null;
    const selected = { ...designSuggestion, selectedLayout: selectedSuggestedSize };
    void Promise.all([
      renderAd(adDetails, templateSettings, productImage, { width: 216, height: 270, quality: .72 }),
      renderAd(adDetails, applyDesignSuggestion(templateSettings, selected), productImage, { width: 216, height: 270, quality: .72 }),
    ]).then(([current, suggested]) => {
      previews = { current, suggested };
      if (active) setComparisonPreviews(previews);
      else { URL.revokeObjectURL(current); URL.revokeObjectURL(suggested); }
    }).catch(() => { if (active) setComparisonPreviews(null); });
    return () => {
      active = false;
      if (previews) { URL.revokeObjectURL(previews.current); URL.revokeObjectURL(previews.suggested); }
    };
  }, [productImage, designSuggestion, selectedSuggestedSize, templateSettings, adDetails]);

  const handleImageSelect = (imageUrl: string) => {
    setProductImage(imageUrl);
    setGeneratedAd('');
    setDesignPassport(null);
    setDesignContractReport(null);
    setQualityGateReport(null);
    setTemplateBeforeContractRepair(null);
    setVisualRepairSnapshot(null);
    setVisualRepairStatus('idle');
    setDesignHistory(null);
    setDesignRedoEntries([]);
    removeFromStorage(StorageKeys.DESIGN_HISTORY);
    setLastVisualSource('');
    setTryOnResult({ status: 'idle', message: '' });
    setDesignSuggestion(null);
    setTemplateBeforeSuggestion(null);
    setCurrentStep('upload');
    setIsReviewingImage(true);
    toast.success('تمت إضافة الصورة. راجعها ثم تابع إلى بيانات الإعلان.');
  };

  const handleImageRemove = () => {
    setProductImage('');
    setGeneratedAd('');
    setDesignPassport(null);
    setDesignContractReport(null);
    setQualityGateReport(null);
    setTemplateBeforeContractRepair(null);
    setVisualRepairSnapshot(null);
    setVisualRepairStatus('idle');
    setDesignHistory(null);
    setDesignRedoEntries([]);
    removeFromStorage(StorageKeys.DESIGN_HISTORY);
    setLastVisualSource('');
    setTryOnResult({ status: 'idle', message: '' });
    setDesignSuggestion(null);
    setTemplateBeforeSuggestion(null);
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
    setDesignPassport(null);
    setDesignContractReport(null);
    setQualityGateReport(null);
    setTemplateBeforeContractRepair(null);
    setVisualRepairSnapshot(null);
    setVisualRepairStatus('idle');
    setDesignHistory(null);
    setDesignRedoEntries([]);
    removeFromStorage(StorageKeys.DESIGN_HISTORY);
    setLastVisualSource('');
    setMarketingText('');
    setIsReviewingImage(false);
    resetDraftFields();
    setTryOnResult({ status: 'idle', message: '' });
    setDesignSuggestion(null);
    setTemplateBeforeSuggestion(null);
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

  const acceptDesignSuggestion = () => {
    if (!designSuggestion) return;
    const selectedSuggestion = { ...designSuggestion, selectedLayout: selectedSuggestedSize };
    const nextTemplate = applyDesignSuggestion(templateSettings, selectedSuggestion);
    const benchmarks = buildDesignBenchmarks(adDetails, nextTemplate, selectedSuggestion);
    const selectedBenchmark = benchmarks.find(item => item.template === selectedSuggestedSize) || benchmarks[0];
    setTemplateBeforeSuggestion(previous => previous || templateSettings);
    setTemplateSettings(nextTemplate);
    setDesignBenchmarks(benchmarks);
    if (selectedBenchmark) saveToStorage(StorageKeys.DESIGN_QUALITY_BASELINE, createQualityFingerprint(adDetails, nextTemplate, selectedSuggestion, selectedBenchmark));
    setPreferenceProfile(current => recordLayoutPreference(current, selectedSuggestedSize, true));
    if (!adDetails.marketingText.trim() && selectedSuggestion.suggestedText) {
      setAdDetails(current => ({ ...current, marketingText: selectedSuggestion.suggestedText }));
    }
    setDesignSuggestion(selectedSuggestion);
    toast.success('تم اعتماد الاقتراح. تستطيع تعديل القالب أو التراجع قبل التصدير.');
  };

  const ignoreDesignSuggestion = () => {
    if (designSuggestion) setPreferenceProfile(current => recordLayoutPreference(current, selectedSuggestedSize, false));
    setDesignSuggestion(null);
    setTemplateBeforeSuggestion(null);
  };

  const undoDesignSuggestion = () => {
    if (!templateBeforeSuggestion) return;
    setTemplateSettings(templateBeforeSuggestion);
    setTemplateBeforeSuggestion(null);
    removeFromStorage(StorageKeys.DESIGN_QUALITY_BASELINE);
    setDesignRegression(null);
    toast.success('تمت إعادة إعدادات القالب السابقة.');
  };

  const generateAd = async () => {
    if (!productImage) {
      setCurrentStep('upload');
      return;
    }

    setCurrentStep('final');
    setIsGenerating(true);
    setGeneratedAd('');
    setDesignPassport(null);
    setDesignContractReport(null);
    setQualityGateReport(null);
    setTemplateBeforeContractRepair(null);
    setVisualRepairSnapshot(null);
    setVisualRepairStatus('idle');
    setTryOnResult({
      status: 'processing',
      message: 'نجهّز الصورة والقالب للإعلان…',
    });

    try {
      const localImage = await removeBackgroundLocally(productImage, stage => {
        setTryOnResult({ status: 'processing', message: getLocalStageMessage(stage) });
      });
      setTryOnResult({
        status: 'success',
        imageUrl: localImage.imageUrl,
        providerId: 'local-u2netp',
        message: 'تمت إزالة الخلفية محلياً على هذا الهاتف. لم تُرسل الصورة إلى أي خدمة خارجية.',
        isTransparent: true,
        transparentSubject: 'garment',
      });
      const dimensions = getCanvasDimensions(templateSettings.size);
      setLastVisualSource(localImage.imageUrl);
      const output = await withTimeout(
        renderAd(adDetails, templateSettings, localImage.imageUrl, { ...dimensions, visualMode: 'garment', garmentTransform: templateSettings.smartGarmentTransform }),
        15_000,
        'انتهت مهلة إنشاء الإعلان. جرّب صورة أصغر أو أعد المحاولة.'
      );

      setGeneratedAd(output);
      setMarketingText(buildMarketingText(adDetails));
      const document = compileDesignDocument(adDetails, templateSettings, designSuggestion);
      const contract = evaluateDesignContract(document);
      const pixelTruth = await inspectRenderedPixelTruth(output, document);
      setDesignContractReport(contract);
      setQualityGateReport(evaluateDesignQuality(document, contract, adDetails, designBenchmarks.find(item => item.template === templateSettings.size), pixelTruth));
    } catch (error) {
      console.error('Failed to generate local advertisement:', error);
      setTryOnResult({
        status: 'unavailable',
        message: 'تعذّر تجهيز الصورة محلياً. جرّب قص الزوائد أو صورة أصغر وأوضح، ثم أعد المحاولة.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateWithCurrentSettings = async (templateOverride?: TemplateSettings, successMessage = 'تمت إعادة توليد الإعلان بالإعدادات الجديدة من دون طلب الذكاء الاصطناعي مرة أخرى.', detailsOverride?: AdDetails) => {
    const source = lastVisualSource || productImage;
    if (!source) {
      setCurrentStep('upload');
      return;
    }
    setIsGenerating(true);
    setGeneratedAd('');
    setDesignPassport(null);
    setDesignContractReport(null);
    setQualityGateReport(null);
    setTemplateBeforeContractRepair(null);
    setVisualRepairSnapshot(null);
    setVisualRepairStatus('idle');
    try {
      const activeTemplate = templateOverride || templateSettings;
      const activeDetails = detailsOverride || adDetails;
      const dimensions = getCanvasDimensions(activeTemplate.size);
      const output = await withTimeout(
        renderAd(activeDetails, activeTemplate, source, { ...dimensions, visualMode: tryOnResult.transparentSubject === 'person' ? 'transparentPerson' : 'garment', garmentTransform: activeTemplate.smartGarmentTransform }),
        15_000,
        'انتهت مهلة إعادة بناء الإعلان. أعد المحاولة أو جرّب صورة أصغر.'
      );
      setGeneratedAd(output);
      setMarketingText(buildMarketingText(activeDetails));
      const document = compileDesignDocument(activeDetails, activeTemplate, designSuggestion);
      const contract = evaluateDesignContract(document);
      const pixelTruth = await inspectRenderedPixelTruth(output, document);
      setDesignContractReport(contract);
      setQualityGateReport(evaluateDesignQuality(document, contract, adDetails, designBenchmarks.find(item => item.template === activeTemplate.size), pixelTruth));
      toast.success(successMessage);
      return true;
    } catch (error) {
      console.error('Failed to regenerate advertisement with updated template:', error);
      toast.error('تعذرت إعادة توليد الإعلان بالتغييرات الجديدة. حاول مرة أخرى.');
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProductScaleCommit = async (value: number) => {
    const productScale = clampProductScale(value);
    if (productScale === clampProductScale(templateSettings.productScale)) return;
    const updatedTemplate = { ...templateSettings, productScale };
    const updated = await regenerateWithCurrentSettings(updatedTemplate, 'تم تحديث حجم المنتج داخل القالب محلياً.');
    if (!updated) return;
    try {
      const before = compileDesignDocument(adDetails, templateSettings, designSuggestion);
      const after = compileDesignDocument(adDetails, updatedTemplate, designSuggestion);
      let history = designHistory || createDesignHistory(before);
      const replayed = replayDesignHistory(history);
      if (designDocumentFingerprint(replayed) !== designDocumentFingerprint(before)) history = appendDesignHistory(history, replayed, before, 'تحديث إعدادات التصميم');
      history = appendDesignHistory(history, before, after, 'تغيير حجم المنتج');
      if (designDocumentFingerprint(replayDesignHistory(history)) !== designDocumentFingerprint(after)) throw new Error('تعذر حفظ تغيير حجم المنتج في سجل التصميم.');
      saveToStorage(StorageKeys.DESIGN_HISTORY, history);
      setDesignHistory(history);
      setDesignRedoEntries([]);
    } catch (error) {
      toast.message(error instanceof Error ? error.message : 'تم تحديث الحجم، لكن تعذر إضافة العملية إلى سجل التصميم.');
    }
    setTemplateSettings(updatedTemplate);
  };

  const handleMerchantProfileCommit = (profile: MerchantProfile) => {
    const stored = saveMerchantProfile(profile);
    setMerchantProfile(stored);
    setAdDetails(current => ({
      ...current,
      storeName: stored.storeName || current.storeName,
      storePhone: stored.storePhone || current.storePhone,
      colors: stored.defaultColors.length > 0 ? stored.defaultColors : current.colors,
    }));
    toast.success('تم حفظ تفضيلات متجرك محلياً على هذا الهاتف.');
  };

  const handleMerchantProfileClear = () => {
    setMerchantProfile(clearMerchantProfile());
    toast.success('تم مسح ذاكرة المساعد المحلية من هذا الهاتف.');
  };

  const handleMerchantCommands = async (commands: MerchantCommand[]) => {
    const application = applyMerchantCommands(templateSettings, merchantProfile, commands);
    const nextDetails: AdDetails = { ...adDetails, ...application.detailsPatch };
    const templateChanged = JSON.stringify(application.template) !== JSON.stringify(templateSettings);
    const detailsChanged = JSON.stringify(nextDetails) !== JSON.stringify(adDetails);
    const appliedProfile = saveMerchantProfile(application.profile);
    setMerchantProfile(appliedProfile);
    if (application.applied.length === 0) {
      toast.message('لم نغير التصميم: الطلب غير مدعوم حالياً وسُجل كتجميعة محلية بلا إرسال.');
      return true;
    }
    if (!templateChanged && !detailsChanged) return true;
    if (!generatedAd || !(lastVisualSource || productImage)) {
      if (templateChanged) setTemplateSettings(application.template);
      if (detailsChanged) setAdDetails(nextDetails);
      toast.success('تم حفظ التغيير المسموح للإعلان التالي محلياً.');
      return true;
    }
    const updated = await regenerateWithCurrentSettings(application.template, 'طبق المساعد التغييرات المسموحة وأعاد فحص الإعلان محلياً.', nextDetails);
    if (!updated) return false;
    try {
      const before = compileDesignDocument(adDetails, templateSettings, designSuggestion);
      const after = compileDesignDocument(nextDetails, application.template, designSuggestion);
      let history = designHistory || createDesignHistory(before);
      const replayed = replayDesignHistory(history);
      if (designDocumentFingerprint(replayed) !== designDocumentFingerprint(before)) history = appendDesignHistory(history, replayed, before, 'تحديث إعدادات التصميم');
      history = appendDesignHistory(history, before, after, 'تطبيق أمر مساعد محلي');
      if (designDocumentFingerprint(replayDesignHistory(history)) !== designDocumentFingerprint(after)) throw new Error('تعذر حفظ أمر المساعد في سجل التصميم.');
      saveToStorage(StorageKeys.DESIGN_HISTORY, history);
      setDesignHistory(history);
      setDesignRedoEntries([]);
    } catch (error) {
      toast.message(error instanceof Error ? error.message : 'طُبق الأمر، لكن تعذر إضافته إلى سجل التصميم.');
    }
    setTemplateSettings(application.template);
    setAdDetails(nextDetails);
    return true;
  };

  const evaluateCurrentQualityGate = async () => {
    const document = compileDesignDocument(adDetails, templateSettings, designSuggestion);
    const contract = evaluateDesignContract(document);
    const benchmark = designBenchmarks.find(item => item.template === templateSettings.size);
    const pixelTruth = await inspectRenderedPixelTruth(generatedAd, document);
    const report = evaluateDesignQuality(document, contract, adDetails, benchmark, pixelTruth);
    setDesignContractReport(contract);
    setQualityGateReport(report);
    return report;
  };

  const handleCheckQualityGate = async () => {
    if (!generatedAd || isCheckingQualityGate) return;
    setIsCheckingQualityGate(true);
    try {
      const report = await evaluateCurrentQualityGate();
      if (canExportDesign(report)) toast.success('اجتاز الإعلان بوابة جودة التصدير محلياً.');
      else toast.error('أوقفت بوابة الجودة التصدير حتى إصلاح الخطأ الهندسي الحرج.');
    } catch {
      toast.error('تعذر فحص بوابة جودة التصدير محلياً. أعد التوليد ثم حاول مرة أخرى.');
    } finally {
      setIsCheckingQualityGate(false);
    }
  };

  const ensureExportAllowed = async () => {
    if (!generatedAd) return false;
    try {
      const report = await evaluateCurrentQualityGate();
      if (canExportDesign(report)) return true;
      toast.error('تم إيقاف الحفظ والمشاركة: أصلح الخطأ الهندسي الحرج أولاً.');
      return false;
    } catch {
      toast.error('تعذر التحقق من جودة التصميم قبل التصدير. أعد التوليد ثم حاول مرة أخرى.');
      return false;
    }
  };

  const handleDownload = async () => {
    if (!generatedAd) return;
    if (!(await ensureExportAllowed())) return;
    try {
      downloadImage(generatedAd, `${adDetails.productName.trim() || 'إعلان-ملابس'}-${Date.now()}.png`);
      toast.success('تم حفظ تصميم PNG. افتح التنزيلات أو المعرض لإرساله في واتساب.');
    } catch {
      toast.error('تعذّر تنزيل الإعلان. حاول مرة أخرى.');
    }
  };

  const handleCreatePassport = async () => {
    if (!generatedAd || isCreatingPassport) return;
    setIsCreatingPassport(true);
    try {
      const passport = await createDesignPassport(generatedAd, templateSettings, designSuggestion);
      setDesignPassport(passport);
      toast.success('اكتمل فحص جودة الإعلان محلياً. يمكنك حفظ الجواز الاختياري الآن.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر فحص نتيجة الإعلان محلياً. أعد التوليد ثم حاول مرة أخرى.');
    } finally {
      setIsCreatingPassport(false);
    }
  };

  const handleCheckDesignContract = () => {
    if (!generatedAd || isCheckingDesignContract) return;
    setIsCheckingDesignContract(true);
    try {
      const document = compileDesignDocument(adDetails, templateSettings, designSuggestion);
      const persisted = designHistory || getFromStorage<DesignHistoryDocument>(StorageKeys.DESIGN_HISTORY);
      let history = persisted ? parseDesignHistory(serializeDesignHistory(persisted)) : createDesignHistory(document);
      const replayed = replayDesignHistory(history);
      if (designDocumentFingerprint(replayed) !== designDocumentFingerprint(document)) {
        history = appendDesignHistory(history, replayed, document, 'تحديث إعدادات التصميم');
        setDesignRedoEntries([]);
      }
      const confirmed = replayDesignHistory(history);
      if (designDocumentFingerprint(confirmed) !== designDocumentFingerprint(document)) throw new Error('تعذر إثبات إعادة تشغيل التصميم.');
      saveToStorage(StorageKeys.DESIGN_HISTORY, history);
      setDesignHistory(history);
      const report = evaluateDesignContract(confirmed);
      setDesignContractReport(report);
      setQualityGateReport(evaluateDesignQuality(confirmed, report, adDetails, designBenchmarks.find(item => item.template === confirmed.template)));
      if (report.status === 'pass') toast.success('اجتاز التصميم عقد الهندسة المحلي للمقاس الحالي.');
      else toast.message('وجد عقد التصميم موضعاً يحتاج مراجعة أو إصلاحاً اختيارياً.');
    } catch {
      toast.error('تعذر فحص عقد التصميم محلياً. أعد توليد الإعلان ثم حاول مرة أخرى.');
    } finally {
      setIsCheckingDesignContract(false);
    }
  };

  const handleVisualRepair = async () => {
    if (!generatedAd || visualRepairStatus === 'repairing') return;
    setVisualRepairStatus('repairing');
    try {
      const currentReport = qualityGateReport || await evaluateCurrentQualityGate();
      const headerBlocked = currentReport.pixelTruth?.checks.some(check => check.id === 'header' && check.status === 'block');
      if (!headerBlocked) {
        setVisualRepairStatus('blocked');
        toast.message('الإصلاح التلقائي متاح فقط عندما يكون التباين الحرج في عنوان الإعلان.');
        return;
      }
      const source = lastVisualSource || productImage;
      if (!source) throw new Error('لا تتوفر صورة القطعة لإعادة الرسم.');
      const sourceResponse = await fetch(generatedAd);
      const originalBlob = await sourceResponse.blob();
      if (!sourceResponse.ok || !originalBlob.type.startsWith('image/')) throw new Error('تعذر حفظ معاينة الإعلان الأصلية للتراجع.');
      const repairedTemplate = applyDesignRepair(templateSettings, 'restore-readable-background');
      const dimensions = getCanvasDimensions(repairedTemplate.size);
      const output = await withTimeout(
        renderAd(adDetails, repairedTemplate, source, { ...dimensions, visualMode: tryOnResult.transparentSubject === 'person' ? 'transparentPerson' : 'garment', garmentTransform: repairedTemplate.smartGarmentTransform }),
        15_000,
        'انتهت مهلة إعادة رسم إصلاح العنوان.'
      );
      const document = compileDesignDocument(adDetails, repairedTemplate, designSuggestion);
      const contract = evaluateDesignContract(document);
      const pixelTruth = await inspectRenderedPixelTruth(output, document);
      const report = evaluateDesignQuality(document, contract, adDetails, designBenchmarks.find(item => item.template === repairedTemplate.size), pixelTruth);
      if (!canExportDesign(report)) {
        URL.revokeObjectURL(output);
        setVisualRepairStatus('blocked');
        toast.error('أُعيد الرسم والفحص، لكن الإصلاح لم ينجح؛ أبقينا الإعلان الأصلي والتصدير محجوباً.');
        return;
      }
      setVisualRepairSnapshot({ templateSettings, generatedAdBlob: originalBlob, qualityGateReport: currentReport, designContractReport, marketingText });
      setTemplateSettings(repairedTemplate);
      setGeneratedAd(output);
      setDesignContractReport(contract);
      setQualityGateReport(report);
      setVisualRepairStatus('verified');
      toast.success('نجح إصلاح العنوان بعد إعادة الرسم وفحص البكسلات والهندسة محلياً.');
    } catch (error) {
      setVisualRepairStatus('failed');
      toast.error(error instanceof Error ? error.message : 'تعذر إكمال إصلاح العنوان؛ بقي الإعلان الأصلي كما هو.');
    }
  };

  const handleApplyContractRepair = (repairId: DesignRepairId) => {
    if (repairId === 'restore-readable-background') {
      void handleVisualRepair();
      return;
    }
    try {
      const before = compileDesignDocument(adDetails, templateSettings, designSuggestion);
      const repairedTemplate = applyDesignRepair(templateSettings, repairId);
      const after = compileDesignDocument(adDetails, repairedTemplate, designSuggestion);
      const history = appendDesignHistory(designHistory || createDesignHistory(before), before, after, 'إصلاح هندسي آمن');
      const replayed = replayDesignHistory(history);
      if (designDocumentFingerprint(replayed) !== designDocumentFingerprint(after)) throw new Error('تعذر التحقق من إصلاح التصميم.');
      saveToStorage(StorageKeys.DESIGN_HISTORY, history);
      setDesignHistory(history);
      setDesignRedoEntries([]);
      setTemplateBeforeContractRepair(templateSettings);
      setTemplateSettings(repairedTemplate);
      const report = evaluateDesignContract(replayed);
      setDesignContractReport(report);
      setQualityGateReport(null);
      toast.success('تم تطبيق الإصلاح وتحقق سجل التصميم منه. أعد توليد الإعلان لتحديث PNG.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تطبيق إصلاح عقد التصميم.');
    }
  };

  const applyReplayedHistory = (history: DesignHistoryDocument, message: string) => {
    const replayed = replayDesignHistory(history);
    setTemplateSettings(current => applyDesignDocument(current, replayed));
    saveToStorage(StorageKeys.DESIGN_HISTORY, history);
    setDesignHistory(history);
    setDesignContractReport(evaluateDesignContract(replayed));
    setQualityGateReport(null);
    toast.success(message);
  };

  const handleUndoHistory = () => {
    if (!designHistory) return;
    try {
      const result = undoDesignHistory(designHistory);
      if (!result.removed) return;
      setDesignRedoEntries(current => [...current, result.removed!]);
      applyReplayedHistory(result.history, 'تم التراجع عن آخر عملية تصميم محلياً. أعد التوليد لتحديث الصورة.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر التراجع عن سجل التصميم.'); }
  };

  const handleRedoHistory = () => {
    if (!designHistory || !designRedoEntries.length) return;
    try {
      const entry = designRedoEntries[designRedoEntries.length - 1];
      const history = redoDesignHistory(designHistory, entry);
      setDesignRedoEntries(current => current.slice(0, -1));
      applyReplayedHistory(history, 'تمت إعادة عملية التصميم. أعد التوليد لتحديث الصورة.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذرت إعادة العملية من سجل التصميم.'); }
  };

  const handleReplayHistory = () => {
    if (!designHistory) return;
    try { applyReplayedHistory(designHistory, 'أعيد تشغيل التصميم من سجله الدلالي بنجاح. أعد التوليد لتحديث الصورة.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'تعذرت إعادة تشغيل سجل التصميم.'); }
  };

  const handleRemoveHistoryEntry = (id: number) => {
    if (!designHistory) return;
    try {
      const history = removeDesignHistoryEntry(designHistory, id);
      setDesignRedoEntries([]);
      applyReplayedHistory(history, 'تم حذف العملية وإعادة بناء حالة التصميم بأمان. أعد التوليد لتحديث الصورة.');
    } catch { toast.error('لا يمكن حذف هذه العملية لأنها تعتمد عليها عملية لاحقة في السجل.'); }
  };

  const handleUndoContractRepair = () => {
    if (!templateBeforeContractRepair) return;
    setTemplateSettings(templateBeforeContractRepair);
    setTemplateBeforeContractRepair(null);
    setDesignContractReport(null);
    setQualityGateReport(null);
    toast.success('تم التراجع عن إصلاح عقد التصميم.');
  };

  const handleUndoVisualRepair = () => {
    if (!visualRepairSnapshot) return;
    const restoredAd = URL.createObjectURL(visualRepairSnapshot.generatedAdBlob);
    setTemplateSettings(visualRepairSnapshot.templateSettings);
    setGeneratedAd(restoredAd);
    setQualityGateReport(visualRepairSnapshot.qualityGateReport);
    setDesignContractReport(visualRepairSnapshot.designContractReport);
    setMarketingText(visualRepairSnapshot.marketingText);
    setVisualRepairSnapshot(null);
    setVisualRepairStatus('undone');
    toast.success('أعيدت إعدادات الإعلان والصورة الأصلية قبل إصلاح العنوان.');
  };

  const handleDownloadPassport = () => {
    if (!designPassport) return;
    const blob = new Blob([passportToJson(designPassport)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      downloadImage(url, passportFilename(adDetails.productName));
      toast.success('تم حفظ جواز الجودة بصيغة JSON في التنزيلات.');
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    }
  };

  const handleWhatsApp = async () => {
    if (!generatedAd) return;
    if (!(await ensureExportAllowed())) return;
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
    if (!(await ensureExportAllowed())) return;
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
          {friendTestMode ? <span className="h-11 w-11" aria-hidden="true" /> : <button type="button" onClick={() => setActiveView('messages')} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-white text-primary shadow-sm transition hover:bg-primary/5 active:scale-95" aria-label="رسائل المشروع"><MessageCircle size={20} /></button>}
          <div className="min-w-0 text-center"><h1 className="text-[15px] font-black leading-5 tracking-tight text-primary sm:text-xl">استوديو إعلانات الملابس</h1><p className="mt-0.5 text-[10px] font-bold text-muted-foreground">صمّم إعلانك بخطوات سهلة</p></div>
          <button type="button" onClick={() => setActiveView('settings')} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm transition hover:bg-primary/5 active:scale-95" aria-label="الإعدادات"><img src={LOGO_URL} alt="شعار التطبيق" className="h-full w-full object-contain" /></button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-5 sm:pt-8">
        {friendTestMode && activeView === 'create' && <div className="mb-5 w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-right text-sm leading-6 text-amber-950"><span className="font-black">وضع اختبار مؤقت: </span>يمكنك إنشاء إعلان محلي وتجربة الواجهة. لا تتوفر لوحة المطور أو الرسائل أو الخدمات السحابية في هذا الوضع.</div>}
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
            onDeveloper={friendTestMode ? undefined : () => setActiveView('developer')}
          /></React.Suspense>)}

        {activeView === 'assistant' && <React.Suspense fallback={<PageLoading label="جارٍ فتح مساعد التاجر…" />}><MerchantAssistantWorkspace profile={merchantProfile} template={templateSettings} onCommitProfile={handleMerchantProfileCommit} onApplyCommands={handleMerchantCommands} onClearProfile={handleMerchantProfileClear} /></React.Suspense>}

        {activeView === 'batch' && <React.Suspense fallback={<PageLoading label="جارٍ فتح مساحة الدفعة…" />}><BatchWorkspace details={adDetails} template={templateSettings} onDetailsChange={setAdDetails} onBack={() => setActiveView('create')} generateCloudText={friendTestMode ? undefined : (details, preferences, variant) => marketingTextMutation.mutateAsync({ details, preferences, variant })} /></React.Suspense>}

        {!friendTestMode && activeView === 'messages' && <React.Suspense fallback={<PageLoading label="جارٍ فتح الرسائل…" />}><PersonalMessageCenter onBack={() => setActiveView('create')} /></React.Suspense>}

        {activeView === 'about' && (
          <React.Suspense fallback={<PageLoading label="جارٍ فتح حول التطبيق…" />}>
            <AboutApp onBack={() => setActiveView('settings')} />
          </React.Suspense>
        )}

        {!friendTestMode && activeView === 'developer' && (
          <React.Suspense fallback={<PageLoading label="جارٍ فتح لوحة المطور…" />}>
            <DeveloperWorkspace onBack={() => setActiveView('create')} />
          </React.Suspense>
        )}

        {!friendTestMode && activeView === 'create' && announcementQuery.data && (
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
              <SingleImageReview image={productImage} suggestion={designSuggestion} comparisonPreviews={comparisonPreviews} isDesignAnalyzing={isDesignAnalyzing} localPreparation={localPreparation} benchmarks={designBenchmarks} regression={designRegression} selectedSize={selectedSuggestedSize} currentSize={templateSettings.size} preferenceEnabled={preferenceProfile.enabled} accepted={Boolean(templateBeforeSuggestion)} onSelectSize={setSelectedSuggestedSize} onAcceptSuggestion={acceptDesignSuggestion} onIgnoreSuggestion={ignoreDesignSuggestion} onUndoSuggestion={undoDesignSuggestion} onTogglePreferences={() => setPreferenceProfile(current => setPreferenceEnabled(current, !current.enabled))} onClearPreferences={() => { setPreferenceProfile(clearPreferenceProfile()); toast.success('تم مسح تفضيلات المصمم من هذا الهاتف.'); }} onImageSelect={handleImageSelect} onImageRemove={handleImageRemove} onContinue={() => { setIsReviewingImage(false); setCurrentStep('details'); toast.success('الصورة جاهزة. أضف بيانات الإعلان التي تريدها.'); }} />
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

            <React.Suspense fallback={<PageLoading label="جارٍ تجهيز حقول الإعلان…" />}><AdDetailsForm details={adDetails} onChange={setAdDetails} generateCloudText={friendTestMode ? undefined : (details, preferences, variant) => marketingTextMutation.mutateAsync({ details, preferences, variant })} /></React.Suspense>

            <div className="reference-local-note mt-5"><BadgeCheck size={18} />سيجهّز التطبيق الخلفية والنص تلقائياً على الهاتف.</div>

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
                <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={isGenerating} onClick={() => { void regenerateWithCurrentSettings(); }} className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"><RotateCcw size={16} />{isGenerating ? 'جارٍ التحديث' : 'إعادة توليد بالتغييرات الجديدة'}</button><button
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
                  <ProductScaleControl scale={clampProductScale(templateSettings.productScale)} disabled={isGenerating} onCommit={handleProductScaleCommit} />
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
                {designPassport && <DesignPassportCard passport={designPassport} onDownload={handleDownloadPassport} />}
                {designContractReport && <DesignContractCard report={designContractReport} onApplyRepair={handleApplyContractRepair} historyEntries={(designHistory?.entries || []).map(entry => ({ id: entry.id, label: entry.label }))} historyFingerprint={designHistory ? designDocumentFingerprint(replayDesignHistory(designHistory)) : undefined} canUndoHistory={Boolean(designHistory?.entries.length)} canRedoHistory={Boolean(designRedoEntries.length)} onReplayHistory={handleReplayHistory} onUndoHistory={handleUndoHistory} onRedoHistory={handleRedoHistory} onRemoveHistoryEntry={handleRemoveHistoryEntry} />}
                {qualityGateReport && <React.Suspense fallback={null}><DesignQualityGateCard report={qualityGateReport} onApplyRepair={handleApplyContractRepair} visualRepairStatus={visualRepairStatus} onUndoVisualRepair={visualRepairSnapshot ? handleUndoVisualRepair : undefined} /></React.Suspense>}
                <React.Suspense fallback={<PageLoading label="جارٍ تجهيز خيارات المشاركة…" />}><SharePanel onDownload={handleDownload} onShare={handleShare} onWhatsApp={handleWhatsApp} onQualityCheck={handleCreatePassport} onContractCheck={handleCheckDesignContract} onExportGateCheck={handleCheckQualityGate} isQualityChecking={isCreatingPassport} isContractChecking={isCheckingDesignContract} isExportGateChecking={isCheckingQualityGate} exportBlocked={qualityGateReport?.exportAllowed === false} onEdit={() => setCurrentStep('details')} onClear={clearAdSession} /></React.Suspense>
              </>
            )}
          </section>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ece8f0] bg-[#fdfbf8]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl" aria-label="التنقل الرئيسي">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
          <button type="button" onClick={() => setActiveView('settings')} aria-current={activeView === 'settings' ? 'page' : undefined} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs transition active:scale-95 ${activeView === 'settings' ? 'bg-primary/10 text-primary' : 'font-medium text-muted-foreground hover:bg-primary/5'}`}><Settings size={20} />الإعدادات</button>
          <button type="button" onClick={() => setActiveView('batch')} aria-current={activeView === 'batch' ? 'page' : undefined} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs transition active:scale-95 ${activeView === 'batch' ? 'bg-primary/10 text-primary' : 'font-medium text-muted-foreground hover:bg-primary/5'}`}><Images size={20} />دفعات</button>
          <button type="button" onClick={() => setActiveView('assistant')} aria-current={activeView === 'assistant' ? 'page' : undefined} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs transition active:scale-95 ${activeView === 'assistant' ? 'bg-primary/10 text-primary' : 'font-medium text-muted-foreground hover:bg-primary/5'}`}><Bot size={20} />المساعد</button>
          <button type="button" onClick={() => setActiveView('create')} aria-current={activeView === 'create' ? 'page' : undefined} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs transition active:scale-95 ${activeView === 'create' ? 'bg-primary/10 text-primary shadow-sm' : 'font-medium text-muted-foreground hover:bg-primary/5'}`}><span className={`flex h-9 w-9 items-center justify-center rounded-full ${activeView === 'create' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-white text-muted-foreground'}`}><Sparkles size={19} /></span>إنشاء</button>
        </div>
      </nav>
    </div>
  );
}

function PageLoading({ label }: { label: string }) {
  return <div className="rounded-[28px] border border-primary/10 bg-white p-8 text-center shadow-[0_16px_40px_rgba(37,35,95,0.08)]"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LoaderCircle className="animate-spin" size={22} /></div><p className="text-sm font-black text-primary">{label}</p><p className="mt-1 text-xs text-muted-foreground">لا تغلق الصفحة، ستظهر أدواتك خلال لحظات.</p></div>;
}

function ProductScaleControl({ scale, disabled, onCommit }: { scale: number; disabled: boolean; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(scale);
  useEffect(() => setDraft(scale), [scale]);
  const commit = (value: number) => {
    const next = clampProductScale(value);
    setDraft(next);
    onCommit(next);
  };
  return <section className="mt-4 rounded-2xl border border-primary/10 bg-secondary/[0.18] p-4" dir="rtl" aria-label="حجم المنتج داخل الإعلان">
    <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-primary">حجم المنتج</h3><p className="mt-1 text-xs text-muted-foreground">اسحب للتحكم؛ يعاد رسم الإعلان محلياً فقط بعد الإفلات.</p></div><span className="rounded-xl bg-white px-3 py-2 text-sm font-black text-primary">{Math.round(draft * 100)}%</span></div>
    <div className="mt-4 flex items-center gap-3"><button type="button" disabled={disabled || draft <= PRODUCT_SCALE_MIN} onClick={() => commit(draft - PRODUCT_SCALE_STEP)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-primary shadow-sm disabled:opacity-50">أصغر</button><Slider value={[draft]} min={PRODUCT_SCALE_MIN} max={PRODUCT_SCALE_MAX} step={PRODUCT_SCALE_STEP} disabled={disabled} onValueChange={values => setDraft(clampProductScale(values[0] || DEFAULT_PRODUCT_SCALE))} onValueCommit={values => commit(values[0] || DEFAULT_PRODUCT_SCALE)} aria-label="تكبير أو تصغير المنتج" /><button type="button" disabled={disabled || draft >= PRODUCT_SCALE_MAX} onClick={() => commit(draft + PRODUCT_SCALE_STEP)} className="rounded-xl bg-primary px-3 py-2 text-sm font-black text-primary-foreground disabled:opacity-50">أكبر</button></div>
    {draft !== DEFAULT_PRODUCT_SCALE && <button type="button" disabled={disabled} onClick={() => commit(DEFAULT_PRODUCT_SCALE)} className="mt-3 text-xs font-black text-primary disabled:opacity-50">إعادة الحجم المحسّن</button>}
  </section>;
}

function clampProductScale(value?: number) {
  const safe = Number.isFinite(value) ? Number(value) : DEFAULT_PRODUCT_SCALE;
  const stepped = Math.round(safe / PRODUCT_SCALE_STEP) * PRODUCT_SCALE_STEP;
  return Math.min(PRODUCT_SCALE_MAX, Math.max(PRODUCT_SCALE_MIN, Number(stepped.toFixed(2))));
}

function SingleImageReview({ image, suggestion, comparisonPreviews, isDesignAnalyzing, localPreparation, benchmarks, regression, selectedSize, currentSize, preferenceEnabled, accepted, onSelectSize, onAcceptSuggestion, onIgnoreSuggestion, onUndoSuggestion, onTogglePreferences, onClearPreferences, onImageSelect, onImageRemove, onContinue }: { image: string; suggestion: DesignSuggestion | null; comparisonPreviews: { current: string; suggested: string } | null; isDesignAnalyzing: boolean; localPreparation: { status: 'idle' | 'analyzing' | 'ready' | 'failed'; cache?: 'hit' | 'miss'; elapsedMs?: number }; benchmarks: DesignBenchmark[]; regression: DesignRegression | null; selectedSize: TemplateSize; currentSize: TemplateSize; preferenceEnabled: boolean; accepted: boolean; onSelectSize: (size: TemplateSize) => void; onAcceptSuggestion: () => void; onIgnoreSuggestion: () => void; onUndoSuggestion: () => void; onTogglePreferences: () => void; onClearPreferences: () => void; onImageSelect: (imageUrl: string) => void; onImageRemove: () => void; onContinue: () => void }) {
  return <div className="space-y-5">
    <div className="rounded-2xl border border-primary/10 bg-primary/[0.045] p-4">
      <div className="flex items-start gap-3"><BadgeCheck size={20} className="mt-0.5 shrink-0 text-primary" /><div><h3 className="text-sm font-black text-primary">راجع الصورة قبل المتابعة</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">تأكد أن قطعة الملابس واضحة. يمكنك تغيير الصورة أو حذفها والعودة للرفع.</p></div></div>
    </div>
    <ImageUploader onImageSelect={onImageSelect} currentImage={image} onImageRemove={onImageRemove} />
    {isDesignAnalyzing && <div className="rounded-2xl bg-primary/[.05] p-4 text-center text-sm font-bold text-primary"><LoaderCircle className="ml-2 inline animate-spin" size={17} />يحلل المصمم المحلي الصورة على هذا الهاتف…</div>}
    {localPreparation.status === 'ready' && <div className="rounded-xl bg-primary/[.05] px-3 py-2 text-center text-xs font-bold text-primary">{localPreparation.cache === 'hit' ? 'تمت استعادة تحليل محلي محفوظ للصورة نفسها' : 'اكتمل تحليل الجودة والألوان والتخطيط محلياً'}{typeof localPreparation.elapsedMs === 'number' && ` خلال ${localPreparation.elapsedMs}ms`}</div>}
    {localPreparation.status === 'failed' && <div className="rounded-xl bg-primary/[.05] px-3 py-2 text-center text-xs font-bold text-primary">تعذر التحليل المسبق؛ يمكنك متابعة إنشاء الإعلان محلياً كالمعتاد.</div>}
    {suggestion && <LocalDesignSuggestionCard suggestion={suggestion} selectedSize={selectedSize} currentSize={currentSize} onSelectSize={onSelectSize} onAccept={onAcceptSuggestion} onIgnore={onIgnoreSuggestion} onUndo={onUndoSuggestion} accepted={accepted} preferencesEnabled={preferenceEnabled} onTogglePreferences={onTogglePreferences} onClearPreferences={onClearPreferences} comparisonPreviews={comparisonPreviews} benchmarks={benchmarks} regression={regression} />}
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
