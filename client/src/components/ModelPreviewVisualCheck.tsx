import { CheckCircle2, Layers3, Move, Sparkles, UserRound } from 'lucide-react';

const illustration = '/manus-storage/model-preview-visual-check_7f7efbe1.svg';

export default function ModelPreviewVisualCheck() {
  return <main className="min-h-screen bg-[#fffdf6] p-4 text-right text-foreground sm:p-8" dir="rtl">
    <section className="mx-auto max-w-5xl">
      <div className="rounded-[30px] bg-primary p-6 text-primary-foreground shadow-[0_20px_50px_rgba(55,23,112,.25)]"><span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black"><Sparkles size={15} />فحص تطويري للهاتف</span><h1 className="mt-3 text-2xl font-black">معاينة العارض المحلية</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-primary-foreground/85">تأكيد بصري لحالة العارض المفعّلة في الإعلان الفردي ومعالجة الدفعة. هذه المعاينة لا تستخدم صورة حقيقية ولا تنفذ نموذج الوضعية.</p></div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-violet-200 bg-violet-50/70 p-4 shadow-sm"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><UserRound size={19} /></div><div><h2 className="text-sm font-black text-violet-950">إنشاء فردي: العارض مفعّل</h2><p className="mt-1 text-xs leading-5 text-violet-900">اقتراح الوضعية جاهز والتحكم اليدوي متاح قبل إنشاء PNG.</p></div></div><div className="mt-4 grid grid-cols-[130px_1fr] gap-4 rounded-2xl bg-white p-3"><div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-stone-100"><img src={illustration} alt="معاينة عارض توضيحية" className="h-full w-full object-cover" /><span className="absolute bottom-2 right-2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black text-white"><CheckCircle2 className="ml-1 inline" size={12} />جاهزة</span></div><div><p className="flex items-center gap-1 text-xs font-black text-primary"><Move size={14} />ضبط القطعة يدوياً</p><PreviewSlider label="الموضع الأفقي" value="0.50" /><PreviewSlider label="الموضع الرأسي" value="0.46" /><PreviewSlider label="حجم القطعة" value="0.58" /><PreviewSlider label="الميل" value="0°" /><div className="mt-3 rounded-xl bg-emerald-50 p-2 text-[11px] leading-5 text-emerald-900">ستُزال خلفية القطعة محلياً ثم يُرسم الناتج داخل قالب الإعلان.</div></div></div></section>
        <section className="rounded-3xl border border-violet-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-primary"><Layers3 size={19} /></div><div><h2 className="text-sm font-black text-primary">وضع الدفعة: العارض نفسه</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">تعالج كل قطعة بالتتابع فوق الصورة المختارة للعارض.</p></div></div><div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-xs leading-5 text-violet-950"><strong>معاينة العارض مفعّلة للدفعة.</strong> سيزيل التطبيق الخلفية محلياً ثم يركّب كل قطعة فوق العارض نفسه بالتتابع.</div><div className="mt-4 grid grid-cols-2 gap-3"><BatchCard label="قميص قطني" /><BatchCard label="جاكيت خفيف" /></div><p className="mt-4 rounded-2xl bg-stone-50 p-3 text-[11px] leading-5 text-muted-foreground">إذا لم تبق صورة العارض في الجلسة، يعرض التطبيق تنبيهاً واضحاً ويعود إلى قالب القطعة المعتاد بأمان.</p></section>
      </div>
    </section>
  </main>;
}

function PreviewSlider({ label, value }: { label: string; value: string }) {
  return <div className="mt-3"><div className="flex justify-between text-[10px] font-bold text-muted-foreground"><span>{label}</span><span dir="ltr">{value}</span></div><div className="mt-1 h-2 rounded-full bg-violet-100"><span className="block h-2 w-[58%] rounded-full bg-primary" /></div></div>;
}

function BatchCard({ label }: { label: string }) {
  return <article className="overflow-hidden rounded-2xl border border-stone-100 bg-stone-50"><div className="aspect-[3/4] bg-stone-100"><img src={illustration} alt={`نتيجة ${label} على العارض`} className="h-full w-full object-cover" /></div><p className="p-2 text-center text-[11px] font-black text-primary">{label}</p></article>;
}
