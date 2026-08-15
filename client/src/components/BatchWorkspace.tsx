import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { AdDetails, BatchAdItem, BatchMarketingTextMode, MarketingTextPreferences, TemplateSettings } from '@shared/types';
import { BATCH_MAX_IMAGES } from '@shared/types';
import { AlertTriangle, ArrowDown, ArrowUp, Download, Eraser, Images, LoaderCircle, PauseCircle, Play, Plus, RefreshCw, Share2, X } from 'lucide-react';
import AdDetailsForm from './AdDetailsForm';
import { prepareImageFile } from './ImageUploader';
import { createBatchDraft, createBatchItem, getBatchProgress, limitBatchFiles, reorderBatchItems } from '@/lib/batchQueue';
import { cleanExpiredBatchDrafts, deleteBatchDraft, getBatchStorageEstimate, loadBatchAsset, loadBatchDrafts, requestPersistentBatchStorage, saveBatchAsset, saveBatchDraft } from '@/lib/batchStorage';
import { renderAd } from '@/lib/canvasRenderer';
import { getCanvasDimensions } from '@shared/adWorkflow';
import { removeBackgroundLocally, type LocalRemovalStage } from '@/lib/localBackgroundRemoval';
import { downloadImage, shareViaWebAPI } from '@/lib/share';
import { generateLocalMarketingText, resolveMarketingTextPreferences } from '@shared/marketingText';
import GarmentCropEditor from './GarmentCropEditor';

interface BatchWorkspaceProps {
  details: AdDetails;
  template: TemplateSettings;
  onDetailsChange: (details: AdDetails) => void;
  onBack: () => void;
  previewItems?: BatchAdItem[];
  generateCloudText?: (details: AdDetails, preferences: MarketingTextPreferences, variant: number) => Promise<{ text: string }>;
}

type BatchMeta = { id: string; createdAt: number; expiresAt: number };

export function getSafeBatchParallelism() {
  const cores = typeof navigator === 'undefined' ? 2 : navigator.hardwareConcurrency || 2;
  return cores >= 8 ? 3 : 2;
}

export async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  let cursor = 0;
  const processNext = async () => {
    while (true) {
      const itemIndex = cursor;
      cursor += 1;
      if (itemIndex >= items.length) return;
      await worker(items[itemIndex], itemIndex);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => processNext()));
}

function getLocalBatchStageMessage(stage: LocalRemovalStage) {
  const labels: Record<LocalRemovalStage, string> = {
    downloading: 'يُحمّل محرك الإزالة المحلي…',
    loading: 'يُجهّز محرك الإزالة على الهاتف…',
    processing: 'يفصل الملابس عن الخلفية…',
    finishing: 'يحضّر PNG شفافاً…',
  };
  return labels[stage];
}

