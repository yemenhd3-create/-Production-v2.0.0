import * as React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Wrench } from 'lucide-react';
import type { DesignRepairId } from '@shared/designDocument';
import type { DesignQualityReport } from '@/lib/designQualityGate';

export default function DesignQualityGateCard({ report, onApplyRepair }: { report: DesignQualityReport; onApplyRepair: (id: DesignRepairId) => void }) {
  const errors = report.issues.filter(issue => issue.severity === 'error');
  const warnings = report.issues.filter(issue => issue.severity === 'warning');
  const pixelTruthStatus = report.pixelTruth?.status.toUpperCase();
  return <section className={`rounded-2xl border p-4 ${report.exportAllowed ? 'border-sky-200 bg-sky-50' : 'border-amber-200 bg-amber-50'}`} dir="rtl">
    <div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${report.exportAllowed ? 'bg-sky-600 text-white' : 'bg-amber-500 text-white'}`}>{report.exportAllowed ? <CheckCircle2 size={21} /> : <ShieldAlert size={21} />}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black text-primary">بوابة جودة التصدير</h3><span className="rounded-xl bg-white px-2 py-1 text-xs font-black text-primary">{report.score}/100</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{report.exportAllowed ? 'لا توجد أخطاء هندسية حرجة؛ تستطيع الحفظ والمشاركة.' : 'أصلح الخطأ الهندسي الحرج أو أعد ضبط العنصر قبل الحفظ والمشاركة.'}</p></div></div>
    {pixelTruthStatus && <div className="mt-3 flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-700"><span className="font-bold">فحص بكسلات النص</span><span className="font-black text-primary">{pixelTruthStatus}</span></div>}
    {!!errors.length && <div className="mt-3 space-y-2">{errors.map((issue, index) => <div key={`${issue.code}-${index}`} className="flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs leading-5 text-slate-700"><ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />{issue.messageAr}</div>)}</div>}
    {!!warnings.length && <div className="mt-3 space-y-2">{warnings.map((issue, index) => <div key={`${issue.code}-${index}`} className="flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs leading-5 text-slate-700"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />{issue.messageAr}</div>)}</div>}
    {!report.exportAllowed && !!report.repairs.length && <div className="mt-3 flex flex-wrap gap-2">{report.repairs.map(repair => <button key={repair.id} type="button" onClick={() => onApplyRepair(repair.id)} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-primary shadow-sm transition active:scale-95"><Wrench size={15} />{repair.title}</button>)}</div>}
  </section>;
}
