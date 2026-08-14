import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ModelPreviewTransform } from '@shared/types';
import { Camera, LoaderCircle, Move, RotateCcw, SlidersHorizontal, UserRound, X } from 'lucide-react';
import { prepareImageFile } from './ImageUploader';
import { composeLocalModelPreview, DEFAULT_MODEL_PREVIEW_TRANSFORM, detectPersonPoseLocally, formatPoseModelSize, type LocalPoseStage } from '@/lib/localModelPreview';

interface LocalModelPreviewComposerProps {
  garmentImage: string;
  enabled: boolean;
  personImage: string;
  previewImage: string;
  transform: ModelPreviewTransform;
  onEnabledChange: (enabled: boolean) => void;
  onPersonImageChange: (imageUrl: string) => void;
  onTransformChange: (transform: ModelPreviewTransform) => void;
  onPreviewChange: (imageUrl: string) => void;
}

const stageMessages: Record<LocalPoseStage, string> = {
  downloading: `جارٍ تنزيل نموذج الوضعية المحلي (${formatPoseModelSize()}) للمرة الأولى…`,
  loading: 'جارٍ تجهيز محلل وضعية العارض على الهاتف…',
  detecting: 'جارٍ تحديد الكتفين والجذع محلياً…',
};

export default function LocalModelPreviewComposer({ garmentImage, enabled, personImage, previewImage, transform, onEnabledChange, onPersonImageChange, onTransformChange, onPreviewChange }: LocalModelPreviewComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [notice, setNotice] = useState('ارفع صورة عارض واضحة أو استخدم وضع القطعة العادي. لا تُرسل هذه الصورة إلى أي خدمة في هذا الوضع.');

  useEffect(() => {
    if (!enabled || !personImage || !garmentImage) return;
    let active = true;
    setIsComposing(true);
    void composeLocalModelPreview(personImage, garmentImage, transform)
      .then(imageUrl => { if (active) onPreviewChange(imageUrl); })
      .catch(() => { if (active) setNotice('تعذر تركيب المعاينة محلياً. جرّب صورة أصغر أو عد إلى وضع القطعة العادي.'); })
      .finally(() => { if (active) setIsComposing(false); });
    return () => { active = false; };
  }, [enabled, garmentImage, onPreviewChange, personImage, transform]);

  const choosePersonImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || isPreparing) return;
    setIsPreparing(true);
    try {
      const imageUrl = await prepareImageFile(file);
      onPersonImageChange(imageUrl);
      onEnabledChange(true);
      setNotice('جارٍ اقتراح موضع القطعة وفق صورة العارض. ستبقى أدوات التعديل اليدوي متاحة دائماً.');
      try {
        const pose = await detectPersonPoseLocally(imageUrl, stage => setNotice(stageMessages[stage]));
        if (pose.transform) onTransformChange(pose.transform);
        setNotice(pose.message);
      } catch {
        setNotice('تعذر تحليل وضعية العارض محلياً، لكن يمكنك وضع القطعة يدوياً.');
      }
    } catch {
      setNotice('تعذرت قراءة صورة العارض من الهاتف. جرّب حفظ نسخة منها ثم اخترها من جديد.');
    } finally {
      setIsPreparing(false);
    }
  };

  const update = (field: keyof ModelPreviewTransform, rawValue: number) => onTransformChange({ ...transform, [field]: rawValue });

  return <section className="mt-5 rounded-3xl border border-violet-200 bg-violet-50/70 p-4 text-right">
    <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { void choosePersonImage(event.target.files); event.currentTarget.value = ''; }} />
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><UserRound size={19} /></div>
      <div className="min-w-0 flex-1"><h3 className="text-sm font-black text-violet-950">معاينة على عارض — محلية</h3><p className="mt-1 text-xs leading-5 text-violet-900">تركيب بصري تعليمي يساعدك في عرض القطعة. ليس تلبيساً فوتوغرافياً ولا يغيّر صورة الشخص بذكاء اصطناعي.</p></div>
      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-black text-violet-950"><input type="checkbox" checked={enabled} onChange={event => onEnabledChange(event.target.checked)} className="h-5 w-5 accent-primary" />تفعيل</label>
    </div>
    <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
      <button type="button" disabled={isPreparing} onClick={() => inputRef.current?.click()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-sm transition active:scale-[.98] disabled:opacity-60"><Camera size={17} />{isPreparing ? 'جارٍ تجهيز العارض…' : personImage ? 'تغيير صورة العارض' : 'اختيار صورة عارض'}</button>
      {personImage && <button type="button" onClick={() => { onPersonImageChange(''); onEnabledChange(false); setNotice('أزيلت صورة العارض. سيعود الإعلان إلى وضع القطعة المعتاد.'); }} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-3 text-red-700 shadow-sm transition active:scale-95" aria-label="إزالة صورة العارض"><X size={18} /></button>}
    </div>
    {personImage && <div className="mt-4 grid grid-cols-[100px_1fr] gap-3 rounded-2xl border border-violet-100 bg-white/80 p-3"><div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-stone-100"><img src={previewImage || personImage} alt="معاينة العارض المحلية" className="h-full w-full object-cover" />{isComposing && <span className="absolute inset-0 flex items-center justify-center bg-white/65 text-primary"><LoaderCircle className="animate-spin" size={20} /></span>}</div><div className="min-w-0"><p className="mb-2 flex items-center gap-1 text-xs font-black text-primary"><Move size={14} />ضبط القطعة يدوياً</p><TransformControl label="الموضع الأفقي" value={transform.x} min={0.1} max={0.9} step={0.01} onChange={value => update('x', value)} /><TransformControl label="الموضع الرأسي" value={transform.y} min={0.1} max={0.9} step={0.01} onChange={value => update('y', value)} /><TransformControl label="حجم القطعة" value={transform.scale} min={0.25} max={1} step={0.01} onChange={value => update('scale', value)} /><TransformControl label="الميل" value={transform.rotation} min={-20} max={20} step={1} onChange={value => update('rotation', value)} /><button type="button" onClick={() => onTransformChange(DEFAULT_MODEL_PREVIEW_TRANSFORM)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-primary"><RotateCcw size={13} />إعادة الضبط</button></div></div>}
    <p className="mt-3 rounded-2xl bg-white/70 p-3 text-[11px] leading-5 text-violet-900" aria-live="polite"><SlidersHorizontal className="ml-1 inline" size={13} />{notice}</p>
  </section>;
}

function TransformControl({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="mt-2 block"><span className="mb-1 flex justify-between text-[10px] font-bold text-muted-foreground"><span>{label}</span><span dir="ltr">{value.toFixed(step < 1 ? 2 : 0)}</span></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} className="h-2 w-full accent-primary" /></label>;
}
