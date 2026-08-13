import type { TemplateBadgeType, TemplateSettings, TemplateSize } from '@shared/types';
import { Check, ImagePlus, MonitorSmartphone, SlidersHorizontal, Tag } from 'lucide-react';
import { useState } from 'react';

interface UserTemplateSettingsProps {
  settings: TemplateSettings;
  onChange: (settings: TemplateSettings) => void;
  onBack: () => void;
  onAbout: () => void;
}

type ToggleKey = 'showProductName' | 'showHeadline' | 'showDiscount' | 'showQuantity' | 'showColors' | 'showFeatures' | 'showPrice' | 'showStoreInfo' | 'showFrame' | 'showQualityMark';

const toggles: Array<{ key: ToggleKey; title: string; description: string }> = [
  { key: 'showProductName', title: 'اسم المنتج', description: 'يظهر في أعلى القالب.' },
  { key: 'showHeadline', title: 'العنوان القصير', description: 'يظهر أسفل اسم المنتج عند إدخاله.' },
  { key: 'showDiscount', title: 'شارة الخصم', description: 'تظهر فقط إذا أدخلت نسبة خصم.' },
  { key: 'showQuantity', title: 'الكمية', description: 'تظهر في مساحة المعلومات عند إدخالها.' },
  { key: 'showColors', title: 'الألوان', description: 'تظهر في مساحة المعلومات عند إدخالها.' },
  { key: 'showFeatures', title: 'الميزات', description: 'مثل خامة عالية الجودة وقطن ناعم.' },
  { key: 'showPrice', title: 'السعر', description: 'تظهر بطاقة السعر الحمراء عند إدخاله.' },
  { key: 'showStoreInfo', title: 'اسم المتجر والتواصل', description: 'يظهر الشريط السفلي عند إدخاله.' },
  { key: 'showFrame', title: 'إطار القالب', description: 'الحد الرفيع المحيط بالإعلان.' },
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

const artworkRatios: Record<TemplateSize, { header: number; footer: number }> = {
  portrait: { header: 5.8, footer: 9.2 },
  square: { header: 6.4, footer: 8.2 },
  story: { header: 5.3, footer: 7.5 },
  whatsapp: { header: 5.5, footer: 8.8 },
  landscape: { header: 5.5, footer: 9 },
};

export default function UserTemplateSettings({ settings, onChange, onBack, onAbout }: UserTemplateSettingsProps) {
  const [artworkError, setArtworkError] = useState('');
  const setToggle = (key: ToggleKey) => onChange({ ...settings, [key]: !settings[key] });

  const selectArtwork = (kind: 'header' | 'footer' | 'logo', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1024 * 1024) {
      setArtworkError('اختر صورة PNG أو JPG أو WebP لا تتجاوز 1 ميجابايت.');
      return;
    }
    if (kind === 'logo') {
      const reader = new FileReader();
      reader.onload = () => {
        onChange({ ...settings, storeLogoArtwork: String(reader.result || ''), showStoreLogo: true });
        setArtworkError('');
      };
      reader.onerror = () => setArtworkError('تعذر قراءة شعار المتجر. حاول اختيار الصورة مرة أخرى.');
      reader.readAsDataURL(file);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const expected = artworkRatios[settings.size][kind];
      const actual = image.width / image.height;
      if (Math.abs(actual - expected) / expected > 0.025) {
        setArtworkError(`نسبة صورة ${kind === 'header' ? 'العنوان' : 'التذييل'} غير مناسبة. المطلوب تقريباً ${expected.toFixed(1)} : 1 لهذا المقاس.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || '');
        onChange(kind === 'header'
          ? { ...settings, headerArtwork: value, showHeaderArtwork: true }
          : { ...settings, footerArtwork: value, showFooterArtwork: true });
        setArtworkError('');
      };
      reader.onerror = () => setArtworkError('تعذر قراءة صورة الطبقة. حاول اختيارها مرة أخرى.');
      reader.readAsDataURL(file);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setArtworkError('الملف المحدد ليس صورة صالحة.');
    };
    image.src = objectUrl;
  };

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_40px_rgba(37,35,95,0.08)] sm:p-7" dir="rtl">
      <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><SlidersHorizontal size={15} /> إعدادات المستخدم</span>
      <h2 className="text-2xl font-black text-foreground">هندسة قالب الإعلان</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">اختر المقاس والطبقات التي تظهر في إعلانك. تبقى مفاتيح الذكاء الاصطناعي داخل لوحة المطور فقط.</p>

      <section className="mt-6 rounded-2xl bg-secondary/65 p-4">
        <div className="mb-3 flex items-center gap-2 text-primary"><MonitorSmartphone size={19} /><h3 className="font-black">مقاس الإعلان</h3></div>
        <div className="grid grid-cols-2 gap-3">{sizeOptions.map(option => <button key={option.value} type="button" onClick={() => onChange({ ...settings, size: option.value })} className={`rounded-2xl border p-4 text-right transition ${settings.size === option.value ? 'border-primary bg-white shadow-sm' : 'border-transparent bg-white/60 text-muted-foreground'}`}><span className="block text-sm font-black">{option.title}</span><span className="mt-1 block text-xs">{option.subtitle}</span></button>)}</div>
      </section>

      <section className="mt-6 rounded-2xl border border-primary/10 bg-primary/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2 text-primary"><Tag size={19} /><h3 className="font-black">أيقونة العرض</h3></div>
        <div className="flex flex-wrap gap-2">{badgeOptions.map(option => <button key={option.value} type="button" onClick={() => onChange({ ...settings, badgeType: option.value, badgeText: option.value === 'none' ? '' : settings.badgeText || option.defaultText })} className={`rounded-xl px-3 py-2 text-xs font-black ${settings.badgeType === option.value ? 'bg-primary text-white' : 'bg-white text-primary shadow-sm'}`}>{option.title}</button>)}</div>
        {settings.badgeType !== 'none' && <input value={settings.badgeText} onChange={event => onChange({ ...settings, badgeText: event.target.value })} className="mt-3 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold" placeholder="النص فوق الأيقونة" />}
      </section>

      <section className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-primary"><ImagePlus size={19} /><h3 className="font-black">طبقات مصممة اختيارية</h3></div>
        <p className="text-xs leading-5 text-muted-foreground">يمكنك إبقاء العنوان والتذييل نصيين، أو رفع صورة مصممة لكل طبقة. يقبل التطبيق النسبة الصحيحة فقط حتى لا تتشوه.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="cursor-pointer rounded-xl bg-secondary/65 p-3 text-sm font-black text-primary">رفع بانر العنوان <span className="mt-1 block text-[11px] font-medium text-muted-foreground">تقريباً {artworkRatios[settings.size].header.toFixed(1)} : 1</span><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => selectArtwork('header', event.target.files?.[0])} /></label>
          <label className="cursor-pointer rounded-xl bg-secondary/65 p-3 text-sm font-black text-primary">رفع شعار المتجر الدائري <span className="mt-1 block text-[11px] font-medium text-muted-foreground">PNG أو JPG أو WebP، يظهر داخل دائرة.</span><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => selectArtwork('logo', event.target.files?.[0])} /></label>
          <label className="cursor-pointer rounded-xl bg-secondary/65 p-3 text-sm font-black text-primary">رفع بانر التذييل <span className="mt-1 block text-[11px] font-medium text-muted-foreground">تقريباً {artworkRatios[settings.size].footer.toFixed(1)} : 1</span><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => selectArtwork('footer', event.target.files?.[0])} /></label>
        </div>
        {(settings.headerArtwork || settings.storeLogoArtwork || settings.footerArtwork) && <div className="mt-4 rounded-xl bg-stone-50 p-3"><p className="mb-2 text-xs font-black text-foreground">معاينة الطبقات المحفوظة</p><div className="flex flex-wrap items-center gap-3">{settings.headerArtwork && <div className="max-w-36"><img src={settings.headerArtwork} alt="معاينة بانر العنوان" className="h-10 w-full rounded-lg border bg-white object-contain" /><button type="button" className="mt-1 text-[11px] font-bold text-red-700" onClick={() => onChange({ ...settings, headerArtwork: '', showHeaderArtwork: false })}>حذف بانر العنوان</button></div>}{settings.storeLogoArtwork && <div className="text-center"><img src={settings.storeLogoArtwork} alt="معاينة شعار المتجر" className="mx-auto h-12 w-12 rounded-full border-2 border-white bg-white object-cover shadow-sm" /><button type="button" className="mt-1 text-[11px] font-bold text-red-700" onClick={() => onChange({ ...settings, storeLogoArtwork: '', showStoreLogo: false })}>حذف الشعار</button></div>}{settings.footerArtwork && <div className="max-w-36"><img src={settings.footerArtwork} alt="معاينة بانر التذييل" className="h-8 w-full rounded-lg border bg-white object-contain" /><button type="button" className="mt-1 text-[11px] font-bold text-red-700" onClick={() => onChange({ ...settings, footerArtwork: '', showFooterArtwork: false })}>حذف بانر التذييل</button></div>}</div></div>}
        {artworkError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-800">{artworkError}</p>}
      </section>

      <div className="mt-6 space-y-2">{toggles.map(item => {
        const active = settings[item.key];
        return <button key={item.key} type="button" onClick={() => setToggle(item.key)} className="flex w-full items-center gap-3 rounded-2xl border border-stone-100 p-4 text-right transition hover:border-primary/20 active:scale-[0.99]"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{active && <Check size={16} />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-foreground">{item.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span></span><span className={`text-xs font-bold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{active ? 'ظاهر' : 'مخفي'}</span></button>;
      })}</div>

      <button type="button" onClick={onAbout} className="mt-5 w-full rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 text-right text-sm font-black text-primary transition active:scale-[0.99]">حول التطبيق وبيانات المطور</button>
      <button type="button" onClick={onBack} className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary text-base font-black text-primary-foreground transition active:scale-[0.98]">العودة إلى الإنشاء</button>
    </section>
  );
}
