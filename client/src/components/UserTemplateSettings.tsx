import type { TemplateBadgeType, TemplateSettings, TemplateSize } from '@shared/types';
import { ArrowRight, Check, CheckCircle2, ImagePlus, LayoutTemplate, MonitorSmartphone, SlidersHorizontal, Sparkles, Store, Tag } from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';
import { PRACTICAL_HEADER_RATIO } from '@/lib/brandArtworkSupport';
import ArtworkPositionEditor from './ArtworkPositionEditor';
import ArtworkCropEditor from './ArtworkCropEditor';

interface UserTemplateSettingsProps {
  settings: TemplateSettings;
  onChange: (settings: TemplateSettings) => void;
  onBack: () => void;
  onAbout: () => void;
}

type ToggleKey = 'showProductName' | 'showHeadline' | 'showDiscount' | 'showQuantity' | 'showColors' | 'showFeatures' | 'showPrice' | 'showStoreInfo' | 'showQualityMark';

const toggles: Array<{ key: ToggleKey; title: string; description: string }> = [
  { key: 'showProductName', title: 'اسم المنتج', description: 'يظهر في أعلى القالب.' },
  { key: 'showHeadline', title: 'العنوان القصير', description: 'يظهر أسفل اسم المنتج عند إدخاله.' },
  { key: 'showDiscount', title: 'شارة الخصم', description: 'تظهر فقط إذا أدخلت نسبة خصم.' },
  { key: 'showQuantity', title: 'الكمية', description: 'تظهر في مساحة المعلومات عند إدخالها.' },
  { key: 'showColors', title: 'الألوان', description: 'تظهر في مساحة المعلومات عند إدخالها.' },
  { key: 'showFeatures', title: 'الميزات', description: 'مثل خامة عالية الجودة وقطن ناعم.' },
  { key: 'showPrice', title: 'السعر', description: 'تظهر بطاقة السعر الحمراء عند إدخاله.' },
  { key: 'showStoreInfo', title: 'اسم المتجر والتواصل', description: 'يظهر الشريط السفلي عند إدخاله.' },
  { key: 'showQualityMark', title: 'علامة الجودة', description: 'رمز التحقق البنفسجي في أعلى القالب.' },
];

const sizeOptions: Array<{ value: TemplateSize; title: string; subtitle: string }> = [
  { value: 'portrait', title: 'منشور عمودي', subtitle: '4:5 · 1080 × 1350' },
  { value: 'square', title: 'منشور مربع', subtitle: '1:1 · 1080 × 1080' },
  { value: 'story', title: 'قصة أو حالة', subtitle: '9:16 · 1080 × 1920' },
  { value: 'whatsapp', title: 'بطاقة واتساب', subtitle: '3:4 · 1080 × 1440' },
  { value: 'landscape', title: 'بانر أفقي', subtitle: '1.91:1 · 1200 × 628' },
];

const badgeOptions: Array<{ value: TemplateBadgeType; title: string; defaultText: string }> = [
  { value: 'none', title: 'بدون', defaultText: '' },
  { value: 'discount', title: 'خصم', defaultText: 'خصم 30%' },
  { value: 'new', title: 'جديد', defaultText: 'جديد' },
  { value: 'offer', title: 'عرض', defaultText: 'عرض خاص' },
  { value: 'price', title: 'سعر', defaultText: 'سعر مميز' },
  { value: 'quality', title: 'جودة', defaultText: 'جودة عالية' },
];

const artworkRatios: Record<TemplateSize, { footer: number }> = {
  portrait: { footer: PRACTICAL_HEADER_RATIO },
  square: { footer: PRACTICAL_HEADER_RATIO },
  story: { footer: PRACTICAL_HEADER_RATIO },
  whatsapp: { footer: PRACTICAL_HEADER_RATIO },
  landscape: { footer: PRACTICAL_HEADER_RATIO },
};

