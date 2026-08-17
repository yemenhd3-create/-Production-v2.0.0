import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { MerchantCommand, MerchantProfile } from '@shared/merchantAssistant';
import type { TemplateSettings } from '@shared/types';
import { buildDeveloperInsight, describeMerchantCommands, parseMerchantCommands } from '@shared/merchantAssistant';
import { CheckCircle2, Clipboard, MessageSquareText, RotateCcw, Send, ShieldCheck, Sparkles, Trash2, User } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

type MerchantAssistantWorkspaceProps = {
  profile: MerchantProfile;
  template: TemplateSettings;
  onCommitProfile: (profile: MerchantProfile) => void;
  onApplyCommands: (commands: MerchantCommand[]) => Promise<boolean>;
  onClearProfile: () => void;
};

type ProfileDraft = Pick<MerchantProfile, 'storeName' | 'storePhone' | 'storeLocation' | 'storeCategory' | 'defaultColors'>;
type LocalMessage = { role: 'user' | 'assistant'; content: string };

function toDraft(profile: MerchantProfile): ProfileDraft {
  return {
    storeName: profile.storeName,
    storePhone: profile.storePhone,
    storeLocation: profile.storeLocation,
    storeCategory: profile.storeCategory,
    defaultColors: profile.defaultColors,
  };
}

function profileFromDraft(profile: MerchantProfile, draft: ProfileDraft): MerchantProfile {
  return {
    ...profile,
    onboardingComplete: true,
    storeName: draft.storeName.trim().slice(0, 80),
    storePhone: draft.storePhone.trim().slice(0, 32),
    storeLocation: draft.storeLocation.trim().slice(0, 80),
    storeCategory: draft.storeCategory.trim().slice(0, 48),
    defaultColors: draft.defaultColors.map(color => color.trim()).filter(Boolean).slice(0, 4),
    updatedAt: Date.now(),
  };
}

