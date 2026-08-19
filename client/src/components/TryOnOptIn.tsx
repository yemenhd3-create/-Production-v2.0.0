import type { TryOnPose, TryOnPresentation, TryOnResult } from '@shared/types';
import { LoaderCircle, ShieldCheck, Sparkles, X } from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';

export const KOLORS_EXPERIMENTAL_URL = 'https://kwai-kolors-kolors-virtual-try-on.hf.space/';

export type TryOnSelection = {
  presentation: TryOnPresentation;
  pose: TryOnPose;
};

type Props = {
  isRunning: boolean;
  preview: TryOnResult | null;
  onRequest: (selection: TryOnSelection) => void;
  onCancel: () => void;
  onAcceptPreview: () => void;
  onRejectPreview: () => void;
};

/** خيار شبكي صريح؛ يبقى الإعلان المحلي متاحاً حتى لو لم يفتحه المستخدم. */
export function TryOnOptIn({ isRunning, preview, onRequest, onCancel, onAcceptPreview, onRejectPreview }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [presentation, setPresentation] = useState<TryOnPresentation>('women-fashion');
  const [pose, setPose] = useState<TryOnPose>('studio-standing');
  const [consent, setConsent] = useState(false);

  if (preview?.imageUrl) {
    const canUseInCanvas = preview.isTransparent && preview.transparentSubject === 'person';
    return (
      <section className="rounded-3xl border border-primary/15 bg-white p-5 text-right shadow-sm" data-testid="tryon-preview">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles size={19} /></span>
          <div><h3 className="font-black text-primary">راجع نتيجة التلبيس أولاً</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">لم نضف هذه النتيجة إلى قالبك تلقائياً.</p></div>
        </div>
        <img src={preview.imageUrl} alt="معاينة نتيجة التلبيس الاختيارية" className="mt-4 max-h-[560px] w-full rounded-2xl bg-secondary object-contain" />
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{preview.message}</p>
        {!canUseInCanvas && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">هذه معاينة فقط لأن نتيجتها ليست PNG شفافة. أبقينا قالب الإعلان المحلي من دون تغيير.</p>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={onRejectPreview} className="rounded-2xl bg-secondary px-3 py-3 text-sm font-black text-primary transition active:scale-95">استخدم الصورة الأصلية</button>
          <button type="button" disabled={!canUseInCanvas} onClick={onAcceptPreview} className="rounded-2xl bg-primary px-3 py-3 text-sm font-black text-primary-foreground transition active:scale-95 disabled:opacity-50">استخدم داخل القالب</button>
        </div>
      </section>
    );
  }

  if (!expanded) {
    return <>
      <button type="button" onClick={() => setExpanded(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm font-black text-primary transition hover:bg-primary/5 active:scale-95" data-testid="tryon-open"><Sparkles size={18} />جرّب على نموذج افتراضي — اختياري</button>
      <a href={KOLORS_EXPERIMENTAL_URL} target="_blank" rel="noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm font-black text-primary transition hover:bg-primary/5 active:scale-95" data-testid="kolors-external-open"><Sparkles size={18} />تجربة Kolors المجانية خارج التطبيق — تحتاج صورة شخص وقطعة</a>
    </>;
  }

  return (
    <section className="mt-4 rounded-3xl border border-primary/15 bg-white p-5 text-right shadow-sm" data-testid="tryon-consent">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-black text-primary">جرّب القطعة على نموذج افتراضي</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">خدمة اختيارية منفصلة عن تجهيز إعلانك المحلي.</p></div>
        <button type="button" onClick={() => isRunning ? onCancel() : setExpanded(false)} className="rounded-xl p-2 text-muted-foreground active:scale-95" aria-label="إغلاق تجربة التلبيس"><X size={18} /></button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-black text-primary">فئة العرض<select value={presentation} onChange={event => setPresentation(event.target.value as TryOnPresentation)} className="mt-2 w-full rounded-xl border border-primary/15 bg-white p-3 text-sm font-bold text-foreground"><option value="women-fashion">أزياء نسائية</option><option value="men-fashion">أزياء رجالية</option><option value="kids-fashion">أزياء أطفال</option><option value="accessories">إكسسوارات</option></select></label>
        <label className="text-xs font-black text-primary">الوضعية<select value={pose} onChange={event => setPose(event.target.value as TryOnPose)} className="mt-2 w-full rounded-xl border border-primary/15 bg-white p-3 text-sm font-bold text-foreground"><option value="studio-standing">وقفة استوديو</option><option value="lifestyle-standing">وقفة طبيعية</option></select></label>
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-2xl bg-secondary/50 p-3 text-right text-xs leading-5 text-foreground"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" /><span><span className="font-black">أوافق صراحةً</span> على إرسال صورة القطعة إلى مزود FASHN لإنشاء معاينة تلبيس اختيارية. لا نرسل صورة وجه أو هوية شخصية في هذه الخطوة، ولا تتغير نتيجة الإعلان المحلي إلا بعد اعتمادي الصريح.</span></label>
      <div className="mt-4 flex gap-3">
        {isRunning ? <button type="button" onClick={onCancel} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-black text-primary active:scale-95"><X size={18} />إلغاء واستخدام المسار المحلي</button> : <button type="button" disabled={!consent} onClick={() => onRequest({ presentation, pose })} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition active:scale-95 disabled:opacity-50"><ShieldCheck size={18} />أوافق وأطلب المعاينة</button>}
      </div>
      {isRunning && <p className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-primary" aria-live="polite"><LoaderCircle size={16} className="animate-spin" />جارٍ طلب المعاينة الاختيارية. الإلغاء يمنع تطبيق أي نتيجة متأخرة.</p>}
    </section>
  );
}
