import { Eye, EyeOff, MessageSquareText, Send, ShieldCheck, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

type Inspection = {
  index: number;
  provider: string | null;
  providerLabel: string;
  state: 'valid' | 'invalid' | 'limited' | 'unavailable' | 'unrecognized';
  message: string;
  suggestedUses: string[];
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'owner';
  text: string;
  results?: Inspection[];
};

const welcome: ChatMessage = {
  id: 'private-key-welcome',
  role: 'assistant',
  text: 'ألصق دفعة المفاتيح مرة واحدة. سنصنف الصيغ المعروفة محلياً، ثم نتحقق من الموفّرات المعروفة فقط. لا تظهر القيم في النتيجة ولا تحفظ في السجل أو قاعدة البيانات.',
};

const stateLabel: Record<Inspection['state'], string> = {
  valid: 'صالح',
  invalid: 'مرفوض',
  limited: 'مقيّد',
  unavailable: 'تعذر الفحص',
  unrecognized: 'غير معروف',
};

const stateTone: Record<Inspection['state'], string> = {
  valid: 'bg-emerald-50 text-emerald-700',
  invalid: 'bg-red-50 text-red-700',
  limited: 'bg-amber-50 text-amber-800',
  unavailable: 'bg-secondary text-muted-foreground',
  unrecognized: 'bg-secondary text-muted-foreground',
};

function keyCount(value: string) {
  return value.split(/[\s,;]+/).map(item => item.trim()).filter(Boolean).length;
}

function nextChatMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `private-key-chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PrivateKeyChat() {
  const [batch, setBatch] = useState('');
  const [masked, setMasked] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const inspectMutation = trpc.developer.privateKeyChat.inspectBatch.useMutation({
    onSuccess: results => {
      const valid = results.filter(result => result.state === 'valid').length;
      const recognized = results.filter(result => result.provider).length;
      setMessages(current => [...current, {
        id: nextChatMessageId(),
        role: 'assistant',
        text: `اكتمل الفحص المؤقت: تعرّفنا إلى ${recognized} من ${results.length} مفتاحاً، وصالح منها ${valid}. لا تحتوي هذه النتيجة على أي قيمة مفتاح.`,
        results,
      }]);
    },
    onError: () => toast.error('تعذر فحص الدفعة. لم تُحفظ أي قيمة؛ أعد اللصق وحاول مرة أخرى.'),
  });

  const submit = () => {
    const rawKeys = batch.trim();
    if (!rawKeys) return;
    const count = keyCount(rawKeys);
    setBatch('');
    setMessages(current => [...current, { id: nextChatMessageId(), role: 'owner', text: `أرسلت دفعة خاصة تضم ${count} مفتاحاً للفحص المؤقت.` }]);
    inspectMutation.mutate({ rawKeys });
  };

  const clearSession = () => {
    setBatch('');
    setMessages([welcome]);
    toast.success('تم مسح المحادثة من هذه الجلسة.');
  };

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(37,35,95,0.06)] sm:p-7" dir="rtl">
      <div className="mb-4 flex items-start justify-between gap-3 text-primary">
        <div><div className="flex items-center gap-2"><MessageSquareText size={19} /><h3 className="font-black">محادثة المفاتيح الخاصة</h3></div><p className="mt-2 text-sm leading-6 text-muted-foreground">مخصصة لجلسة المطور الحالية فقط. لا تحفظ القيم ولا تدخل في النسخ الاحتياطي أو السجل التشخيصي.</p></div>
        <button type="button" onClick={clearSession} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary" aria-label="مسح محادثة المفاتيح"><Trash2 size={18} /></button>
      </div>
      <div className="space-y-3">
        {messages.map(message => <article key={message.id} className={`rounded-2xl p-4 ${message.role === 'assistant' ? 'bg-secondary/70 text-foreground' : 'bg-violet-50 text-primary'}`}>
          <p className="text-sm leading-6">{message.text}</p>
          {message.results && <div className="mt-3 space-y-2">{message.results.map(result => <div key={result.index} className="rounded-2xl border border-stone-100 bg-white p-3 text-foreground"><div className="flex items-center justify-between gap-3"><p className="font-black">مفتاح #{result.index} · {result.providerLabel}</p><span className={`rounded-full px-2 py-1 text-xs font-bold ${stateTone[result.state]}`}>{stateLabel[result.state]}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{result.message}</p><p className="mt-2 text-xs font-bold text-primary">الاستخدامات المناسبة: {result.suggestedUses.join(' · ')}</p></div>)}</div>}
        </article>)}
      </div>
      <div className="mt-4 rounded-2xl border border-stone-100 p-3">
        <div className="mb-2 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs font-bold text-primary"><ShieldCheck size={15} /> حتى 40 مفتاحاً، مفصولاً بسطر أو مسافة</span><button type="button" onClick={() => setMasked(current => !current)} className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">{masked ? <Eye size={15} /> : <EyeOff size={15} />}{masked ? 'إظهار مؤقت' : 'إخفاء القيم'}</button></div>
        <textarea value={batch} onChange={event => setBatch(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} style={{ WebkitTextSecurity: masked ? 'disc' : 'none' } as React.CSSProperties} className="min-h-20 w-full rounded-xl border border-stone-100 bg-secondary/70 p-3 text-left text-sm outline-none focus:border-primary" dir="ltr" placeholder="ألصق المفاتيح هنا فقط…" aria-label="دفعة مفاتيح API خاصة" />
        <button type="button" disabled={inspectMutation.isPending || !batch.trim()} onClick={submit} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"><Send size={16} />{inspectMutation.isPending ? 'جارٍ الفحص المؤقت…' : 'إرسال الدفعة للفحص'}</button>
      </div>
    </section>
  );
}
