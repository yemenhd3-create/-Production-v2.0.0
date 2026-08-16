import { CheckCircle2, Download, FileCheck2, ShieldCheck, TriangleAlert, XCircle } from 'lucide-react';
import type { DesignPassport } from '@/lib/designPassport';

interface DesignPassportCardProps {
  passport: DesignPassport;
  onDownload: () => void;
}

const statusIcon = {
  pass: CheckCircle2,
  warn: TriangleAlert,
  fail: XCircle,
} as const;

const statusColor = {
  pass: 'text-emerald-600',
  warn: 'text-amber-600',
  fail: 'text-red-600',
} as const;

export default function DesignPassportCard({ passport, onDownload }: DesignPassportCardProps) {
  const failed = passport.checks.filter(check => check.status === 'fail').length;
  const warned = passport.checks.filter(check => check.status === 'warn').length;

  return (
    <section className="rounded-3xl border border-primary/10 bg-white p-5 shadow-[0_12px_30px_rgba(37,35,95,0.06)]" dir="rtl" aria-label="نتيجة فحص جودة الإعلان">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary"><FileCheck2 size={19} /><h3 className="font-black">جواز جودة التصميم</h3></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">فحص اختياري للناتج النهائي على هذا الهاتف فقط، ولا يمنع الحفظ أو المشاركة.</p>
        </div>
        <ShieldCheck size={22} className="shrink-0 text-emerald-600" aria-hidden="true" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px] font-bold sm:grid-cols-4">
        <div className="rounded-2xl bg-secondary/40 p-2.5">{passport.dimensions.width}×{passport.dimensions.height}</div>
        <div className="rounded-2xl bg-secondary/40 p-2.5">{Math.max(1, Math.round(passport.renderBytes / 1024))} KB</div>
        <div className="rounded-2xl bg-secondary/40 p-2.5">{failed ? `${failed} فشل` : 'بلا فشل'}</div>
        <div className="rounded-2xl bg-secondary/40 p-2.5">{warned ? `${warned} تنبيه` : 'بلا تنبيه'}</div>
      </div>

      <div className="mt-3 space-y-2">
        {passport.checks.map(check => {
          const Icon = statusIcon[check.status];
          return (
            <div key={check.id} className="flex items-start gap-2 rounded-2xl bg-secondary/30 p-3 text-xs leading-5">
              <Icon size={16} className={`mt-0.5 shrink-0 ${statusColor[check.status]}`} aria-hidden="true" />
              <div><strong className="text-foreground">{check.label}</strong><p className="mt-0.5 text-muted-foreground">{check.detail}</p></div>
            </div>
          );
        })}
      </div>

      <button type="button" onClick={onDownload} className="reference-outline mt-4 w-full"><Download size={17} /> حفظ جواز الجودة JSON</button>
    </section>
  );
}
