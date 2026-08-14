import type { AdDetails, MarketingTextPreferences } from '@shared/types';
import { CircleDollarSign, Package, Palette, Percent, Phone, Plus, Sparkles, Store, Tag, X } from 'lucide-react';
import React, { useState } from 'react';
import { Input } from './ui/input';
import MarketingTextComposer from './MarketingTextComposer';

interface AdDetailsFormProps {
  details: AdDetails;
  onChange: (details: AdDetails) => void;
  generateCloudText?: (details: AdDetails, preferences: MarketingTextPreferences, variant: number) => Promise<{ text: string; source?: string; message?: string }>;
}

const fieldClass = 'h-14 rounded-2xl border-[#e6e1eb] bg-white px-4 text-right text-base shadow-none focus-visible:border-primary';

function FieldLabel({ icon: Icon, title, note }: { icon: React.ComponentType<{ size?: number }>; title: string; note: string }) {
  return <span className="flex items-center gap-2 text-sm font-black text-foreground"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/[0.07] text-primary"><Icon size={16} /></span><span>{title} <span className="font-normal text-muted-foreground">{note}</span></span></span>;
}

export default function AdDetailsForm({ details, onChange, generateCloudText }: AdDetailsFormProps) {
  const [featureDraft, setFeatureDraft] = useState('');

  const update = <K extends keyof AdDetails>(key: K, value: AdDetails[K]) => {
    onChange({ ...details, [key]: value });
  };

  const addFeature = () => {
    const value = featureDraft.trim();
    if (!value || details.features.includes(value)) return;
    update('features', [...details.features, value]);
    setFeatureDraft('');
  };

  const removeFeature = (value: string) => {
    update('features', details.features.filter(feature => feature !== value));
  };

  return (
    <div className="space-y-5" dir="rtl">
      <section>
        <p className="mb-4 text-sm font-bold leading-6 text-muted-foreground">أدخل ما تعرفه الآن؛ اسم المنتج والسعر يكفيان، وكل التفاصيل الأخرى اختيارية.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <FieldLabel icon={Tag} title="اسم المنتج" note="اختياري" />
            <Input className={fieldClass} value={details.productName} onChange={event => update('productName', event.target.value)} placeholder="مثال: فستان بناتي" />
          </label>

          <label className="space-y-2">
            <FieldLabel icon={CircleDollarSign} title="السعر" note="اختياري" />
            <div className="flex gap-2">
              <Input className={fieldClass} inputMode="decimal" value={details.price} onChange={event => update('price', event.target.value)} placeholder="5000" />
              <Input className={`${fieldClass} max-w-24 px-2 text-center`} value={details.currency} onChange={event => update('currency', event.target.value)} aria-label="العملة" />
            </div>
          </label>

          <label className="space-y-2">
            <FieldLabel icon={Percent} title="نسبة الخصم" note="اختياري" />
            <div className="relative"><Input className={`${fieldClass} pl-10`} inputMode="numeric" value={details.discount} onChange={event => update('discount', event.target.value.replace(/[^0-9.]/g, ''))} placeholder="20" /><span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-bold text-muted-foreground">%</span></div>
          </label>
        </div>
      </section>

      <details className="rounded-[24px] border border-dashed border-primary/25 bg-white px-4 py-3">
        <summary className="cursor-pointer list-none text-sm font-black text-primary marker:hidden">إضافة تفاصيل أكثر (اختياري)</summary>
        <div className="mt-5 space-y-5 border-t border-primary/10 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2"><FieldLabel icon={Package} title="الكمية" note="اختياري" /><Input className={fieldClass} inputMode="numeric" value={details.quantity} onChange={event => update('quantity', event.target.value)} placeholder="مثال: 12 قطعة" /></label>
            <label className="space-y-2"><FieldLabel icon={Store} title="اسم المتجر" note="يظهر أسفل الإعلان" /><Input className={fieldClass} value={details.storeName} onChange={event => update('storeName', event.target.value)} placeholder="مثال: متجر مروان" /></label>
            <label className="space-y-2"><FieldLabel icon={Phone} title="رقم التواصل" note="يظهر أسفل الإعلان" /><Input className={fieldClass} dir="ltr" inputMode="tel" value={details.storePhone} onChange={event => update('storePhone', event.target.value)} placeholder="770976559" /></label>
          </div>

          <label className="block space-y-2"><FieldLabel icon={Palette} title="الألوان" note="اختياري — افصل بينها بفاصلة" /><Input className={fieldClass} value={details.colors.join('، ')} onChange={event => update('colors', event.target.value.split(/[،,]/).map(color => color.trim()).filter(Boolean))} placeholder="أبيض، وردي، أزرق" /></label>

          <section className="rounded-[24px] border border-[#e8e3ed] bg-secondary/45 p-4">
            <div className="mb-3 flex items-center gap-2"><Sparkles size={18} className="text-accent" /><h3 className="font-bold text-foreground">ميزات قصيرة</h3><span className="text-xs text-muted-foreground">اختيارية</span></div>
            <div className="mb-3 flex flex-wrap gap-2">{details.features.map(feature => <button key={feature} type="button" onClick={() => removeFeature(feature)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-red-50" aria-label={`حذف ميزة ${feature}`}><X size={14} className="text-muted-foreground" />{feature}</button>)}</div>
            <div className="flex gap-2"><Input className="h-10 rounded-xl border-stone-200 bg-white text-sm" value={featureDraft} onChange={event => setFeatureDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addFeature(); } }} placeholder="أضف ميزة أخرى" /><button type="button" onClick={addFeature} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition active:scale-95" aria-label="إضافة ميزة"><Plus size={18} /></button></div>
          </section>

          <label className="block space-y-2"><span className="text-sm font-bold text-foreground">عنوان قصير <span className="font-normal text-muted-foreground">اختياري</span></span><Input className={fieldClass} value={details.headline} onChange={event => update('headline', event.target.value)} placeholder="أناقة ناعمة لكل يوم" /></label>
        </div>
      </details>

      <details className="rounded-[24px] border border-dashed border-primary/25 bg-white px-4 py-3">
        <summary className="cursor-pointer list-none text-sm font-black text-primary marker:hidden">تخصيص النص التسويقي (اختياري)</summary>
        <div className="mt-5 border-t border-primary/10 pt-4"><MarketingTextComposer details={details} onChange={onChange} generateCloudText={generateCloudText} /></div>
      </details>
    </div>
  );
}
