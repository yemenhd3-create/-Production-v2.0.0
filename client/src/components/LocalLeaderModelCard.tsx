import { Button } from '@/components/ui/button';
import { askLocalLeaderModel, getLocalModelCapability, isLocalLeaderModelCached, loadLocalLeaderModel, LOCAL_LEADER_MODEL_LABEL, LOCAL_LEADER_VRAM_MB, removeLocalLeaderModel } from '@/lib/localLeaderModel';
import { CheckCircle2, Cpu, Download, LoaderCircle, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

type LocalLeaderModelCardProps = {
  onReadyChange: (ready: boolean) => void;
};

export default function LocalLeaderModelCard({ onReadyChange }: LocalLeaderModelCardProps) {
  const [capability] = useState(() => getLocalModelCapability());
  const [cached, setCached] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('لم يُنزّل النموذج بعد. القائد المحلي الأساسي يعمل من دون نموذج.');

  useEffect(() => {
    let active = true;
    if (!capability.supported) return;
    void isLocalLeaderModelCached().then(value => { if (active) { setCached(value); if (value) setStatus('النموذج محفوظ في المتصفح، لكنه يحتاج تحميلاً في الذاكرة عند كل فتح.'); } }).catch(() => undefined);
    return () => { active = false; };
  }, [capability.supported]);

  const setReadyState = (value: boolean) => { setReady(value); onReadyChange(value); };
  const download = async () => {
    if (!capability.supported || loading) return;
    setLoading(true);
    setStatus('نجهّز المحرك المحلي…');
    try {
      await loadLocalLeaderModel(text => setStatus(text || 'يجري تنزيل وتجهيز النموذج…'));
      setCached(true); setReadyState(true); setStatus('النموذج المحلي جاهز. سيستخدمه القائد للإجابات الحرة فقط؛ أوامر القالب تبقى محلية وتحتاج تأكيدك.');
    } catch (error) {
      setReadyState(false);
      setStatus(error instanceof Error ? `تعذر تجهيز النموذج: ${error.message}` : 'تعذر تجهيز النموذج. استمر القائد المحلي الأساسي في العمل.');
    } finally { setLoading(false); }
  };
  const remove = async () => {
    if (loading) return;
    setLoading(true); setStatus('جارٍ حذف ملفات النموذج المحلية…');
    try { await removeLocalLeaderModel(); setCached(false); setReadyState(false); setStatus('حُذفت ملفات النموذج. القائد المحلي الأساسي ما زال يعمل بلا إنترنت.'); }
    catch { setStatus('تعذر حذف كل ملفات النموذج. يمكنك إعادة المحاولة من الهاتف.'); }
    finally { setLoading(false); }
  };

  return <section className="rounded-3xl border border-primary/15 bg-primary/5 p-5" aria-label="نموذج القائد المحلي القابل للتنزيل">
    <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><Cpu size={21} /></div><div><span className="text-xs font-bold text-primary">وضع النموذج المحلي الاختياري</span><h3 className="mt-1 font-black text-foreground">{LOCAL_LEADER_MODEL_LABEL}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">نموذج واحد فقط يعمل داخل المتصفح عند نجاح WebGPU. يحتاج نحو {LOCAL_LEADER_VRAM_MB}MB من ذاكرة الرسوم على الأقل؛ لا تبدأه إلا إذا كان هاتفك حديثاً وبطاريته جيدة.</p></div></div>
    <p className="mt-4 rounded-2xl bg-white p-3 text-xs leading-5 text-muted-foreground" aria-live="polite">{capability.message}<br />{status}</p>
    <div className="mt-4 flex gap-2"><Button type="button" onClick={() => { void download(); }} disabled={!capability.supported || loading || ready} className="flex-1">{loading ? <LoaderCircle className="animate-spin" size={17} /> : ready ? <CheckCircle2 size={17} /> : <Download size={17} />}{ready ? 'جاهز محلياً' : cached ? 'تشغيل النموذج المحفوظ' : 'تنزيل وتجربة'}</Button>{(cached || ready) && <Button type="button" variant="outline" onClick={() => { void remove(); }} disabled={loading} aria-label="حذف النموذج المحلي"><Trash2 size={17} /></Button>}</div>
  </section>;
}

export { askLocalLeaderModel };
