import type { AdDetails, DesignDecisionReason, DesignSuggestion, TemplateSettings } from '@shared/types';
import type { DesignBenchmark, DesignBenchmarkMetrics, DesignQualityFingerprint, DesignRegression } from '@shared/designBenchmark';
import { compileDesignDocument } from './designCompiler';
import { evaluateDesignContract } from './designContract';

const round = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

/** يقارن المرشحين الحاليين فقط؛ لا يحلل الصورة ولا ينشئ أي طلب شبكة. */
export function buildDesignBenchmarks(details: AdDetails, settings: TemplateSettings, suggestion: DesignSuggestion): DesignBenchmark[] {
  const composition = new Map((suggestion.compositionScores || []).map(item => [item.size, item]));
  const candidates = suggestion.candidates.slice().sort((first, second) => first.size.localeCompare(second.size));
  const benchmarks = candidates.map(candidate => {
    const candidateSettings: TemplateSettings = { ...settings, size: candidate.size, smartGarmentTransform: candidate.garmentTransform };
    const report = evaluateDesignContract(compileDesignDocument(details, candidateSettings, { ...suggestion, selectedLayout: candidate.size }));
    const check = (id: string) => report.checks.find(item => item.id === id)?.value ?? 0;
    const score = composition.get(candidate.size)?.score ?? candidate.score;
    const metrics: DesignBenchmarkMetrics = {
      productVisibility: clamp((composition.get(candidate.size)?.metrics.quality ?? suggestion.quality.score) * .55 + (composition.get(candidate.size)?.metrics.geometrySafe ?? 70) * .45),
      textReadability: check('inside-canvas'),
      contrast: clamp(suggestion.quality.contrast * 2),
      safeArea: composition.get(candidate.size)?.metrics.safeArea ?? 0,
      collisionFree: report.checks.filter(item => item.id !== 'price-required').every(item => item.status === 'pass') ? 100 : 0,
      footerSafety: Math.round((check('footer-avoids-price') + check('footer-avoids-features')) / 2),
      logoSafety: check('logo-avoids-product'),
      cropQuality: clamp(100 - Math.abs(suggestion.foreground.coverage - .42) * 160),
      whitespaceBalance: clamp(100 - Math.abs(suggestion.foreground.coverage - .42) * 180),
    };
    const safetyScore = round((metrics.safeArea + metrics.collisionFree + metrics.footerSafety + metrics.logoSafety) / 4);
    const balanceScore = round(Math.min(metrics.productVisibility, metrics.safeArea, metrics.whitespaceBalance));
    const violations = report.checks.filter(item => item.status === 'fail').map(item => item.id);
    const reasons: DesignDecisionReason[] = [candidate.reasons[0], candidate.reasons[1], composition.get(candidate.size)?.reason].filter(Boolean) as DesignDecisionReason[];
    return { template: candidate.size, score: round(score), safetyScore, balanceScore, metrics, violations, reasons, labels: [] };
  });
  return labelPareto(benchmarks);
}

export function createQualityFingerprint(details: AdDetails, settings: TemplateSettings, suggestion: DesignSuggestion, benchmark: DesignBenchmark): DesignQualityFingerprint {
  const document = compileDesignDocument(details, { ...settings, size: benchmark.template, smartGarmentTransform: suggestion.candidates.find(item => item.size === benchmark.template)?.garmentTransform }, { ...suggestion, selectedLayout: benchmark.template });
  return {
    version: 1,
    template: benchmark.template,
    elementBoxes: document.elements.map(item => ({ id: item.id, visible: item.visible, box: { ...item.box } })),
    metrics: pickFingerprintMetrics(benchmark.metrics),
    score: benchmark.score,
    safetyScore: benchmark.safetyScore,
    violations: [...benchmark.violations].sort(),
  };
}

export function detectDesignRegression(previous: DesignQualityFingerprint, next: DesignQualityFingerprint, tolerance = .01): DesignRegression {
  const deltas = {
    score: round(next.score - previous.score),
    safetyScore: round(next.safetyScore - previous.safetyScore),
    productVisibility: round(next.metrics.productVisibility - previous.metrics.productVisibility),
    safeArea: round(next.metrics.safeArea - previous.metrics.safeArea),
    whitespaceBalance: round(next.metrics.whitespaceBalance - previous.metrics.whitespaceBalance),
  };
  const introducedViolations = next.violations.filter(item => !previous.violations.includes(item));
  const reasons: string[] = [];
  if (introducedViolations.length) reasons.push(`مخالفة جديدة: ${introducedViolations.join('، ')}`);
  if (deltas.score <= -8 - tolerance) reasons.push(`انخفضت النتيجة الإجمالية ${Math.abs(deltas.score)} نقاط.`);
  if (deltas.safetyScore <= -5 - tolerance) reasons.push(`انخفض الأمان الهندسي ${Math.abs(deltas.safetyScore)} نقاط.`);
  if (deltas.productVisibility <= -10 - tolerance) reasons.push(`انخفضت مساحة ظهور القطعة ${Math.abs(deltas.productVisibility)} نقاط.`);
  if (reasons.length) return { status: 'regressed', reasons, deltas, introducedViolations };
  const improved = deltas.score >= 4 + tolerance || deltas.safetyScore >= 4 + tolerance;
  return { status: improved ? 'improved' : 'stable', reasons: improved ? ['تحسن التصميم من دون ظهور مخالفة جديدة.'] : ['لا يوجد تراجع يتجاوز حدود المقارنة المحلية.'], deltas, introducedViolations: [] };
}

function labelPareto(benchmarks: DesignBenchmark[]): DesignBenchmark[] {
  const maxOverall = Math.max(...benchmarks.map(item => item.score));
  const maxSafety = Math.max(...benchmarks.map(item => item.safetyScore));
  const maxBalance = Math.max(...benchmarks.map(item => item.balanceScore));
  return benchmarks.map(item => {
    const labels: DesignBenchmark['labels'] = [];
    if (item.score === maxOverall) labels.push('best-overall');
    if (item.safetyScore === maxSafety) labels.push('safest');
    if (item.balanceScore === maxBalance) labels.push('best-balanced');
    const dominated = benchmarks.some(other => other !== item && other.score >= item.score && other.safetyScore >= item.safetyScore && other.balanceScore >= item.balanceScore && (other.score > item.score || other.safetyScore > item.safetyScore || other.balanceScore > item.balanceScore));
    if (!dominated) labels.push('pareto');
    return { ...item, labels };
  }).sort((first, second) => second.score - first.score || first.template.localeCompare(second.template));
}

function pickFingerprintMetrics(metrics: DesignBenchmarkMetrics) {
  return { productVisibility: round(metrics.productVisibility), safeArea: round(metrics.safeArea), collisionFree: round(metrics.collisionFree), footerSafety: round(metrics.footerSafety), logoSafety: round(metrics.logoSafety), whitespaceBalance: round(metrics.whitespaceBalance) };
}
