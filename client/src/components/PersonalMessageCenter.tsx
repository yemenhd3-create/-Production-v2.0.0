import { ArrowRight, Megaphone, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

export default function PersonalMessageCenter({ onBack }: { onBack: () => void }) {
  const [message, setMessage] = useState('');
  const announcementQuery = trpc.personal.announcement.useQuery();
  const sendMutation = trpc.personal.sendMessage.useMutation({
    onSuccess: () => {
      setMessage('');
      toast.success('تم إرسال رسالتك للمطور.');
    },
    onError: error => toast.error(error.message || 'تعذر إرسال الرسالة حالياً.'),
  });

  return (
    <section className="space-y-5" dir="rtl">
      <div className="rounded-[28px] bg-white p-5 shadow-[0_16px_40px_rgba(37,35,95,0.08)] sm:p-7">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowRight size={17} /> العودة إلى الإنشاء</button>
        <div className="mt-5 flex items-center gap-3 text-primary"><Megaphone size={22} /><h2 className="text-2xl font-black">رسائل المشروع</h2></div>
        {announcementQuery.data ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
            <p className="mb-1 font-black">رسالة من المطور</p>
            <p>{announcementQuery.data.message}</p>
          </div>
        ) : <p className="mt-5 rounded-2xl bg-secondary/70 p-4 text-sm text-muted-foreground">لا توجد رسالة عامة من المطور حالياً.</p>}
      </div>

      <div className="rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(37,35,95,0.06)] sm:p-7">
        <h3 className="font-black text-foreground">أرسل رسالة للمطور</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">اكتب ملاحظة عن التطبيق أو سؤالاً تقنياً. لا ترسل مفاتيح أو كلمات مرور في الرسالة.</p>
        <textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={1200} className="mt-4 min-h-32 w-full rounded-2xl border border-stone-200 bg-white p-4 text-right text-base outline-none focus:border-primary" placeholder="اكتب رسالتك هنا…" />
        <button type="button" disabled={!message.trim() || sendMutation.isPending} onClick={() => sendMutation.mutate({ message: message.trim() })} className="mt-4 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-black text-primary-foreground disabled:opacity-50"><Send size={19} />{sendMutation.isPending ? 'جارٍ الإرسال…' : 'إرسال للمطور'}</button>
      </div>
    </section>
  );
}