export default function UserTemplateSettings({ settings, onChange, onBack, onAbout }: UserTemplateSettingsProps) {
  const [artworkError, setArtworkError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [pendingArtwork, setPendingArtwork] = useState<{ kind: 'logo' | 'footer'; source: string } | null>(null);
  const visibleCount = toggles.filter(item => settings[item.key]).length;
  const setToggle = (key: ToggleKey) => onChange({ ...settings, [key]: !settings[key] });
  const selectedBadges = settings.badgeTypes?.slice() || (settings.badgeType !== 'none' ? [settings.badgeType] : []);
  const toggleBadge = (type: Exclude<TemplateBadgeType, 'none'>) => {
    const next = selectedBadges.includes(type) ? selectedBadges.filter(value => value !== type) : [...selectedBadges, type].slice(0, 3);
    onChange({ ...settings, badgeTypes: next, badgeType: next[0] || 'none', badgeText: next.length === 1 ? settings.badgeText || badgeOptions.find(option => option.value === next[0])?.defaultText || '' : '' });
    setIsSaved(false);
  };
  const saveSettings = () => {
    onChange({ ...settings });
    setIsSaved(true);
  };

  const selectArtwork = (kind: 'footer' | 'logo', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
      setArtworkError('اختر صورة PNG أو JPG أو WebP لا تتجاوز 8 ميجابايت. ستضبطها داخل المحرر قبل الحفظ.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setPendingArtwork({ kind, source: String(reader.result || '') }); setArtworkError(''); };
    reader.onerror = () => setArtworkError('تعذر قراءة الصورة. حاول اختيارها مرة أخرى أو استخدم نسخة محفوظة في الهاتف.');
    reader.readAsDataURL(file);
  };

  const saveArtwork = (value: string) => {
    if (!pendingArtwork) return;
    onChange(pendingArtwork.kind === 'logo' ? { ...settings, storeLogoArtwork: value, showStoreLogo: true } : { ...settings, footerArtwork: value, showFooterArtwork: true });
    setPendingArtwork(null);
    setIsSaved(false);
  };

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_40px_rgba(37,35,95,0.08)] sm:p-7" dir="rtl">
      <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><SlidersHorizontal size={15} /> إعدادات القالب</span>
      <h2 className="text-2xl font-black text-foreground">جهّز شكل إعلانك</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">اختر المقاس والعناصر التي تريدها. هذه الخيارات تخص القالب فقط ولا تحتوي أي مفاتيح تقنية.</p>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-primary/10 bg-gradient-to-l from-primary/10 to-violet-50 p-3 text-center"><div><span className="block text-[10px] font-bold text-muted-foreground">المقاس</span><span className="mt-1 block text-xs font-black text-primary">{sizeOptions.find(option => option.value === settings.size)?.title}</span></div><div className="border-x border-primary/10"><span className="block text-[10px] font-bold text-muted-foreground">العناصر</span><span className="mt-1 block text-sm font-black text-primary">{visibleCount} ظاهرة</span></div><div><span className="block text-[10px] font-bold text-muted-foreground">الشارات</span><span className="mt-1 block text-sm font-black text-primary">{selectedBadges.length || '—'}</span></div></div>

      <section className="mt-6 rounded-2xl bg-secondary/65 p-4">
        <div className="mb-3 flex items-center gap-2 text-primary"><MonitorSmartphone size={19} /><h3 className="font-black">مقاس الإعلان</h3><span className="mr-auto text-[10px] font-bold text-muted-foreground">اختر منصة النشر</span></div>
        <div className="grid grid-cols-2 gap-3">{sizeOptions.map(option => <button key={option.value} type="button" onClick={() => onChange({ ...settings, size: option.value })} className={`rounded-2xl border p-4 text-right transition ${settings.size === option.value ? 'border-primary bg-white shadow-sm' : 'border-transparent bg-white/60 text-muted-foreground'}`}><span className="block text-sm font-black">{option.title}</span><span className="mt-1 block text-xs">{option.subtitle}</span></button>)}</div>
      </section>

      <section className="mt-6 rounded-2xl border border-primary/10 bg-primary/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2 text-primary"><Tag size={19} /><h3 className="font-black">شارات العرض</h3></div>
        <p className="mb-3 text-xs leading-5 text-muted-foreground">اختر حتى ثلاث شارات. يضعها القالب في صف ثابت أعلى الإعلان حتى لا تغطي الملابس أو السعر.</p>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { onChange({ ...settings, badgeTypes: [], badgeType: 'none', badgeText: '' }); setIsSaved(false); }} className={`rounded-xl px-3 py-2 text-xs font-black ${selectedBadges.length === 0 ? 'bg-primary text-white' : 'bg-white text-primary shadow-sm'}`}>بدون</button>{badgeOptions.filter(option => option.value !== 'none').map(option => <button key={option.value} type="button" onClick={() => toggleBadge(option.value as Exclude<TemplateBadgeType, 'none'>)} className={`rounded-xl px-3 py-2 text-xs font-black ${selectedBadges.includes(option.value as Exclude<TemplateBadgeType, 'none'>) ? 'bg-primary text-white' : 'bg-white text-primary shadow-sm'}`}>{option.title}</button>)}</div>
        {selectedBadges.length === 1 && <input value={settings.badgeText} onChange={event => { onChange({ ...settings, badgeText: event.target.value }); setIsSaved(false); }} className="mt-3 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold" placeholder="نص مخصص للشارة الوحيدة" />}
        {selectedBadges.length > 1 && <p className="mt-3 text-xs font-bold text-muted-foreground">تستخدم الشارات المتعددة عناوينها الافتراضية كي تبقى واضحة داخل الإعلان.</p>}
      </section>

      <section className="mt-6 rounded-2xl border border-dashed border-primary/20 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-primary"><Store size={19} /><h3 className="font-black">هوية المتجر: الشعار والتذييل</h3></div>
        <p className="text-xs leading-5 text-muted-foreground">يكفي رفع شعار المتجر وتذييل مصمم. يظهر التذييل شريطاً عريضاً كاملاً في أسفل الإعلان، من اليمين إلى اليسار.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="cursor-pointer rounded-2xl border border-primary/10 bg-secondary/65 p-3 text-sm font-black text-primary transition hover:bg-primary/10 active:scale-[.99]"><span className="flex items-center gap-2"><ImagePlus size={17} />اختيار شعار المتجر</span><span className="mt-1 block text-[11px] font-medium text-muted-foreground">أي نسبة مناسبة؛ اضبط القص والاحتواء قبل الحفظ.</span><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => selectArtwork('logo', event.target.files?.[0])} /></label>
          <label className="cursor-pointer rounded-2xl border border-primary/10 bg-secondary/65 p-3 text-sm font-black text-primary transition hover:bg-primary/10 active:scale-[.99]"><span className="flex items-center gap-2"><LayoutTemplate size={17} />اختيار تذييل المتجر</span><span className="mt-1 block text-[11px] font-medium text-muted-foreground">أي نسبة مناسبة؛ اضبطه إلى 2688 × 494 قبل الحفظ.</span><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => selectArtwork('footer', event.target.files?.[0])} /></label>
        </div>
        {(settings.storeLogoArtwork || settings.footerArtwork) && <div className="mt-4 rounded-xl bg-stone-50 p-3"><p className="mb-2 text-xs font-black text-foreground">معاينة هوية المتجر</p><div className="flex flex-wrap items-center gap-3">{settings.storeLogoArtwork && <div className="text-center"><img src={settings.storeLogoArtwork} alt="معاينة شعار المتجر" className="mx-auto h-12 w-12 rounded-full border-2 border-white bg-white object-cover shadow-sm" /><button type="button" className="mt-1 text-[11px] font-bold text-red-700" onClick={() => onChange({ ...settings, storeLogoArtwork: '', showStoreLogo: false })}>حذف الشعار</button></div>}{settings.footerArtwork && <div className="w-full"><img src={settings.footerArtwork} alt="معاينة تذييل المتجر الكامل" className="h-auto w-full rounded-lg bg-white object-contain" /><button type="button" className="mt-1 text-[11px] font-bold text-red-700" onClick={() => onChange({ ...settings, footerArtwork: '', showFooterArtwork: false })}>حذف تذييل المتجر</button></div>}</div></div>}
        <ArtworkPositionEditor settings={settings} onChange={onChange} />
        {artworkError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-800">{artworkError}</p>}
      </section>

      <section className="mt-6"><div className="mb-3 flex items-center gap-2 text-primary"><Sparkles size={19} /><h3 className="font-black">العناصر الأساسية في الإعلان</h3></div><div className="space-y-2">{toggles.slice(0, 4).map(item => {
        const active = settings[item.key];
        return <button key={item.key} type="button" onClick={() => setToggle(item.key)} className="flex w-full items-center gap-3 rounded-2xl border border-stone-100 p-4 text-right transition hover:border-primary/20 active:scale-[0.99]"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{active && <Check size={16} />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-foreground">{item.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span></span><span className={`text-xs font-bold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{active ? 'ظاهر' : 'مخفي'}</span></button>;
      })}</div><details className="mt-3 rounded-2xl border border-primary/10 bg-primary/[.03] p-3"><summary className="cursor-pointer list-none text-sm font-black text-primary">خيارات إضافية للكمية والألوان والمتجر والجودة</summary><div className="mt-3 space-y-2">{toggles.slice(4).map(item => { const active = settings[item.key]; return <button key={item.key} type="button" onClick={() => setToggle(item.key)} className="flex w-full items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3 text-right transition hover:border-primary/20 active:scale-[0.99]"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{active && <Check size={16} />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-foreground">{item.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span></span><span className={`text-xs font-bold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{active ? 'ظاهر' : 'مخفي'}</span></button>; })}</div></details></section>

      <button type="button" onClick={saveSettings} className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition active:scale-[0.98] ${isSaved ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'}`}><CheckCircle2 size={18} />{isSaved ? 'تم حفظ الإعدادات على هذا الهاتف' : 'حفظ الإعدادات'}</button>
      <button type="button" onClick={onAbout} className="mt-3 flex w-full items-center gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 text-right text-sm font-black text-primary transition active:scale-[0.99]"><Sparkles size={18} />حول التطبيق وبيانات المطور</button>
      <button type="button" onClick={onBack} className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-black text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]"><ArrowRight size={19} />العودة إلى الإنشاء</button>
      {pendingArtwork && <ArtworkCropEditor kind={pendingArtwork.kind} source={pendingArtwork.source} onSave={saveArtwork} onCancel={() => setPendingArtwork(null)} />}
    </section>
  );
}
