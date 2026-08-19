import { ExternalLink, Image, LaptopMinimal, ShieldCheck } from 'lucide-react';
import { OPEN_IMAGE_MODELS, OPEN_IMAGE_MODEL_STATUS, type OpenImageModelStatus } from '@/lib/openImageModels';

const COMFY_UI_URL = 'https://github.com/comfyanonymous/ComfyUI';

function statusClass(status: OpenImageModelStatus) {
  if (status === 'installed-local') return 'bg-emerald-50 text-emerald-700';
  if (status === 'external-trial') return 'bg-primary/10 text-primary';
  if (status === 'gpu-required') return 'bg-amber-50 text-amber-800';
  return 'bg-secondary text-muted-foreground';
}

export default function OpenImageModelsCatalog() {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(37,35,95,0.06)] sm:p-7" data-testid="open-image-models-catalog">
      <div className="flex items-start gap-3 text-primary"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10"><Image size={20} /></span><div><h3 className="font-black">Open Image Models</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">كتالوج تعليمي فقط: لا ينزّل أو يثبّت أو يشغّل أي نموذج تلقائياً.</p></div></div>
      <p className="mt-4 rounded-2xl bg-secondary/70 p-4 text-sm leading-6 text-muted-foreground"><span className="font-black text-primary">حالة هذا الهاتف:</span> إزالة الخلفية المحلية تعمل عبر U2NetP. أما النماذج الثقيلة وComfyUI وDiffusers فتحتاج جهازاً منفصلاً مع GPU؛ لا يغير هذا الكتالوج مسار التطبيق المحلي.</p>
      <details className="mt-4" open>
        <summary className="cursor-pointer text-sm font-black text-primary">عرض {OPEN_IMAGE_MODELS.length} نموذجاً وعائلة</summary>
        <div className="mt-4 space-y-3">
          {OPEN_IMAGE_MODELS.map(model => <article key={model.id} className="rounded-2xl border border-stone-100 p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="font-black text-foreground">{model.name}</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">{model.tasks.join(' · ')}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusClass(model.status)}`}>{OPEN_IMAGE_MODEL_STATUS[model.status]}</span></div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{model.notes}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs leading-5 text-muted-foreground"><p><b className="text-foreground">الترخيص:</b> {model.license}</p><p><b className="text-foreground">الاستخدام:</b> {model.commercialUse}</p><p><b className="text-foreground">الحجم:</b> {model.size}</p><p><b className="text-foreground">RAM:</b> {model.minimumRam}</p><p><b className="text-foreground">VRAM:</b> {model.minimumVram}</p><p><b className="text-foreground">محلياً:</b> {model.localUse}</p></div>
            <div className="mt-4 flex flex-wrap gap-2"><a href={model.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-black text-primary"><ExternalLink size={14} />المصدر</a>{model.comfyUi && <a href={COMFY_UI_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-black text-primary"><LaptopMinimal size={14} />دليل ComfyUI</a>}</div>
          </article>)}
        </div>
      </details>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 shrink-0 text-primary" size={15} />أي نموذج بحالة «مراجعة الترخيص» لا يوصف كمسموح تجارياً ولا يفعّل قبل تحقق مستقل من مصدره الرسمي.</p>
    </section>
  );
}