export default function BatchWorkspace({ details, template, onDetailsChange, onBack, previewItems = [], generateCloudText }: BatchWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stopRequestedRef = useRef(false);
  const metaRef = useRef<BatchMeta | null>(null);
  const itemsRef = useRef<BatchAdItem[]>(previewItems);
  const hydratedUrlsRef = useRef<string[]>([]);
  const [items, setItems] = useState<BatchAdItem[]>(previewItems);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const useLocalRemoval = true;
  const [marketingTextMode, setMarketingTextMode] = useState<BatchMarketingTextMode>('shared');
  const [pendingCrop, setPendingCrop] = useState<{ source: string; file: File; index: number; total: number } | null>(null);
  const pendingCropResolver = useRef<((value: string) => void) | null>(null);
  const [notice, setNotice] = useState('اختر حتى 10 صور. ستُعالج واحدة تلو الأخرى للحفاظ على سرعة الهاتف.');

  useEffect(() => {
    let active = true;
    void (async () => {
      await cleanExpiredBatchDrafts();
      const drafts = await loadBatchDrafts();
      const latest = drafts.sort((first, second) => second.updatedAt - first.updatedAt)[0];
      if (!latest || !active) return;
      const restoredItems = await Promise.all(latest.items.map(async item => {
        const sourceBlob = await loadBatchAsset(`${latest.id}:source:${item.id}`);
        const outputBlob = item.outputUrl ? await loadBatchAsset(`${latest.id}:output:${item.id}`) : null;
        const sourceUrl = sourceBlob ? URL.createObjectURL(sourceBlob) : item.sourceUrl;
        const outputUrl = outputBlob ? URL.createObjectURL(outputBlob) : item.outputUrl;
        if (sourceBlob) hydratedUrlsRef.current.push(sourceUrl);
        if (outputBlob && outputUrl) hydratedUrlsRef.current.push(outputUrl);
        return { ...item, sourceUrl, thumbnailUrl: sourceUrl, outputUrl, status: item.status === 'processing' || item.status === 'preparing' ? 'stopped' : item.status } as BatchAdItem;
      }));
      if (!active) return;
      metaRef.current = { id: latest.id, createdAt: latest.createdAt, expiresAt: latest.expiresAt };
      itemsRef.current = restoredItems;
      setItems(restoredItems);
      setMarketingTextMode(latest.marketingTextMode || 'shared');
      setNotice(`استعدنا آخر دفعة مؤقتة (${restoredItems.length} صور). انتهت أي معالجة سابقة بأمان ويمكنك إكمالها أو تنظيفها.`);
    })();
    return () => {
      active = false;
      hydratedUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      hydratedUrlsRef.current = [];
    };
  }, []);

  const persist = async (
    nextItems: BatchAdItem[],
    localRemoval = true,
    textMode = marketingTextMode
  ) => {
    if (!metaRef.current) return;
    await saveBatchDraft({
      id: metaRef.current.id,
      createdAt: metaRef.current.createdAt,
      updatedAt: Date.now(),
      expiresAt: metaRef.current.expiresAt,
      details,
      template,
      useLocalBackgroundRemoval: localRemoval,
      marketingTextMode: textMode,
      items: nextItems,
    });
  };

  const applyItems = (nextItems: BatchAdItem[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
    void persist(nextItems);
  };

  const ensureMeta = () => {
    if (metaRef.current) return metaRef.current;
    const draft = createBatchDraft({ details, template, useLocalBackgroundRemoval: useLocalRemoval, items: [] });
    metaRef.current = { id: draft.id, createdAt: draft.createdAt, expiresAt: draft.expiresAt };
    return metaRef.current;
  };

  const requestBatchCrop = (source: string, file: File, index: number, total: number) => new Promise<string>(resolve => {
    pendingCropResolver.current = resolve;
    setPendingCrop({ source, file, index, total });
  });

  const resolveBatchCrop = (value: string) => {
    pendingCropResolver.current?.(value);
    pendingCropResolver.current = null;
    setPendingCrop(null);
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || isPreparing || isRunning) return;
    const accepted = Array.from(fileList).filter(file => file.type.startsWith('image/'));
    const selected = limitBatchFiles(accepted, itemsRef.current.length);
    if (accepted.length > selected.length) setNotice(`يمكن إضافة ${BATCH_MAX_IMAGES} صور كحد أقصى في الدفعة الحالية. احتفظنا بأول ${selected.length} صورة مناسبة.`);
    if (!selected.length) return;

    const estimate = await getBatchStorageEstimate();
    if (estimate?.quota && estimate?.usage && estimate.quota - estimate.usage < selected.length * 1_500_000) {
      setNotice('مساحة التخزين المتاحة في الهاتف منخفضة لهذه الدفعة. نظّف الدفعات القديمة أو اختر صوراً أقل.');
      return;
    }

    setIsPreparing(true);
    setNotice('جارٍ تجهيز الصور وتصغيرها بالتتابع…');
    const meta = ensureMeta();
    const newItems: BatchAdItem[] = [];
    for (let fileIndex = 0; fileIndex < selected.length; fileIndex += 1) {
      const file = selected[fileIndex];
      try {
        const preparedUrl = await prepareImageFile(file);
        setNotice(`راجع قص الصورة ${fileIndex + 1} من ${selected.length} قبل إضافتها للدفعة.`);
        const sourceUrl = await requestBatchCrop(preparedUrl, file, fileIndex + 1, selected.length);
        if (sourceUrl !== preparedUrl) URL.revokeObjectURL(preparedUrl);
        const item = createBatchItem(file.name, sourceUrl);
        const blob = await fetch(sourceUrl).then(response => response.blob());
        await saveBatchAsset(`${meta.id}:source:${item.id}`, blob, meta.id);
        newItems.push(item);
      } catch {
        newItems.push({ ...createBatchItem(file.name, ''), status: 'failed', error: 'تعذر تجهيز هذه الصورة من الهاتف.' });
      }
    }
    const next = [...itemsRef.current, ...newItems];
    applyItems(next);
    await requestPersistentBatchStorage();
    setIsPreparing(false);
    setNotice(`الدفعة جاهزة: ${next.filter(item => item.status === 'ready').length} صورة تنتظر المعالجة.`);
  };

  const removeItem = (id: string) => {
    if (isRunning) return;
    const removed = itemsRef.current.find(item => item.id === id);
    if (removed?.sourceUrl.startsWith('blob:')) URL.revokeObjectURL(removed.sourceUrl);
    if (removed?.outputUrl?.startsWith('blob:')) URL.revokeObjectURL(removed.outputUrl);
    applyItems(itemsRef.current.filter(item => item.id !== id));
  };

  const updateItemInMemory = (id: string, patch: Partial<BatchAdItem>) => {
    const next = itemsRef.current.map(item => item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item);
    itemsRef.current = next;
    setItems(next);
    return next;
  };

  const updateItem = (id: string, patch: Partial<BatchAdItem>) => {
    const next = updateItemInMemory(id, patch);
    void persist(next);
    return next;
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (isRunning) return;
    applyItems(reorderBatchItems(itemsRef.current, index, direction));
  };

  const processBatch = async (retryFailed = false) => {
    if (isRunning || !itemsRef.current.length) return;
    stopRequestedRef.current = false;
    setIsRunning(true);
    const candidates = itemsRef.current.filter(item => retryFailed ? item.status === 'failed' : item.status === 'ready');
    if (!candidates.length) {
      setIsRunning(false);
      setNotice(retryFailed ? 'لا توجد صور فاشلة لإعادة المحاولة.' : 'لا توجد صور جاهزة للمعالجة.');
      return;
    }
    const parallelism = Math.min(getSafeBatchParallelism(), candidates.length);
    setNotice(`بدأت إزالة الخلفية محلياً لـ ${candidates.length} صورة بالتوازي الآمن (${parallelism} صور في الوقت نفسه).`);
    await runWithConcurrency(candidates, parallelism, async (item, itemIndex) => {
        if (stopRequestedRef.current) {
          updateItem(item.id, { status: 'stopped', progressMessage: '' });
          return;
        }
        updateItem(item.id, { status: 'processing', error: '', progressMessage: 'ينتظر دوره في المعالجة المحلية…' });
        try {
          const itemDetails = resolveBatchItemDetails(details, item);
          const preferences = resolveMarketingTextPreferences(itemDetails.marketingPreferences);
          const localText = generateLocalMarketingText(itemDetails, preferences, itemIndex + 1).text;
          let itemMarketingText = marketingTextMode === 'shared'
            ? (details.marketingText.trim() || localText)
            : (item.marketingText?.trim() || localText);

          if (marketingTextMode === 'perItem' && details.marketingTextEngine === 'cloud' && generateCloudText && !item.marketingText?.trim()) {
            try {
              const cloudText = await generateCloudText({ ...itemDetails, marketingText: '' }, preferences, itemIndex + 1);
              itemMarketingText = cloudText.text;
            } catch {
              // القالب المحلي أعلاه هو البديل الفوري عند عدم اتصال الخدمة.
            }
          }
          const result = await removeBackgroundLocally(item.sourceUrl, stage => {
            updateItemInMemory(item.id, { progressMessage: getLocalBatchStageMessage(stage) });
          });
          updateItemInMemory(item.id, { progressMessage: 'يرسم الإعلان النهائي…' });
          const dimensions = getCanvasDimensions(template.size);
          const outputUrl = await renderAd(itemDetails, template, result.imageUrl, { ...dimensions, visualMode: 'garment' });
          const blob = await fetch(outputUrl).then(response => response.blob());
          const meta = ensureMeta();
          await saveBatchAsset(`${meta.id}:output:${item.id}`, blob, meta.id);
          updateItem(item.id, { status: 'success', outputUrl, usedLocalRemoval: true, marketingText: itemMarketingText, progressMessage: '' });
        } catch (error) {
          updateItem(item.id, { status: 'failed', progressMessage: '', error: error instanceof Error ? error.message : 'تعذرت معالجة الصورة محلياً.' });
        }
    });
    setIsRunning(false);
    const progress = getBatchProgress(itemsRef.current);
    setNotice(`اكتملت الدفعة. راجع النتائج الناجحة وأعد محاولة العناصر الفاشلة عند الحاجة. (${progress.completed}/${progress.total})`);
  };

  const cleanBatch = async () => {
    if (isRunning) return;
    for (const item of itemsRef.current) {
      if (item.sourceUrl.startsWith('blob:')) URL.revokeObjectURL(item.sourceUrl);
      if (item.outputUrl?.startsWith('blob:')) URL.revokeObjectURL(item.outputUrl);
    }
    if (metaRef.current) await deleteBatchDraft(metaRef.current.id);
    await cleanExpiredBatchDrafts();
    metaRef.current = null;
    itemsRef.current = [];
    setItems([]);
    setNotice('نُظفت الدفعة المؤقتة من هذا الهاتف. بقيت إعدادات القالب والشعار والتذييل محفوظة.');
  };

  const progress = getBatchProgress(items);
  const successful = items.filter(item => item.status === 'success');
  const failed = items.filter(item => item.status === 'failed');

  return <section className="space-y-5" dir="rtl">
    <div className="reference-card p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3"><div><span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><Images size={15} /> وضع الدفعة</span><h2 className="mt-3 text-2xl font-black text-foreground">إنشاء عدة إعلانات</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">من 1 إلى {BATCH_MAX_IMAGES} صور. يزيل التطبيق الخلفية محلياً بالتوازي الآمن من دون إرسال الصور للخارج.</p></div><button type="button" onClick={onBack} className="rounded-xl bg-secondary px-3 py-2 text-xs font-black text-primary">عودة للإنشاء الفردي</button></div>
      <div className="mt-5 rounded-2xl border border-primary/10 bg-primary/[.04] p-4 text-sm leading-6 text-primary"><span className="font-black">حالة الدفعة: </span>{notice}</div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={event => { void handleFiles(event.target.files); event.currentTarget.value = ''; }} />
      <button type="button" disabled={isPreparing || isRunning || items.length >= BATCH_MAX_IMAGES} onClick={() => inputRef.current?.click()} className="reference-primary mt-4 w-full"><Plus size={20} />{isPreparing ? 'جارٍ تجهيز الصور…' : `إضافة صور إلى الدفعة (${items.length}/${BATCH_MAX_IMAGES})`}</button>
      <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">بعد الاختيار يفتح القص لكل صورة على حدة، ثم يمكنك كتابة اسم المنتج الخاص بها.</p>
    </div>

    {items.length > 0 && <>
      <section className="reference-card p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-black text-primary">بيانات عامة للدفعة</h3><p className="mt-1 text-xs text-muted-foreground">تستخدم كاقتراح أولي، ويمكن تعديل الاسم والسعر والخصم داخل بطاقة كل صورة.</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{items.length} صور</span></div><AdDetailsForm details={details} onChange={onDetailsChange} generateCloudText={generateCloudText} /><button type="button" disabled={isRunning || !details.productName.trim()} onClick={() => { const next = itemsRef.current.map(item => ({ ...item, details: { ...item.details, productName: details.productName, price: details.price, discount: details.discount } })); applyItems(next); setNotice('نُسخت البيانات الأساسية إلى كل صورة. يمكنك تعديل أي بطاقة منفردة.'); }} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/15 bg-white px-3 text-xs font-black text-primary disabled:opacity-50">نسخ الاسم والسعر والخصم إلى كل الصور</button><section className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4"><h4 className="text-sm font-black text-violet-950">سياسة النص التسويقي للدفعة</h4><p className="mt-1 text-xs leading-5 text-violet-900">اختر نصاً واحداً لكل النتائج، أو صياغة مستقلة لكل صورة. النص المستقل يعالج بالترتيب نفسه ويحفظ مع النتيجة.</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={isRunning} onClick={() => { setMarketingTextMode('shared'); void persist(items, useLocalRemoval, 'shared'); }} className={`min-h-11 rounded-xl px-2 text-xs font-black transition active:scale-95 disabled:opacity-50 ${marketingTextMode === 'shared' ? 'bg-primary text-primary-foreground' : 'bg-white text-primary ring-1 ring-violet-200'}`}>نص مشترك</button><button type="button" disabled={isRunning} onClick={() => { setMarketingTextMode('perItem'); void persist(items, useLocalRemoval, 'perItem'); }} className={`min-h-11 rounded-xl px-2 text-xs font-black transition active:scale-95 disabled:opacity-50 ${marketingTextMode === 'perItem' ? 'bg-primary text-primary-foreground' : 'bg-white text-primary ring-1 ring-violet-200'}`}>نص مستقل لكل صورة</button></div>{marketingTextMode === 'perItem' && <p className="mt-3 text-[11px] leading-5 text-violet-900">سيبتكر التطبيق نسخاً محلية متنوعة تلقائياً؛ وإذا اخترت التحسين السحابي للنص فستُنفّذ الطلبات واحدة تلو الأخرى ثم تُحفظ مع نتائجها.</p>}</section><div className="reference-local-note mt-4 justify-start text-right"><span><span className="block text-sm font-black text-primary">إزالة الخلفية محلياً لكل صورة</span><span className="mt-1 block text-xs leading-5 text-primary/80">تعمل بالتوازي الآمن حسب قدرة الهاتف ولا ترسل الصور إلى أي خدمة خارجية.</span></span></div></section>

      <section className="reference-card p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-black text-primary">مراجعة الصور</h3><p className="mt-1 text-xs text-muted-foreground">رتّب الصور بسهمي الأعلى والأسفل قبل البدء. لا تُحذف إعدادات القالب عند تنظيف الدفعة.</p></div><span className="text-xs font-black text-primary">{items.length} / {BATCH_MAX_IMAGES} صور</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((item, index) => <BatchItemCard key={item.id} item={item} sharedDetails={details} index={index} total={items.length} disabled={isRunning} onMove={direction => moveItem(index, direction)} onRemove={() => removeItem(item.id)} onDownload={() => item.outputUrl && downloadImage(item.outputUrl, `إعلان-${index + 1}.png`)} onShare={() => { if (!item.outputUrl) return; const itemDetails = resolveBatchItemDetails(details, item); void shareViaWebAPI(item.outputUrl, `إعلان ${index + 1}`, item.marketingText || itemDetails.marketingText.trim() || generateLocalMarketingText(itemDetails).text); }} onItemDetailsChange={patch => updateItem(item.id, { details: { ...item.details, ...patch } })} onMarketingTextChange={text => updateItem(item.id, { marketingText: text })} />)}</div><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={isRunning} onClick={() => void processBatch()} className="reference-primary min-h-13 text-sm">{isRunning ? <LoaderCircle className="animate-spin" size={19} /> : <Play size={19} />}{isRunning ? 'جارٍ المعالجة…' : 'بدء تجهيز الصور'}</button><button type="button" disabled={!isRunning} onClick={() => { stopRequestedRef.current = true; setNotice('سيُوقف التطبيق الدفعة بعد إنهاء الصور الجارية حالياً.'); }} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-black text-primary disabled:opacity-50"><PauseCircle size={19} />إيقاف بعد الصور الجارية</button></div>{failed.length > 0 && <button type="button" disabled={isRunning} onClick={() => void processBatch(true)} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 text-sm font-black text-amber-900 disabled:opacity-50"><RefreshCw size={18} />إعادة محاولة {failed.length} عناصر فاشلة</button>}{successful.length > 0 && <p className="mt-3 text-center text-xs font-bold text-emerald-700">نجح إنشاء {successful.length} إعلاناً. استخدم الحفظ أو المشاركة تحت كل نتيجة.</p>}<button type="button" disabled={isRunning} onClick={() => void cleanBatch()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"><Eraser size={16} />تنظيف الدفعة من هذا الهاتف</button></section>
    </>}
    {pendingCrop && <GarmentCropEditor source={pendingCrop.source} title={`اقصص الصورة ${pendingCrop.index} من ${pendingCrop.total}`} itemLabel={pendingCrop.file.name} onSave={resolveBatchCrop} onUseOriginal={() => resolveBatchCrop(pendingCrop.source)} />}
  </section>;
}

