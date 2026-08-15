import { Check, Crop, Move, X } from 'lucide-react';
import * as React from 'react';
import { drawArtworkCrop, type ArtworkCropAdjustment, type ArtworkCropFit } from '@/lib/artworkCrop';

const TARGET = { width: 1080, height: 1350, label: 'مساحة الإعلان العمودية 1080 × 1350' };

const fitOptions: Array<{ value: ArtworkCropFit; label: string; detail: string }> = [
  { value: 'cover', label: 'قص وملء', detail: 'يملأ المساحة ويقص الزائد' },
  { value: 'contain', label: 'احتواء', detail: 'يحفظ الصورة كاملة' },
  { value: 'stretch', label: 'مط', detail: 'يمدد الصورة للمساحة' },
];

interface GarmentCropEditorProps {
  source: string;
  onSave: (dataUrl: string) => void;
  onUseOriginal: () => void;
  onCancel?: () => void;
  title?: string;
  itemLabel?: string;
}

export default function GarmentCropEditor({ source, onSave, onUseOriginal, onCancel, title = 'اقصص الصورة قبل التجهيز', itemLabel }: GarmentCropEditorProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const [imageReady, setImageReady] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [adjustment, setAdjustment] = React.useState<ArtworkCropAdjustment>({ fit: 'cover', positionX: 0, positionY: 0, zoom: 1 });

  const renderPreview = React.useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageReady) return;
    canvas.width = TARGET.width;
    canvas.height = TARGET.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    drawArtworkCrop(context, image, TARGET.width, TARGET.height, adjustment);
  }, [adjustment, imageReady]);

  React.useEffect(() => { renderPreview(); }, [renderPreview]);

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageReady) return;
    setIsSaving(true);
    renderPreview();
    await new Promise(resolve => window.setTimeout(resolve, 0));
    onSave(canvas.toDataURL('image/png'));
    setIsSaving(false);
  };

  const setFit = (fit: ArtworkCropFit) => setAdjustment(current => ({ ...current, fit, zoom: fit === 'stretch' ? 1 : current.zoom }));

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-stone-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="قص صورة الملابس قبل التجهيز">
      <section className="mx-auto my-4 w-full max-w-xl rounded-[28px] bg-white p-5 shadow-2xl sm:p-7" dir="rtl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary"><Crop size={15} /> قبل إزالة الخلفية</span>
            <h2 className="mt-3 text-xl font-black text-foreground">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">اقصص أي جزء غير مرغوب فيه حتى يركز العزل المحلي على قطعة الملابس فقط.</p>
            {itemLabel && <p className="mt-1 text-xs font-black text-primary">{itemLabel}</p>}
          </div>
          {onCancel && <button type="button" onClick={onCancel} className="rounded-xl bg-secondary p-2 text-primary" aria-label="إغلاق القص"><X size={20} /></button>}
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100" style={{ aspectRatio: `${TARGET.width} / ${TARGET.height}` }}>
          <canvas ref={canvasRef} className="h-full w-full object-contain" aria-label={`معاينة ${TARGET.label}`} />
          <img ref={imageRef} src={source} alt="الصورة المختارة للقص" className="hidden" onLoad={() => setImageReady(true)} />
        </div>
        <p className="mt-2 text-center text-xs font-bold text-muted-foreground">لا تُحذف الصورة الأصلية من هاتفك؛ تحفظ نسخة مقصوصة داخل هذه العملية فقط.</p>

        <div className="mt-5 grid grid-cols-3 gap-2">{fitOptions.map(option => <button key={option.value} type="button" onClick={() => setFit(option.value)} className={`rounded-xl border p-3 text-right transition active:scale-95 ${adjustment.fit === option.value ? 'border-primary bg-primary text-primary-foreground' : 'border-stone-200 bg-white text-primary'}`}><span className="block text-xs font-black">{option.label}</span><span className={`mt-1 block text-[10px] leading-4 ${adjustment.fit === option.value ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{option.detail}</span></button>)}</div>

        {adjustment.fit !== 'stretch' && <div className="mt-5 rounded-2xl bg-secondary/65 p-4"><div className="mb-3 flex items-center gap-2 text-primary"><Move size={17} /><span className="text-sm font-black">اضبط حدود القص</span></div><label className="block text-xs font-bold text-muted-foreground">تحريك أفقي<input className="mt-2 w-full accent-primary" type="range" min="-1" max="1" step="0.05" value={adjustment.positionX} onChange={event => setAdjustment(current => ({ ...current, positionX: Number(event.target.value) }))} /></label><label className="mt-3 block text-xs font-bold text-muted-foreground">تحريك عمودي<input className="mt-2 w-full accent-primary" type="range" min="-1" max="1" step="0.05" value={adjustment.positionY} onChange={event => setAdjustment(current => ({ ...current, positionY: Number(event.target.value) }))} /></label><label className="mt-3 block text-xs font-bold text-muted-foreground">تكبير منطقة الملابس<input className="mt-2 w-full accent-primary" type="range" min="1" max="2.5" step="0.05" value={adjustment.zoom} onChange={event => setAdjustment(current => ({ ...current, zoom: Number(event.target.value) }))} /></label></div>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" disabled={!imageReady || isSaving} onClick={save} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-black text-primary-foreground transition active:scale-[.98] disabled:opacity-50"><Check size={20} />{isSaving ? 'جارٍ حفظ القص…' : 'حفظ القص والمتابعة'}</button><button type="button" disabled={isSaving} onClick={onUseOriginal} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-black text-primary transition active:scale-[.98]">استخدام الصورة كاملة</button></div>
      </section>
    </div>
  );
}

export { TARGET as GARMENT_CROP_TARGET };
