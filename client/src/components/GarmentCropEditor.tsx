import { Check, Crop } from 'lucide-react';
import * as React from 'react';

type CropRect = { x: number; y: number; width: number; height: number };
type DragMode = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type DragState = { mode: DragMode; startX: number; startY: number; initial: CropRect };

const MIN_CROP = 0.12;
const DEFAULT_CROP: CropRect = { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface GarmentCropEditorProps {
  source: string;
  onSave: (dataUrl: string) => void;
  onUseOriginal: () => void;
  title?: string;
  itemLabel?: string;
}

export function resizeCrop(initial: CropRect, mode: DragMode, dx: number, dy: number): CropRect {
  if (mode === 'move') return { ...initial, x: clamp(initial.x + dx, 0, 1 - initial.width), y: clamp(initial.y + dy, 0, 1 - initial.height) };
  const right = initial.x + initial.width;
  const bottom = initial.y + initial.height;
  if (mode === 'nw') { const x = clamp(initial.x + dx, 0, right - MIN_CROP); const y = clamp(initial.y + dy, 0, bottom - MIN_CROP); return { x, y, width: right - x, height: bottom - y }; }
  if (mode === 'n') { const y = clamp(initial.y + dy, 0, bottom - MIN_CROP); return { ...initial, y, height: bottom - y }; }
  if (mode === 'ne') { const y = clamp(initial.y + dy, 0, bottom - MIN_CROP); const width = clamp(initial.width + dx, MIN_CROP, 1 - initial.x); return { ...initial, y, width, height: bottom - y }; }
  if (mode === 'e') return { ...initial, width: clamp(initial.width + dx, MIN_CROP, 1 - initial.x) };
  if (mode === 'se') return { ...initial, width: clamp(initial.width + dx, MIN_CROP, 1 - initial.x), height: clamp(initial.height + dy, MIN_CROP, 1 - initial.y) };
  if (mode === 's') return { ...initial, height: clamp(initial.height + dy, MIN_CROP, 1 - initial.y) };
  if (mode === 'sw') { const x = clamp(initial.x + dx, 0, right - MIN_CROP); return { x, y: initial.y, width: right - x, height: clamp(initial.height + dy, MIN_CROP, 1 - initial.y) }; }
  const x = clamp(initial.x + dx, 0, right - MIN_CROP);
  return { x, y: initial.y, width: right - x, height: initial.height };
}

const handles: Array<{ mode: Exclude<DragMode, 'move'>; className: string; label: string }> = [
  { mode: 'nw', className: '-left-3 -top-3', label: 'زاوية القص العلوية اليمنى' },
  { mode: 'n', className: 'left-1/2 -top-3 -translate-x-1/2', label: 'حافة القص العلوية' },
  { mode: 'ne', className: '-right-3 -top-3', label: 'زاوية القص العلوية اليسرى' },
  { mode: 'e', className: '-right-3 top-1/2 -translate-y-1/2', label: 'حافة القص اليسرى' },
  { mode: 'se', className: '-bottom-3 -right-3', label: 'زاوية القص السفلية اليسرى' },
  { mode: 's', className: 'bottom-[-0.75rem] left-1/2 -translate-x-1/2', label: 'حافة القص السفلية' },
  { mode: 'sw', className: '-bottom-3 -left-3', label: 'زاوية القص السفلية اليمنى' },
  { mode: 'w', className: '-left-3 top-1/2 -translate-y-1/2', label: 'حافة القص اليمنى' },
];

export default function GarmentCropEditor({ source, onSave, onUseOriginal, title = 'اقصص الصورة قبل التجهيز', itemLabel }: GarmentCropEditorProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const [imageReady, setImageReady] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [crop, setCrop] = React.useState<CropRect>(DEFAULT_CROP);

  const startDrag = (event: React.PointerEvent, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode, startX: event.clientX, startY: event.clientY, initial: crop };
  };

  const moveDrag = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setCrop(resizeCrop(drag.initial, drag.mode, (event.clientX - drag.startX) / rect.width, (event.clientY - drag.startY) / rect.height));
  };

  const finishDrag = () => { dragRef.current = null; };

  const save = async () => {
    const image = imageRef.current;
    if (!image || !imageReady) return;
    setIsSaving(true);
    const sourceWidth = Math.max(1, Math.round(image.naturalWidth * crop.width));
    const sourceHeight = Math.max(1, Math.round(image.naturalHeight * crop.height));
    const canvas = document.createElement('canvas');
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const context = canvas.getContext('2d');
    if (!context) { setIsSaving(false); return; }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, Math.round(image.naturalWidth * crop.x), Math.round(image.naturalHeight * crop.y), sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
    await new Promise(resolve => window.setTimeout(resolve, 0));
    onSave(canvas.toDataURL('image/png'));
    setIsSaving(false);
  };

  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-stone-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="قص حر لصورة الملابس قبل التجهيز">
    <section className="mx-auto my-4 w-full max-w-xl rounded-[28px] bg-white p-5 shadow-2xl sm:p-7" dir="rtl">
      <div><span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary"><Crop size={15} /> قص حر قبل إزالة الخلفية</span><h2 className="mt-3 text-xl font-black text-foreground">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">اسحب داخل الإطار لتحريكه، ثم اسحب أي دائرة على الحواف أو الزوايا لتحديد الجزء الذي تريد الاحتفاظ به فقط.</p>{itemLabel && <p className="mt-1 text-xs font-black text-primary">{itemLabel}</p>}</div>
      <div ref={stageRef} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} className="relative mx-auto mt-5 w-full overflow-hidden rounded-2xl bg-stone-950 shadow-inner" style={{ touchAction: 'none' }}>
        <img ref={imageRef} src={source} alt="الصورة المختارة للقص" onLoad={() => setImageReady(true)} className="block h-auto w-full select-none" draggable={false} />
        {imageReady && <div onPointerDown={event => startDrag(event, 'move')} className="absolute cursor-grab border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,0.52)] active:cursor-grabbing" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%`, touchAction: 'none' }}>
          <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45 px-3 py-1 text-[10px] font-black text-white">اسحب لتغيير موضع القص</span>
          {handles.map(handle => <button key={handle.mode} type="button" aria-label={handle.label} onPointerDown={event => startDrag(event, handle.mode)} className={`absolute z-10 h-7 w-7 rounded-full border-2 border-primary bg-white shadow-md ${handle.className}`} style={{ touchAction: 'none' }} />)}
        </div>}
      </div>
      <p className="mt-3 text-center text-xs font-bold leading-5 text-muted-foreground">يظهر الجزء داخل الإطار فقط في الإعلان. لا تُحذف الصورة الأصلية من هاتفك.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" disabled={!imageReady || isSaving} onClick={() => void save()} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-black text-primary-foreground transition active:scale-[.98] disabled:opacity-50"><Check size={20} />{isSaving ? 'جارٍ حفظ القص…' : 'حفظ القص والمتابعة'}</button><button type="button" disabled={isSaving} onClick={onUseOriginal} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-black text-primary transition active:scale-[.98]">استخدام الصورة كاملة</button></div>
    </section>
  </div>;
}
