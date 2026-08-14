import * as React from 'react';
import { Download, Eraser, MessageCircle, Pencil, Send, Smartphone } from 'lucide-react';

interface SharePanelProps {
  onDownload: () => void;
  onShare: () => void;
  onWhatsApp: () => void;
  onEdit: () => void;
  onClear: () => void;
}

export default function SharePanel({ onDownload, onShare, onWhatsApp, onEdit, onClear }: SharePanelProps) {
  return (
    <section className="grid grid-cols-2 gap-3" dir="rtl" aria-label="خيارات الإعلان النهائي">
      <div className="col-span-2 rounded-2xl border border-primary/10 bg-gradient-to-l from-primary/10 to-violet-50 px-4 py-3"><div className="flex items-center gap-2 text-primary"><Smartphone size={17} /><p className="text-sm font-black">إعلانك جاهز للحفظ والمشاركة</p></div><p className="mt-1 text-xs leading-5 text-muted-foreground">احفظ PNG أولاً في هاتفك، ثم شاركه متى تريد. يظل التصميم قابلاً للتعديل.</p></div>
      <button type="button" onClick={onDownload} className="col-span-2 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 active:scale-[0.98]"><Download size={19} /> حفظ التصميم PNG في الهاتف</button>
      <button type="button" onClick={onWhatsApp} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 text-sm font-black text-white shadow-sm transition hover:bg-[#1eb85a] active:scale-[0.98]"><MessageCircle size={19} /> واتساب</button>
      <button type="button" onClick={onShare} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-secondary px-3 text-sm font-black text-primary transition hover:bg-primary/10 active:scale-[0.98]"><Send size={19} /> مشاركة أخرى</button>
      <button type="button" onClick={onEdit} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-primary/15 bg-white px-3 text-sm font-black text-primary transition hover:bg-primary/5 active:scale-[0.98]"><Pencil size={18} /> العودة لتعديل البيانات أو الإعدادات</button>
      <button type="button" onClick={onClear} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-3 text-xs font-black text-red-700 transition hover:bg-red-50 active:scale-[0.98]"><Eraser size={16} /> مسح جلسة الإعلان والبدء بإعلان جديد</button>
    </section>
  );
}
