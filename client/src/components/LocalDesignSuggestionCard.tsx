import { Check, CircleAlert, Palette, RotateCcw, Sparkles, Wand2, X } from 'lucide-react';
import type { DesignSuggestion, TemplateSize } from '@shared/types';

const SIZE_LABELS: Record<TemplateSize, string> = { portrait: 'عمودي', square: 'مربع', story: 'قصة', whatsapp: 'واتساب', landscape: 'أفقي' };

interface LocalDesignSuggestionCardProps {
  suggestion: DesignSuggestion;
  selectedSize: TemplateSize;
  currentSize: TemplateSize;
  onSelectSize: (size: TemplateSize) => void;
  onAccept: () => void;
  onIgnore: () => void;
  onUndo?: () => void;
  accepted?: boolean;
  preferencesEnabled?: boolean;
  onTogglePreferences?: () => void;
  onClearPreferences?: () => void;
}

export default function LocalDesignSuggestionCard({ suggestion, selectedSize, currentSize, onSelectSize, onAccept, onIgnore, onUndo, accepted = false, preferencesEnabled = true, onTogglePreferences, onClearPreferences }: LocalDesignSuggestionCardProps) {
  const selected = suggestion.candidates.find(candidate => candidate.size === selectedSize) || suggestion.candidates[0];
  return <section className="rounded-[24px] border border-primary/15 bg-white p-4 shadow-sm" aria-label="اقتراح المصمم المحلي الذكي">
    <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Wand2 size={20} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="font-black text-primary">اقتراح المصمم المحلي</h3><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">ثقة {suggestion.confidence}%</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">يعمل على هاتفك فقط. راجع البدائل ثم اعتمد ما يناسبك.</p></div></div>
    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]"><div className="rounded-xl bg-secondary/60 p-3"><span className="font-black text-primary">جودة الصورة</span><p className="mt-1 font-bold text-foreground">{suggestion.quality.score}/100</p></div><div className="rounded-xl bg-secondary/60 p-3"><span className="font-black text-primary">القص المقترح</span><p className="mt-1 font-bold text-foreground">هامش آمن {Math.round(suggestion.crop.safeMargin * 100)}%</p></div></div>
    <div className="mt-3 rounded-2xl border border-primary/10 bg-primary/[.035] p-3"><div className="flex items-center gap-2 text-xs font-black text-primary"><Palette size={15} />ألوان القطعة وخلفية مقروءة</div><div className="mt-2 flex flex-wrap gap-2">{suggestion.colors.map(color => <span key={color.hex} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[10px] font-bold"><i className="h-4 w-4 rounded-full border" style={{ backgroundColor: color.hex }} aria-hidden="true" />{color.label}</span>)}</div><p className="mt-2 text-[11px] font-bold text-muted-foreground">الخلفية: <span className="text-foreground" dir="ltr">{suggestion.suggestedBackground}</span></p></div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]"><div className="rounded-xl border border-stone-100 bg-stone-50 p-2.5"><span className="font-black text-muted-foreground">التصميم الحالي</span><p className="mt-1 font-black text-foreground">{SIZE_LABELS[currentSize]}</p></div><div className="rounded-xl border border-primary/15 bg-primary/[.04] p-2.5"><span className="font-black text-primary">بعد الاعتماد</span><p className="mt-1 font-black text-foreground">{SIZE_LABELS[selectedSize]}</p></div></div>
    <div className="mt-3"><p className="mb-2 text-xs font-black text-primary">أفضل تخطيطات مقترحة</p><div className="space-y-2">{suggestion.candidates.map((candidate, index) => <button key={candidate.size} type="button" onClick={() => onSelectSize(candidate.size)} aria-pressed={candidate.size === selectedSize} className={`w-full rounded-xl border p-3 text-right transition active:scale-[.99] ${candidate.size === selectedSize ? 'border-primary bg-primary/[.06]' : 'border-stone-100 bg-white'}`}><div className="flex items-center justify-between gap-3"><span className="font-black text-primary">{index + 1}. {SIZE_LABELS[candidate.size]}</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-primary">{candidate.score}/100</span></div><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{candidate.reasons.at(-1)?.explanation || candidate.reasons[0]?.explanation || 'تخطيط متوازن للقطعة.'}</p></button>)}</div></div>
    {selected?.reasons?.length ? <div className="mt-3 rounded-2xl bg-emerald-50 p-3"><p className="text-[11px] font-black text-emerald-800">لماذا هذا الخيار؟</p>{selected.reasons.slice(0, 2).map(reason => <p key={reason.title} className="mt-1 text-[11px] leading-5 text-emerald-950"><b>{reason.title}: </b>{reason.explanation}</p>)}</div> : null}
    {suggestion.suggestedText ? <p className="mt-3 rounded-2xl border border-primary/10 p-3 text-xs leading-5 text-foreground">{suggestion.suggestedText}</p> : null}
    {suggestion.warnings.length ? <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-900"><CircleAlert className="ml-1 inline" size={14} />{suggestion.warnings.slice(0, 3).map(warning => <p key={warning}>• {warning}</p>)}</div> : null}
    {onTogglePreferences ? <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-stone-100 p-3"><div><p className="text-[11px] font-black text-primary">تعلّم محلي اختياري</p><p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">يتذكر التخطيطات التي تعتمدها على هذا الهاتف فقط.</p></div><button type="button" onClick={onTogglePreferences} aria-pressed={preferencesEnabled} className={`rounded-xl px-3 py-2 text-[10px] font-black ${preferencesEnabled ? 'bg-primary text-white' : 'bg-secondary text-primary'}`}>{preferencesEnabled ? 'مفعّل' : 'متوقف'}</button></div> : null}
    {onClearPreferences ? <button type="button" onClick={onClearPreferences} className="mt-2 text-xs font-bold text-muted-foreground underline underline-offset-4">مسح تفضيلات المصمم من هذا الهاتف</button> : null}
    <div className="mt-4 grid grid-cols-2 gap-2">{accepted && onUndo ? <button type="button" onClick={onUndo} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-black text-primary"><RotateCcw size={17} />تراجع</button> : <button type="button" onClick={onIgnore} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-black text-primary"><X size={17} />تجاهل</button>}<button type="button" onClick={onAccept} className="reference-primary min-h-12 text-sm"><Check size={18} />{accepted ? 'تحديث الاقتراح' : 'اعتماد الاقتراح'}</button></div>
  </section>;
}
