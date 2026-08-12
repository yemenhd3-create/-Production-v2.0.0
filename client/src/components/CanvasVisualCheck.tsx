import { useEffect, useState } from 'react';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS } from '@shared/types';
import { renderAd } from '@/lib/canvasRenderer';

const demoImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><rect width="600" height="900" fill="white"/><path d="M165 150h270l80 520H85z" fill="#D01720"/><path d="M225 150c0-70 150-70 150 0" fill="none" stroke="#2A2865" stroke-width="28"/><path d="M135 440h330" stroke="#2A2865" stroke-width="26"/></svg>`)}`;

export default function CanvasVisualCheck() {
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    renderAd({ ...DEFAULT_AD_DETAILS, productName: 'فستان بلوشي أنيق', discount: '30', price: '3000', quantity: '10', colors: ['أبيض'], features: ['قطن ناعم ومريح', 'خامة عالية الجودة'], storeName: 'متجر مروان', storePhone: '770976559' }, DEFAULT_TEMPLATE_SETTINGS, demoImage, { width: 1080, height: 1350 })
      .then(url => { if (active) setPreviewUrl(url); else URL.revokeObjectURL(url); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'تعذر إنشاء المعاينة'); });
    return () => { active = false; if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, []);

  return <main className="min-h-screen bg-[#fffdf6] p-5 text-center" dir="rtl"><h1 className="text-xl font-black text-[#2A2865]">فحص بصري محلي لقالب الإعلان</h1><p className="mt-2 text-sm text-slate-600">1080×1350 · Cairo 900 / 53px للعنوان · إطار 28px · علامة الجودة 72×72px</p>{error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{previewUrl ? <img src={previewUrl} alt="معاينة قالب Canvas المرجعية" className="mx-auto mt-5 w-full max-w-[540px] rounded-xl shadow-xl" /> : <p className="mt-8 text-slate-500">جارٍ توليد المعاينة…</p>}</main>;
}
