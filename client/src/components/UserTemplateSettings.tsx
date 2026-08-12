import type { TemplateSettings } from '@shared/types';
import { Check, MonitorSmartphone, SlidersHorizontal } from 'lucide-react';

interface UserTemplateSettingsProps {
  settings: TemplateSettings;
  onChange: (settings: TemplateSettings) => void;
  onBack: () => void;
  onAbout: () => void;
}

const toggles: Array<{ key: Exclude<keyof TemplateSettings, 'size'>; title: string; description: string }> = [
  { key: 'showProductName', title: 'اسم المنتج', description: 'يظهر في أعلى القالب.' },
  { key: 'showHeadline', title: 'العنوان القصير', description: 'يظهر أسفل اسم المنتج عند إدخاله.' },
  { key: 'showDiscount', title: 'شارة الخصم', description: 'تظهر فقط إذا أدخلت نسبة خصم.' },
  { key: 'showQuantity', title: 'الكمية', description: 'تظهر في البطاقة الجانبية عند إدخالها.' },
  { key: 'showColors', title: 'الألوان', description: 'تظهر في البطاقة الجانبية عند إدخالها.' },
  { key: 'showFeatures', title: 'الميزات', description: 'مثل خامة عالية الجودة وقطن ناعم.' },
  { key: 'showPrice', title: 'السعر', description: 'تظهر بطاقة السعر الحمراء عند إدخاله.' },
  { key: 'showStoreInfo', title: 'اسم المتجر والتواصل', description: 'يظهر الشريط الأحمر السفلي عند إدخاله.' },
  { key: 'showFrame', title: 'إطار القالب', description: 'الحد العاجي الرفيع المحيط بالإعلان.' },
  { key: 'showQualityMark', title: 'علامة الجودة', description: 'رمز التحقق البنفسجي في أعلى القالب.' },
];

export default function UserTemplateSettings({ settings, onChange, onBack, onAbout }: UserTemplateSettingsProps) {
  const setToggle = (key: Exclude<keyof TemplateSettings, 'size'>) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_40px_rgba(37,35,95,0.08)] sm:p-7" dir="rtl">
      <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
        <SlidersHorizontal size={15} /> إعدادات المستخدم
      </span>
      <h2 className="text-2xl font-black text-foreground">شكل قالب الإعلان</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        هذه الإعدادات تخص ما يظهر في إعلانك فقط. لا تحتوي مفاتيح ذكاء اصطناعي أو إعدادات تقنية.
      </p>

      <section className="mt-6 rounded-2xl bg-secondary/65 p-4">
        <div className="mb-3 flex items-center gap-2 text-primary"><MonitorSmartphone size={19} /><h3 className="font-black">مقاس الإعلان</h3></div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...settings, size: 'portrait' })}
            className={`rounded-2xl border p-4 text-right transition ${settings.size === 'portrait' ? 'border-primary bg-white shadow-sm' : 'border-transparent bg-white/60 text-muted-foreground'}`}
          >
            <span className="block text-sm font-black">منشور عمودي</span>
            <span className="mt-1 block text-xs">1080 × 1350</span>
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, size: 'story' })}
            className={`rounded-2xl border p-4 text-right transition ${settings.size === 'story' ? 'border-primary bg-white shadow-sm' : 'border-transparent bg-white/60 text-muted-foreground'}`}
          >
            <span className="block text-sm font-black">قصة أو حالة</span>
            <span className="mt-1 block text-xs">1080 × 1920</span>
          </button>
        </div>
      </section>

      <div className="mt-6 space-y-2">
        {toggles.map(item => {
          const active = settings[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setToggle(item.key)}
              className="flex w-full items-center gap-3 rounded-2xl border border-stone-100 p-4 text-right transition hover:border-primary/20 active:scale-[0.99]"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {active && <Check size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-foreground">{item.title}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
              </span>
              <span className={`text-xs font-bold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{active ? 'ظاهر' : 'مخفي'}</span>
            </button>
          );
        })}
      </div>

      <button type="button" onClick={onAbout} className="mt-5 w-full rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 text-right text-sm font-black text-primary transition active:scale-[0.99]">حول التطبيق وبيانات المطور</button>

      <button type="button" onClick={onBack} className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary text-base font-black text-primary-foreground transition active:scale-[0.98]">
        العودة إلى الإنشاء
      </button>
    </section>
  );
}
