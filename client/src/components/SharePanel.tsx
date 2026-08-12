import * as React from 'react';
import { Download, Eraser, MessageCircle, Pencil, Send } from 'lucide-react';

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
      <button type="button" onClick={onDownload} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground transition active:scale-[0.98]"><Download size={19} /> حفظ PNG في الهاتف</button>
      <button type="button" onClick={onShare} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-secondary px-3 text-sm font-black text-primary transition active:scale-[0.98]"><Send size={19} /> مشاركة</button>
      <button type="button" onClick={onWhatsApp} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 text-sm font-black text-white transition active:scale-[0.98]"><MessageCircle size={19} /> واتساب</button>
      <button type="button" onClick={onEdit} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-primary/15 bg-white px-3 text-sm font-black text-primary transition active:scale-[0.98]"><Pencil size={19} /> تعديل</button>
      <button type="button" onClick={onClear} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 text-sm font-black text-red-700 transition active:scale-[0.98]"><Eraser size={18} /> مسح جلسة الإعلان وبدء تصميم جديد</button>
    </section>
  );
}
