import { startLogin } from '@/const';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { LockKeyhole, LogIn, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';

export default function PersonalAccessGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const accessQuery = trpc.personal.access.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (loading || (isAuthenticated && accessQuery.isLoading)) {
    return <AccessShell icon={<LockKeyhole className="animate-pulse" size={28} />} title="جارٍ فتح مساحتك الشخصية" description="نتحقق من حسابك وإعدادات الوصول بأمان." />;
  }

  if (!isAuthenticated) {
    return (
      <AccessShell
        icon={<LockKeyhole size={28} />}
        title="دخول إلى المساحة الشخصية"
        description="هذا التطبيق مخصص للاستخدام الخاص. سجّل الدخول أولاً لحفظ الوصول بين أجهزتك المصرح بها."
        action={<button type="button" onClick={() => startLogin()} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-black text-primary-foreground transition active:scale-[0.98]"><LogIn size={20} /> تسجيل الدخول</button>}
      />
    );
  }

  if (accessQuery.error || accessQuery.data?.isDisabled) {
    return <AccessShell icon={<ShieldAlert size={30} />} title="الوصول موقوف حالياً" description="هذا الحساب لا يستطيع استخدام مساحة المشروع الآن. راجع المطور من جهازه أو حسابه المصرح به لإعادة التفعيل." />;
  }

  return <>{children}</>;
}

function AccessShell({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-5 text-center" dir="rtl">
      <section className="w-full max-w-sm rounded-[30px] bg-white p-7 shadow-[0_20px_50px_rgba(37,35,95,0.12)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
        <h1 className="mt-5 text-2xl font-black text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </section>
    </main>
  );
}
