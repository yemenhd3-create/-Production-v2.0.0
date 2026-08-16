import type { DesignContractReport, DesignRepairId } from '@shared/designDocument';
import { AlertTriangle, CheckCircle2, RotateCcw, ShieldCheck, Wrench } from 'lucide-react';

interface DesignContractCardProps {
  report: DesignContractReport;
  onApplyRepair: (repairId: DesignRepairId) => void;
  onUndoRepair?: () => void;
  hasUndoRepair?: boolean;
}

export default function DesignContractCard({ report, onApplyRepair, onUndoRepair, hasUndoRepair = false }: DesignContractCardProps) {
  const failed = report.checks.filter(check => check.status === 'fail');
  const passed = report.checks.filter(check => check.status === 'pass');
  const valid = report.status === 'pass';

  return (
    <section className={`rounded-2xl border p-4 ${valid ? 'border-sky-200 bg-sky-50' : 'border-amber-200 bg-amber-50'}`} dir="rtl" aria-label="نتيجة عقد التصميم المحلي">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${valid ? 'bg-sky-600 text-white' : 'bg-amber-500 text-white'}`}>
          {valid ? <ShieldCheck size={21} /> : <AlertTriangle size={21} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-primary">عقد التصميم المحلي</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {valid ? 'الهندسة الحالية اجتازت قيود القالب قبل التصدير.' : 'اكتشف الفحص تداخلاً أو خروجاً عن منطقة آمنة؛ يمكنك اختيار إصلاح واضح.'}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {(failed.length ? failed : passed).map(check => (
          <div key={check.id} className="flex gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-700">
            <CheckCircle2 size={15} className={check.status === 'pass' ? 'mt-0.5 shrink-0 text-emerald-600' : 'mt-0.5 shrink-0 text-amber-600'} />
            <div><p className="font-bold">{check.label}</p><p className="mt-0.5 leading-5 text-slate-600">{check.detail}</p></div>
          </div>
        ))}
      </div>

      {report.repairs.length > 0 && (
        <div className="mt-3 grid gap-2">
          {report.repairs.map(repair => (
            <button key={repair.id} type="button" onClick={() => onApplyRepair(repair.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]">
              <Wrench size={16} /> {repair.title}
            </button>
          ))}
        </div>
      )}

      {hasUndoRepair && onUndoRepair && (
        <button type="button" onClick={onUndoRepair} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-white px-3 text-xs font-black text-primary transition hover:bg-primary/5 active:scale-[0.98]">
          <RotateCcw size={15} /> التراجع عن آخر إصلاح للعقد
        </button>
      )}
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">الفحص محلي ولا يحفظ الصورة أو بيانات المتجر داخل العقد.</p>
    </section>
  );
}
