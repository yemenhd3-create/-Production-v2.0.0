import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react';
import { removeBackgroundLocally, type LocalRemovalStage } from '@/lib/localBackgroundRemoval';

const SAMPLE_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800"><rect width="640" height="800" fill="#e4dfd8"/><circle cx="320" cy="130" r="82" fill="#f0c6a5"/><path d="M170 270c42-75 258-75 300 0l58 315H112z" fill="#c9151d"/><path d="M213 270c24 35 65 53 107 53s83-18 107-53" fill="none" stroke="#7e0d15" stroke-width="18"/><path d="M112 585h416v135H112z" fill="#c9151d"/></svg>`)}`;

export default function LocalBackgroundVisualCheck() {
  const [stage, setStage] = useState<LocalRemovalStage | 'idle' | 'done' | 'failed'>('idle');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const localResult = await removeBackgroundLocally(SAMPLE_IMAGE, setStage);
        setResult(localResult.imageUrl);
        setStage('done');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unknown local model error');
        setStage('failed');
      }
    })();
  }, []);

  return <main dir="rtl" className="min-h-screen bg-[#fffaf4] p-5 text-foreground"><section className="mx-auto max-w-2xl rounded-[28px] bg-white p-6 shadow-[0_16px_40px_rgba(37,35,95,0.08)]"><h1 className="text-2xl font-black text-primary">فحص U2NetP المحلي</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">معاينة تطويرية: نموذج ملابس اصطناعي يثبت تحميل نموذج ONNX وتصدير PNG شفاف داخل المتصفح فقط.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><ImagePanel label="الصورة الأصلية" source={SAMPLE_IMAGE} /><ImagePanel label="الناتج المحلي" source={result} transparent /></div><div className="mt-6 rounded-2xl bg-secondary/60 p-4 text-sm font-bold text-primary">{stage === 'failed' ? <span className="flex items-center gap-2 text-red-700"><CircleAlert size={18} /> فشل التشغيل: {error}</span> : stage === 'done' ? <span className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={18} /> نجح تشغيل النموذج المحلي وإنشاء PNG شفاف.</span> : <span className="flex items-center gap-2"><LoaderCircle className="animate-spin" size={18} /> المرحلة الحالية: {stage}</span>}</div></section></main>;
}

function ImagePanel({ label, source, transparent = false }: { label: string; source: string; transparent?: boolean }) {
  return <section><h2 className="mb-2 text-sm font-black text-primary">{label}</h2><div className={`aspect-[4/5] overflow-hidden rounded-2xl border border-stone-200 ${transparent ? 'bg-[linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] [background-size:18px_18px] [background-position:0_0,0_9px,9px_-9px,-9px_0px]' : 'bg-stone-100'}`}>{source ? <img src={source} alt={label} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">بانتظار النموذج…</div>}</div></section>;
}
