import * as React from 'react';
import { Download, MessageCircle, Pencil, Send } from 'lucide-react';

interface SharePanelProps {
  onDownload: () => void;
  onShare: () => void;
  onWhatsApp: () => void;
  onEdit: () => void;
}

export default function SharePanel({ onDownload, onShare, onWhatsApp, onEdit }: SharePanelProps) {
  return (
    <section className="grid grid-cols-2 gap-3" dir="rtl" aria-label="خيارات الإعلان النهائي">
      <button type="button" onClick={onDownload} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground transition active:scale-[0.98]"><Download size={19} /> تنزيل PNG</button>
      <button type="button" onClick={onShare} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-secondary px-3 text-sm font-black text-primary transition active:scale-[0.98]"><Send size={19} /> مشاركة</button>
      <button type="button" onClick={onWhatsApp} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 text-sm font-black text-white transition active:scale-[0.98]"><MessageCircle size={19} /> واتساب</button>
      <button type="button" onClick={onEdit} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-primary/15 bg-white px-3 text-sm font-black text-primary transition active:scale-[0.98]"><Pencil size={19} /> تعديل</button>
    </section>
  );
}