function resolveBatchItemDetails(sharedDetails: AdDetails, item: BatchAdItem): AdDetails {
  return {
    ...sharedDetails,
    productName: item.details?.productName ?? sharedDetails.productName,
    headline: item.details?.headline ?? sharedDetails.headline,
    discount: item.details?.discount ?? sharedDetails.discount,
    price: item.details?.price ?? sharedDetails.price,
    quantity: item.details?.quantity ?? sharedDetails.quantity,
    colors: item.details?.colors ?? sharedDetails.colors,
  };
}

function BatchItemCard({ item, sharedDetails, index, total, disabled, onMove, onRemove, onDownload, onShare, onItemDetailsChange, onMarketingTextChange }: { item: BatchAdItem; sharedDetails: AdDetails; index: number; total: number; disabled: boolean; onMove: (direction: 'up' | 'down') => void; onRemove: () => void; onDownload: () => void; onShare: () => void; onItemDetailsChange: (patch: NonNullable<BatchAdItem['details']>) => void; onMarketingTextChange: (text: string) => void }) {
  const status = item.status === 'success' ? { label: 'جاهز', className: 'bg-emerald-100 text-emerald-800' } : item.status === 'failed' ? { label: 'فشل', className: 'bg-red-100 text-red-800' } : item.status === 'processing' ? { label: 'جارٍ العمل', className: 'bg-primary/10 text-primary' } : item.status === 'stopped' ? { label: 'متوقف', className: 'bg-stone-100 text-stone-700' } : { label: 'جاهز للبدء', className: 'bg-secondary text-muted-foreground' };
  return <article className="overflow-hidden rounded-2xl border border-stone-100 bg-stone-50"><div className="relative aspect-[4/5] bg-white"><img src={item.outputUrl || item.thumbnailUrl} alt={`الصورة ${index + 1} في الدفعة`} className="h-full w-full object-contain" />{!disabled && !item.outputUrl && <button type="button" onClick={onRemove} className="absolute left-2 top-2 rounded-lg bg-white/95 p-1.5 text-red-700 shadow-sm" aria-label={`حذف الصورة ${index + 1}`}><X size={15} /></button>}<span className={`absolute bottom-2 right-2 rounded-full px-2 py-1 text-[10px] font-black ${status.className}`}>{item.status === 'processing' && <LoaderCircle className="ml-1 inline animate-spin" size={11} />}{status.label}</span></div><div className="p-2"><div className="flex items-center gap-1"><p className="min-w-0 flex-1 truncate text-[11px] font-bold text-foreground">{item.fileName}</p>{!disabled && !item.outputUrl && <span className="flex shrink-0 gap-0.5"><button type="button" onClick={() => onMove('up')} disabled={index === 0} aria-label={`تحريك الصورة ${index + 1} للأعلى`} className="rounded p-1 text-primary disabled:opacity-30"><ArrowUp size={13} /></button><button type="button" onClick={() => onMove('down')} disabled={index === total - 1} aria-label={`تحريك الصورة ${index + 1} للأسفل`} className="rounded p-1 text-primary disabled:opacity-30"><ArrowDown size={13} /></button></span>}</div>{!item.outputUrl && <div className="mt-2 space-y-2"><label className="block"><span className="mb-1 block text-[10px] font-black text-primary">اسم المنتج لهذه الصورة</span><input value={item.details?.productName ?? sharedDetails.productName} onChange={event => onItemDetailsChange({ productName: event.target.value })} placeholder={`اسم الصورة ${index + 1}`} className="h-9 w-full rounded-lg border border-violet-200 bg-white px-2 text-right text-[11px] font-bold text-foreground outline-none focus:border-primary" aria-label={`اسم المنتج للصورة ${index + 1}`} /></label><div className="grid grid-cols-2 gap-1"><input value={item.details?.price ?? sharedDetails.price} onChange={event => onItemDetailsChange({ price: event.target.value })} placeholder="السعر" className="h-9 w-full rounded-lg border border-violet-200 bg-white px-2 text-right text-[11px] font-bold text-foreground outline-none focus:border-primary" aria-label={`سعر الصورة ${index + 1}`} /><input value={item.details?.discount ?? sharedDetails.discount} onChange={event => onItemDetailsChange({ discount: event.target.value })} placeholder="الخصم" className="h-9 w-full rounded-lg border border-violet-200 bg-white px-2 text-right text-[11px] font-bold text-foreground outline-none focus:border-primary" aria-label={`خصم الصورة ${index + 1}`} /></div></div>}{item.status === 'processing' && item.progressMessage && <p className="mt-2 rounded-lg bg-primary/10 px-2 py-1.5 text-[10px] font-bold leading-4 text-primary" aria-live="polite"><LoaderCircle className="ml-1 inline animate-spin" size={11} />{item.progressMessage}</p>}{item.error && <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-red-700"><AlertTriangle className="ml-1 inline" size={11} />{item.error}</p>}{item.outputUrl && <><label className="mt-2 block"><span className="mb-1 block text-[10px] font-bold text-primary">النص التسويقي</span><textarea value={item.marketingText || ''} onChange={event => onMarketingTextChange(event.target.value)} className="min-h-20 w-full rounded-lg border border-violet-200 bg-white p-2 text-right text-[10px] leading-4 text-foreground outline-none focus:border-primary" aria-label={`تعديل نص الإعلان ${index + 1}`} /></label><div className="mt-2 grid grid-cols-2 gap-1"><button type="button" onClick={onDownload} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-primary text-[10px] font-black text-white"><Download size={12} />حفظ</button><button type="button" onClick={onShare} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-white text-[10px] font-black text-primary shadow-sm"><Share2 size={12} />مشاركة</button></div></>}</div></article>;
}
