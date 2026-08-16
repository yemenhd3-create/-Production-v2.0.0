import type { DesignDecisionReason, TemplateSize } from './types';
import type { NormalizedBox } from './designGeometry';

export interface DesignBenchmarkMetrics {
  productVisibility: number;
  textReadability: number;
  contrast: number;
  safeArea: number;
  collisionFree: number;
  footerSafety: number;
  logoSafety: number;
  cropQuality: number;
  whitespaceBalance: number;
}

export interface DesignBenchmark {
  template: TemplateSize;
  score: number;
  safetyScore: number;
  balanceScore: number;
  metrics: DesignBenchmarkMetrics;
  violations: string[];
  reasons: DesignDecisionReason[];
  labels: Array<'best-overall' | 'safest' | 'best-balanced' | 'pareto'>;
}

/** بصمة هندسية صغيرة؛ لا تحتوي صورة أو بيانات متجر أو نص المنتج. */
export interface DesignQualityFingerprint {
  version: 1;
  template: TemplateSize;
  elementBoxes: Array<{ id: string; visible: boolean; box: NormalizedBox }>;
  metrics: Pick<DesignBenchmarkMetrics, 'productVisibility' | 'safeArea' | 'collisionFree' | 'footerSafety' | 'logoSafety' | 'whitespaceBalance'>;
  score: number;
  safetyScore: number;
  violations: string[];
}

export interface DesignRegression {
  status: 'stable' | 'improved' | 'regressed';
  reasons: string[];
  deltas: Record<string, number>;
  introducedViolations: string[];
}
