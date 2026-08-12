import type { DeveloperProviderSummary } from '@shared/types';
import { Check, KeyRound, LockKeyhole, LogOut, Plus, RefreshCw, ServerCog, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Input } from './ui/input';

type ProviderDraft = {
  id?: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
};

type DiagnosticEntry = {
  id: string;
  at: string;
  level: 'success' | 'error' | 'info';
  message: string;
};

const emptyDraft = (): ProviderDraft => ({
  name: '',
  baseUrl: '',
  model: '',
  apiKey: '',
  enabled: true,
});

function providerToDraft(provider: DeveloperProviderSummary): ProviderDraft {
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    model: provider.model,
    apiKey: '',
    enabled: provider.enabled,
  };
}

export default function DeveloperWorkspace({ onBack }: { onBack: () => void }) {
  const utils = trpc.useUtils();
  const statusQuery = trpc.developer.status.useQuery();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<ProviderDraft>(emptyDraft);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>([
    { id: 'workspace-opened', at: new Date().toLocaleTimeString('ar-YE'), level: 'info', message: 'تم فتح مساحة إدارة المطور.' },
  ]);

  const isAuthenticated = statusQuery.data?.authenticated === true;
  const providersQuery = trpc.developer.providers.list.useQuery(undefined, { enabled: isAuthenticated });

  const addDiagnostic = (level: DiagnosticEntry['level'], message: string) => {
    setDiagnostics(current => [{ id: crypto.randomUUID(), at: new Date().toLocaleTimeString('ar-YE'), level, message }, ...current].slice(0, 12));
  };

  const loginMutation = trpc.developer.login.useMutation({
    onSuccess: async () => {
      setPassword('');
      setNotice('تم فتح لوحة المطور.');
      addDiagnostic('success', 'نجح التحقق الخادمي من بيانات دخول المطور.');
      await utils.developer.status.invalidate();
    },
    onError: () => {
      setNotice('اسم المستخدم أو كلمة المرور غير صحيحين.');
      addDiagnostic('error', 'فشلت محاولة فتح لوحة المطور.');
    },
  });

  const logoutMutation = trpc.developer.logout.useMutation({
    onSuccess: async () => {
      setDraft(emptyDraft());
      setNotice('تم إغلاق لوحة المطور.');
      addDiagnostic('info', 'تم إنهاء جلسة المطور.');
      await utils.developer.status.invalidate();
      await utils.developer.providers.invalidate();
    },
  });

  const saveMutation = trpc.developer.providers.save.useMutation({
    onSuccess: async () => {
      setDraft(emptyDraft());
      setNotice('تم حفظ المزود. يبقى مفتاح API مشفراً على الخادم ولا يظهر مجدداً هنا.');
      addDiagnostic('success', 'تم حفظ إعدادات المزود ومفتاحه بصورة مشفرة.');
      await utils.developer.providers.invalidate();
    },
    onError: error => {
      setNotice(error.message || 'تعذر حفظ المزود.');
      addDiagnostic('error', 'تعذر حفظ إعدادات المزود.');
    },
  });

  const removeMutation = trpc.developer.providers.remove.useMutation({
    onSuccess: async () => {
      setNotice('تم حذف المزود.');
      addDiagnostic('success', 'تم حذف المزود المحدد.');
      await utils.developer.providers.invalidate();
    },
    onError: () => {
      setNotice('تعذر حذف المزود.');
      addDiagnostic('error', 'تعذر حذف المزود المحدد.');
    },
  });

  const checkMutation = trpc.developer.providers.check.useMutation({
    onSuccess: result => {
      setNotice(result.message);
      addDiagnostic(result.reachable ? 'success' : 'error', result.status ? `${result.message} (الحالة ${result.status})` : result.message);
    },
    onError: error => {
      setNotice(error.message || 'تعذر اختبار المزود.');
      addDiagnostic('error', 'تعذر تنفيذ اختبار اتصال المزود.');
    },
  });

  const updateDraft = <K extends keyof ProviderDraft>(key: K, value: ProviderDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const submitProvider = () => {
    setNotice('');
    saveMutation.mutate({
      id: draft.id,
      name: draft.name,
      baseUrl: draft.baseUrl,
      model: draft.model,
      apiKey: draft.apiKey || undefined,
      enabled: draft.enabled,
    });
  };

  if (statusQuery.isLoading) {
    return <section className="rounded-[28px] bg-white p-8 text-center shadow-[0_16px_40px_rgba(37,35,95,0.08)]"><RefreshCw className="mx-auto animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">جارٍ التحقق من لوحة المطور…</p></section>;
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_40px_rgba(37,35,95,0.08)] sm:p-7" dir="rtl">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><LockKeyhole size={15} /> مساحة خاصة</span>
        <h2 className="mt-3 text-2xl font-black text-foreground">لوحة المطور</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">هذه المساحة مخصصة للمطور فقط. لا يستطيع المستخدم العادي رؤية مفاتيح الذكاء الاصطناعي أو تغييرها.</p>
        <div className="mt-6 space-y-4">
          <label className="block space-y-2"><span className="text-sm font-bold text-foreground">اسم المستخدم</span><Input className="h-12 rounded-2xl border-stone-200 px-4 text-right" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" /></label>
          <label className="block space-y-2"><span className="text-sm font-bold text-foreground">كلمة المرور</span><Input className="h-12 rounded-2xl border-stone-200 px-4 text-right" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" onKeyDown={event => { if (event.key === 'Enter') loginMutation.mutate({ username, password }); }} /></label>
          {notice && <p className="rounded-xl bg-secondary p-3 text-sm font-medium text-primary">{notice}</p>}
          <button type="button" disabled={loginMutation.isPending || !username || !password} onClick={() => loginMutation.mutate({ username, password })} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-black text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"><LockKeyhole size={19} />{loginMutation.isPending ? 'جارٍ التحقق…' : 'دخول لوحة المطور'}</button>
          <button type="button" onClick={onBack} className="w-full py-2 text-sm font-bold text-muted-foreground">العودة إلى الإنشاء</button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5" dir="rtl">
      <div className="rounded-[28px] bg-white p-5 shadow-[0_16px_40px_rgba(37,35,95,0.08)] sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><Check size={15} /> جلسة مطور آمنة</span><h2 className="mt-3 text-2xl font-black text-foreground">إدارة الذكاء الاصطناعي</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">تُحفظ المفاتيح مشفرة على الخادم؛ لا يعرض التطبيق قيمة مفتاح محفوظ سابقاً.</p></div>
          <button type="button" onClick={() => logoutMutation.mutate()} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary" aria-label="تسجيل الخروج"><LogOut size={19} /></button>
        </div>
        {notice && <p className="mt-5 rounded-xl bg-secondary p-3 text-sm font-medium text-primary">{notice}</p>}
      </div>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(37,35,95,0.06)] sm:p-7">
        <div className="mb-5 flex items-center gap-2 text-primary"><Plus size={19} /><h3 className="font-black">{draft.id ? 'تعديل مزود' : 'إضافة مزود جديد'}</h3></div>
        <div className="space-y-4">
          <label className="block space-y-2"><span className="text-sm font-bold">اسم المزود</span><Input className="h-11 rounded-xl" value={draft.name} onChange={event => updateDraft('name', event.target.value)} placeholder="مثال: FASHN" /></label>
          <label className="block space-y-2"><span className="text-sm font-bold">رابط API</span><Input className="h-11 rounded-xl" dir="ltr" value={draft.baseUrl} onChange={event => updateDraft('baseUrl', event.target.value)} placeholder="https://api.example.com/v1" /></label>
          <label className="block space-y-2"><span className="text-sm font-bold">اسم النموذج أو العملية</span><Input className="h-11 rounded-xl" dir="ltr" value={draft.model} onChange={event => updateDraft('model', event.target.value)} placeholder="virtual-try-on" /></label>
          <label className="block space-y-2"><span className="text-sm font-bold">مفتاح API {draft.id && <span className="font-normal text-muted-foreground">اتركه فارغاً للإبقاء على المفتاح السابق</span>}</span><Input className="h-11 rounded-xl" dir="ltr" type="password" value={draft.apiKey} onChange={event => updateDraft('apiKey', event.target.value)} placeholder="لن يظهر المفتاح بعد الحفظ" autoComplete="off" /></label>
          <button type="button" onClick={() => updateDraft('enabled', !draft.enabled)} className="flex items-center gap-3 text-sm font-bold"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${draft.enabled ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>{draft.enabled && <Check size={14} />}</span>تفعيل هذا المزود</button>
          <div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setDraft(emptyDraft())} className="min-h-12 rounded-xl bg-secondary text-sm font-black text-primary">إلغاء</button><button type="button" disabled={saveMutation.isPending || !draft.name || !draft.baseUrl || !draft.model || (!draft.id && !draft.apiKey)} onClick={submitProvider} className="min-h-12 rounded-xl bg-primary text-sm font-black text-primary-foreground disabled:opacity-50">{saveMutation.isPending ? 'جارٍ الحفظ…' : 'حفظ المزود'}</button></div>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(37,35,95,0.06)] sm:p-7">
        <div className="mb-4 flex items-center gap-2 text-primary"><ServerCog size={19} /><h3 className="font-black">المزودون المحفوظون</h3></div>
        {providersQuery.isLoading && <p className="text-sm text-muted-foreground">جارٍ تحميل المزودين…</p>}
        {!providersQuery.isLoading && !providersQuery.data?.length && <p className="rounded-2xl bg-secondary/70 p-4 text-sm leading-6 text-muted-foreground">لم تضف مزوداً بعد. ابدأ بمزود واحد فقط ثم اختبره قبل إضافة مزود آخر.</p>}
        <div className="space-y-3">
          {providersQuery.data?.map(provider => <div key={provider.id} className="rounded-2xl border border-stone-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-foreground">{provider.name}</p><p className="mt-1 text-xs text-muted-foreground" dir="ltr">{provider.baseUrl}</p><p className="mt-1 text-xs text-muted-foreground">{provider.model} · {provider.enabled ? 'مفعّل' : 'متوقف'} · {provider.hasApiKey ? 'مفتاح محفوظ' : 'لا يوجد مفتاح'}</p></div><div className="flex gap-1"><button type="button" onClick={() => setDraft(providerToDraft(provider))} className="rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-primary">تعديل</button><button type="button" disabled={checkMutation.isPending} onClick={() => checkMutation.mutate({ id: provider.id })} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">اختبار</button><button type="button" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate({ id: provider.id })} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600" aria-label={`حذف ${provider.name}`}><Trash2 size={17} /></button></div></div></div>)}
        </div>
      </section>
      <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(37,35,95,0.06)] sm:p-7">
        <div className="mb-4 flex items-center justify-between gap-3 text-primary"><div className="flex items-center gap-2"><KeyRound size={19} /><h3 className="font-black">السجل التشخيصي</h3></div><button type="button" onClick={() => setDiagnostics([])} className="text-xs font-bold text-muted-foreground">مسح السجل</button></div>
        {!diagnostics.length && <p className="rounded-2xl bg-secondary/70 p-4 text-sm text-muted-foreground">لا توجد أحداث في الجلسة الحالية.</p>}
        <div className="space-y-2">{diagnostics.map(entry => <div key={entry.id} className="flex items-start gap-3 rounded-2xl bg-secondary/60 p-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${entry.level === 'success' ? 'bg-emerald-500' : entry.level === 'error' ? 'bg-red-500' : 'bg-primary'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground">{entry.message}</p><p className="mt-1 text-xs text-muted-foreground">{entry.at}</p></div></div>)}</div>
      </section>
      <button type="button" onClick={onBack} className="w-full py-2 text-sm font-bold text-muted-foreground">العودة إلى الإنشاء</button>
    </section>
  );
}