export default function MerchantAssistantWorkspace({ profile, template, onCommitProfile, onApplyCommands, onClearProfile }: MerchantAssistantWorkspaceProps) {
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile));
  const [pendingProfile, setPendingProfile] = useState<MerchantProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(!profile.onboardingComplete);
  const [messages, setMessages] = useState<LocalMessage[]>(() => [{ role: 'assistant', content: 'أهلاً بك. أساعدك في ضبط متجرك وإعداد الإعلان بأوامر واضحة ومحلية على هاتفك.' }]);
  const [pendingCommands, setPendingCommands] = useState<MerchantCommand[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commandInput, setCommandInput] = useState('');

  useEffect(() => {
    setDraft(toDraft(profile));
    setEditingProfile(!profile.onboardingComplete);
  }, [profile]);

  const insight = useMemo(() => buildDeveloperInsight(profile), [profile]);

  const handleMessage = (content: string) => {
    const clean = content.trim();
    if (!clean) return;
    const commands = parseMerchantCommands(clean);
    setPendingCommands(commands);
    setMessages(current => [
      ...current,
      { role: 'user', content: clean },
      { role: 'assistant', content: describeMerchantCommands(commands) },
    ]);
    setCommandInput('');
  };

  const applyPendingCommands = async () => {
    if (pendingCommands.length === 0 || isApplying) return;
    setIsApplying(true);
    const applied = await onApplyCommands(pendingCommands);
    setIsApplying(false);
    if (applied) {
      setMessages(current => [...current, { role: 'assistant', content: 'تم تطبيق التغييرات المسموحة محلياً. يمكنك العودة إلى الإنشاء لمراجعة الإعلان.' }]);
      setPendingCommands([]);
    }
  };

  const requestProfileConfirmation = () => setPendingProfile(profileFromDraft(profile, draft));
  const confirmProfile = () => {
    if (!pendingProfile) return;
    onCommitProfile(pendingProfile);
    setPendingProfile(null);
    setEditingProfile(false);
    setMessages(current => [...current, { role: 'assistant', content: 'تم حفظ تفضيلات متجرك على هذا الجهاز فقط. يمكنك تعديلها أو مسحها متى شئت.' }]);
  };

  const copyInsight = async () => {
    try { await navigator.clipboard?.writeText(insight); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  };

  return (
    <section className="space-y-5" aria-label="مساعد التاجر المحلي">
      <div className="reference-card overflow-hidden p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><Sparkles size={22} /></div>
          <div className="min-w-0"><span className="text-xs font-bold text-primary">مساعد التاجر المحلي</span><h2 className="mt-1 text-2xl font-black text-foreground">رتّب متجرك وتحدث مع إعلانك</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">يفهم الأوامر الواضحة على هاتفك، ولا يرسل معلومات متجرك أو صورك إلى الإنترنت.</p></div>
        </div>
      </div>

      {editingProfile && (
        <section className="reference-card p-5" aria-label="إعداد المتجر">
          <div className="mb-5 flex items-start gap-3"><MessageSquareText className="mt-0.5 text-primary" size={21} /><div><h3 className="font-black text-primary">لنضبط أساس متجرك</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">أجب بما يناسبك أو اترك الحقل فارغاً. لن نحفظ شيئاً قبل أن تراجع الملخص.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={draft.storeName} onChange={event => setDraft(current => ({ ...current, storeName: event.target.value }))} placeholder="اسم المتجر" aria-label="اسم المتجر" />
            <Input value={draft.storeLocation} onChange={event => setDraft(current => ({ ...current, storeLocation: event.target.value }))} placeholder="المدينة أو الموقع — اختياري" aria-label="موقع المتجر" />
            <Input value={draft.storePhone} inputMode="tel" onChange={event => setDraft(current => ({ ...current, storePhone: event.target.value }))} placeholder="رقم التواصل أو واتساب — اختياري" aria-label="رقم التواصل" />
            <Input value={draft.storeCategory} onChange={event => setDraft(current => ({ ...current, storeCategory: event.target.value }))} placeholder="مثال: ملابس نسائية" aria-label="فئة المتجر" />
            <Input value={draft.defaultColors.join('، ')} onChange={event => setDraft(current => ({ ...current, defaultColors: event.target.value.split(/[،,]/) }))} placeholder="ألوانك المفضلة — اختياري" aria-label="الألوان المفضلة" />
          </div>
          <Button type="button" onClick={requestProfileConfirmation} className="mt-5 w-full"><CheckCircle2 size={18} /> مراجعة وحفظ الإعداد</Button>
        </section>
      )}

      {pendingProfile && (
        <section className="rounded-3xl border border-primary/15 bg-primary/5 p-5" aria-label="تأكيد بيانات المتجر">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-primary" size={21} /><div><h3 className="font-black text-primary">راجع قبل الحفظ المحلي</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">سيُحفظ هذا الملخص على هذا الجهاز فقط، ويمكنك مسحه من هذه الصفحة.</p></div></div>
          <dl className="mt-4 grid gap-2 text-sm text-foreground"><div><dt className="inline font-bold">المتجر: </dt><dd className="inline">{pendingProfile.storeName || 'غير محدد'}</dd></div><div><dt className="inline font-bold">الفئة: </dt><dd className="inline">{pendingProfile.storeCategory || 'غير محددة'}</dd></div><div><dt className="inline font-bold">التفضيلات: </dt><dd className="inline">{pendingProfile.defaultColors.join('، ') || 'لا توجد'}</dd></div></dl>
          <div className="mt-5 flex gap-2"><Button type="button" onClick={confirmProfile} className="flex-1"><CheckCircle2 size={17} /> تأكيد الحفظ</Button><Button type="button" variant="outline" onClick={() => setPendingProfile(null)} className="flex-1">رجوع</Button></div>
        </section>
      )}

      {profile.onboardingComplete && !editingProfile && (
        <section className="reference-card p-5"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold text-primary">ذاكرتك المحلية</span><h3 className="mt-1 font-black text-foreground">{profile.storeName || 'متجرك جاهز'}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{profile.storeCategory || 'اضبط فئة المتجر من هنا.'}{profile.defaultColors.length ? ` · ${profile.defaultColors.join('، ')}` : ''}</p></div><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setEditingProfile(true)}><RotateCcw size={15} /> تعديل</Button><Button type="button" variant="outline" size="sm" onClick={onClearProfile} aria-label="مسح ذاكرة المساعد"><Trash2 size={15} /></Button></div></div></section>
      )}

      <section className="reference-card overflow-hidden">
        <div className="border-b border-primary/10 p-5"><h3 className="font-black text-primary">ماذا تريد أن تغيّر؟</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">جرّب: «استخدم القالب الليلي»، «كبّر صورة الملابس»، أو «لا تظهر العنوان».</p></div>
        <div className="space-y-3 bg-secondary p-4" style={{ maxHeight: '18rem', overflowY: 'auto' }} aria-live="polite">
          {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div style={{ maxWidth: '85%' }} className={`rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white text-foreground shadow-sm'}`}>{message.role === 'assistant' ? <Sparkles className="mb-1 text-primary" size={14} /> : <User className="mb-1" size={14} />}{message.content.split('\n').map((line, lineIndex) => <React.Fragment key={`${index}-${lineIndex}`}>{lineIndex > 0 && <br />}{line}</React.Fragment>)}</div></div>)}
        </div>
        <div className="border-t border-primary/10 bg-white p-4"><div className="mb-3 flex flex-wrap gap-2">{['استخدم القالب الليلي', 'كبّر صورة الملابس', 'لا تظهر العنوان'].map(prompt => <button key={prompt} type="button" onClick={() => handleMessage(prompt)} className="rounded-xl border border-primary/15 bg-secondary px-3 py-1.5 text-xs font-bold text-primary transition active:scale-95">{prompt}</button>)}</div><form onSubmit={event => { event.preventDefault(); handleMessage(commandInput); }} className="flex items-end gap-2"><Textarea value={commandInput} onChange={event => setCommandInput(event.target.value)} placeholder="اكتب طلبك بالعربية…" className="min-h-10 flex-1 resize-none" rows={1} aria-label="طلب للمساعد" /><Button type="submit" size="icon" disabled={!commandInput.trim()} aria-label="إرسال طلب للمساعد"><Send size={17} /></Button></form></div>
        {pendingCommands.length > 0 && <div className="border-t border-primary/10 bg-secondary p-4"><p className="text-xs leading-5 text-muted-foreground">لن يطبّق المساعد أي تغيير قبل ضغطك على الزر.</p><Button type="button" onClick={() => { void applyPendingCommands(); }} disabled={isApplying} className="mt-3 w-full"><Sparkles size={17} /> {isApplying ? 'جارٍ تطبيق التغيير…' : 'تطبيق التغيير المسموح'}</Button></div>}
      </section>

      <section className="rounded-3xl border border-[#e9e5ef] bg-white p-5"><div className="flex items-start gap-3"><Clipboard className="mt-0.5 text-primary" size={20} /><div className="min-w-0 flex-1"><h3 className="font-black text-primary">ملاحظة تحسين للمطور</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{insight}</p><p className="mt-2 text-[11px] font-bold text-muted-foreground">هذه مسودة محلية فقط؛ لا تُرسل تلقائياً ولا تحتوي محادثتك أو صورك.</p></div></div><Button type="button" variant="outline" size="sm" onClick={() => { void copyInsight(); }} className="mt-4 w-full"><Clipboard size={15} /> {copied ? 'تم النسخ' : 'نسخ المسودة'}</Button></section>

      <p className="px-2 text-center text-[11px] leading-5 text-muted-foreground">النمط الحالي: {template.visualTheme || 'classic'} · لا يوجد نموذج سحابي مفعل في هذه الصفحة.</p>
    </section>
  );
}
