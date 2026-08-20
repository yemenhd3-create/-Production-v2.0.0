import { Download, MonitorDown, Smartphone, X } from 'lucide-react';
import * as React from 'react';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'clothing_ad_install_dismissed_until';
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function canShowInstallPrompt() {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) || 0) <= Date.now();
  } catch {
    return true;
  }
}

function isDesktopBrowser() {
  const agent = navigator.userAgent || '';
  return /(Windows|Macintosh|Linux|X11)/i.test(agent) && !/(Android|iPhone|iPad|Mobile)/i.test(agent);
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [showPhoneSteps, setShowPhoneSteps] = useState(false);

  useEffect(() => {
    setDesktop(isDesktopBrowser());
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || !canShowInstallPrompt()) {
      setIsHidden(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsHidden(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_FOR_MS));
    } catch {
      // يبقى الإخفاء صالحاً في الجلسة الحالية حتى عند تقييد التخزين.
    }
    setIsHidden(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome !== 'accepted') dismiss();
    } finally {
      setIsInstalling(false);
    }
  };

  if (isHidden || (desktop && !deferredPrompt)) return null;

  const DeviceIcon = desktop ? MonitorDown : Smartphone;
  const title = desktop ? 'ثبّت الاستوديو كتطبيق سطح مكتب' : 'ثبّت مولد الإعلانات على هاتفك';
  const description = desktop
    ? 'سيظهر كأيقونة ويفتح في نافذة مستقلة. بعد أول فتح مع الإنترنت، يبقى مسار الإنشاء والقائد المحلي متاحين دون اتصال.'
    : deferredPrompt
      ? 'سيظهر كأيقونة ويفتح بسرعة من الشاشة الرئيسية ويبقى متاحاً عند ضعف الشبكة.'
      : 'اختر «عرض خطوات التثبيت» لإضافة التطبيق من Chrome حتى لو لم يظهر زر التثبيت التلقائي.';

  return (
    <section className="mb-5 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-right" dir="rtl" aria-label="تثبيت التطبيق">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm"><DeviceIcon size={20} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-primary">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        {deferredPrompt ? <button type="button" onClick={install} disabled={isInstalling} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground transition active:scale-95 disabled:opacity-60"><Download size={16} />{isInstalling ? 'جارٍ فتح التثبيت…' : 'تثبيت التطبيق'}</button> : <button type="button" onClick={() => setShowPhoneSteps(current => !current)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground transition active:scale-95"><Smartphone size={16} />عرض خطوات التثبيت</button>}
        {!desktop && showPhoneSteps && <div className="mt-3 rounded-xl border border-primary/15 bg-white p-3 text-xs leading-6 text-foreground"><p className="font-black text-primary">في Chrome: افتح قائمة ⋮ ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p><p className="mt-2 text-muted-foreground">إذا ظهرت رسالة أن تخطيط الشاشة الرئيسية مقفّل، ألغِ «قفل تخطيط الشاشة الرئيسية» من إعدادات الشاشة الرئيسية في هاتفك، ثم أعد المحاولة. لا يستطيع الموقع تجاوز هذا القفل لأنه حماية من نظام Android.</p></div>}
      </div>
      <button type="button" onClick={dismiss} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-white" aria-label="تأجيل تثبيت التطبيق لمدة أسبوع"><X size={17} /></button>
    </section>
  );
}
