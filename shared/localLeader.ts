import type { MerchantCommand } from './merchantAssistant';

export type LocalLeaderRole = 'leader' | 'template' | 'garment' | 'quality' | 'privacy' | 'research';
export type LocalLeaderIntent = 'command' | 'asset' | 'guidance' | 'research';

export type LocalLeaderPlan = {
  role: LocalLeaderRole;
  intent: LocalLeaderIntent;
  label: string;
  reply: string;
};

export const LOCAL_LEADER_ROLES: Array<{ id: LocalLeaderRole; label: string; description: string }> = [
  { id: 'leader', label: 'القائد', description: 'يفهم الطلب وينسق النتيجة.' },
  { id: 'template', label: 'القالب', description: 'يهتم بالعناصر والمقاس والهوية.' },
  { id: 'garment', label: 'الملابس', description: 'يرشد لتجهيز الصورة والمسار المحلي.' },
  { id: 'quality', label: 'الجودة', description: 'يحمي التباين والتخطيط قبل التصدير.' },
  { id: 'privacy', label: 'الخصوصية', description: 'يبقي صورك وبياناتك محلية.' },
  { id: 'research', label: 'البحث', description: 'يشرح الخيارات عند وجود شبكة فقط.' },
];

function normalizeArabic(value: string) {
  return value.toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
}

function hasAny(input: string, values: string[]) {
  return values.some(value => input.includes(value));
}

export function resolveLocalLeaderPlan(request: string, commands: MerchantCommand[]): LocalLeaderPlan {
  const input = normalizeArabic(request);
  if (hasAny(input, ['شعار', 'لوجو', 'لوغو', 'تذييل', 'فوتر', 'footer'])) {
    return {
      role: 'template',
      intent: 'asset',
      label: 'خبير القالب',
      reply: 'فهمت أنك تريد ضبط هوية القالب. أرفق صورة الشعار أو التذييل من الزرين أسفل المحادثة، وسأعرض ملخصاً قبل حفظها محلياً أو إعادة بناء الإعلان.',
    };
  }
  if (hasAny(input, ['خطه', 'خطة', 'افكار', 'أفكار', 'نصيحه', 'نصيحة', 'بحث', 'قارن'])) {
    return {
      role: 'research',
      intent: 'research',
      label: 'باحث المشروع',
      reply: 'سأرتب لك خطة عملية اعتماداً على أدوات المشروع المحلية أولاً. للبحث الخارجي أو مقارنة مزودين، ستبقى الصور والبيانات على جهازك إلى أن تختار بنفسك إرسال أي شيء.',
    };
  }
  if (commands.some(command => command.type !== 'unsupported')) {
    return {
      role: 'leader',
      intent: 'command',
      label: 'القائد المحلي',
      reply: 'حللت طلبك مع خبير القالب والجودة. ستظهر لك مهمة واضحة؛ راجعها ثم أكد التنفيذ. لن أغيّر الإعلان من دون موافقتك.',
    };
  }
  if (hasAny(input, ['صوره', 'صورة', 'خلفيه', 'خلفية', 'تلبيس', 'ملابس', 'قطعه', 'قطعة'])) {
    return {
      role: 'garment',
      intent: 'guidance',
      label: 'خبير الملابس',
      reply: 'سأبدأ دائماً بالمسار المحلي: صورة واضحة للقطعة ثم إزالة الخلفية على الهاتف. تجربة التلبيس تبقى اختيارية، ولا تغير القالب إلا بعد مراجعتك واعتمادك للنتيجة.',
    };
  }
  if (hasAny(input, ['جوده', 'جودة', 'واضح', 'تباين', 'تخطيط', 'تداخل'])) {
    return {
      role: 'quality',
      intent: 'guidance',
      label: 'خبير الجودة',
      reply: 'سأحافظ على وضوح العنوان والقطعة والسعر قبل الحفظ. استخدم فحص الجودة المحلي بعد إنشاء الإعلان، ثم طبق الإصلاحات الاختيارية فقط إذا وافقت عليها.',
    };
  }
  return {
    role: 'leader',
    intent: 'guidance',
    label: 'القائد المحلي',
    reply: 'أنا جاهز لمساعدتك محلياً. اكتب طلباً واضحاً مثل: «كبر الملابس»، «غير العنوان إلى…»، «أرفق شعاراً»، أو «أريد خطة لتحسين الصورة». سأشرح النتيجة أولاً ثم أطلب تأكيدك قبل التطبيق.',
  };
}
