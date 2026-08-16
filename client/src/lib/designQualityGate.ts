import type { AdDetails } from '@shared/types';
import type { DesignBenchmark } from '@shared/designBenchmark';
import type { DesignContractReport, DesignDocument, DesignElementId, DesignRepairPlan } from '@shared/designDocument';
import { getDesignGeometry, type NormalizedBox } from '@shared/designGeometry';
import type { PixelTruthReport } from '@/lib/pixelTruthGate';

export type QualitySeverity = 'error' | 'warning';

export type QualityIssueCode =
  | 'OUT_OF_BOUNDS'
  | 'COLLISION'
  | 'TEXT_OVERFLOW'
  | 'LOGO_OUTSIDE_SAFE_AREA'
  | 'FOOTER_OVERLAP'
  | 'PRICE_HIDDEN'
  | 'LOW_CONTRAST'
  | 'PIXEL_CONTRAST'
  | 'INVALID_GEOMETRY'
  | 'INVALID_NUMBER';

export interface QualityIssue {
  code: QualityIssueCode;
  severity: QualitySeverity;
  elementIds: DesignElementId[];
  messageAr: string;
  metrics: Record<string, number>;
}

export interface DesignQualityReport {
  version: 1;
  score: number;
  exportAllowed: boolean;
  issues: QualityIssue[];
  repairs: DesignRepairPlan[];
  pixelTruth?: PixelTruthReport;
  metrics: {
    collisionCount: number;
    outOfBoundsCount: number;
    textOverflowCount: number;
    contrastScore: number;
    productVisibilityScore: number;
    logoSafetyScore: number;
    footerSafetyScore: number;
    whitespaceScore: number;
  };
}

const QUALITY_WEIGHTS = {
  productVisibility: 20,
  textReadability: 15,
  contrast: 15,
  safeArea: 15,
  footerSafety: 10,
  logoSafety: 10,
  whitespaceBalance: 10,
  cropQuality: 5,
} as const;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100) / 100));
const inside = (child: NormalizedBox, parent: NormalizedBox) => child.x >= parent.x && child.y >= parent.y && child.x + child.width <= parent.x + parent.width && child.y + child.height <= parent.y + parent.height;
const finiteBox = (box: NormalizedBox) => [box.x, box.y, box.width, box.height].every(Number.isFinite) && box.width >= 0 && box.height >= 0;
const element = (document: DesignDocument, id: DesignElementId) => document.elements.find(item => item.id === id);

function countTextWarning(details: AdDetails, document: DesignDocument): QualityIssue[] {
  const header = element(document, 'header');
  const footer = element(document, 'footer');
  const issues: QualityIssue[] = [];
  const titleLength = Array.from(`${details.productName} ${details.headline}`.trim()).length;
  const footerLength = Array.from(`${details.storeName} ${details.storePhone}`.trim()).length;
  const titleCapacity = header ? Math.max(12, Math.floor(header.box.width * header.box.height * 560)) : 0;
  const footerCapacity = footer ? Math.max(12, Math.floor(footer.box.width * footer.box.height * 420)) : 0;
  if (header?.visible && titleLength > titleCapacity) issues.push({ code: 'TEXT_OVERFLOW', severity: 'warning', elementIds: ['header'], messageAr: 'عنوان الإعلان طويل وقد يختصره الرسم للحفاظ على التخطيط.', metrics: { length: titleLength, capacity: titleCapacity } });
  if (footer?.visible && footerLength > footerCapacity) issues.push({ code: 'TEXT_OVERFLOW', severity: 'warning', elementIds: ['footer'], messageAr: 'بيانات التذييل طويلة وقد تختصر عند الرسم.', metrics: { length: footerLength, capacity: footerCapacity } });
  return issues;
}

/** بوابة محلية: الأخطاء الهندسية فقط تمنع التصدير؛ التحذيرات لا تمنع المستخدم. */
export function evaluateDesignQuality(document: DesignDocument, contract: DesignContractReport, details: AdDetails, benchmark?: DesignBenchmark, pixelTruth?: PixelTruthReport): DesignQualityReport {
  const geometry = getDesignGeometry(document.template);
  const issues: QualityIssue[] = [];
  const visible = document.elements.filter(item => item.visible);
  const invalid = visible.filter(item => !finiteBox(item.box));
  if (invalid.length) issues.push({ code: 'INVALID_NUMBER', severity: 'error', elementIds: invalid.map(item => item.id), messageAr: 'توجد قيمة هندسية غير صالحة في أحد عناصر التصميم.', metrics: { invalidCount: invalid.length } });
  const outOfBounds = visible.filter(item => finiteBox(item.box) && !inside(item.box, { x: 0, y: 0, width: 1, height: 1 }));
  if (outOfBounds.length) issues.push({ code: 'OUT_OF_BOUNDS', severity: 'error', elementIds: outOfBounds.map(item => item.id), messageAr: 'عنصر مرئي خرج خارج حدود الإعلان.', metrics: { outOfBoundsCount: outOfBounds.length } });
  const logo = element(document, 'logo');
  if (logo?.visible && !inside(logo.box, geometry.safe)) issues.push({ code: 'LOGO_OUTSIDE_SAFE_AREA', severity: 'error', elementIds: ['logo'], messageAr: 'الشعار خارج المنطقة الآمنة للإعلان.', metrics: { safeX: geometry.safe.x, safeY: geometry.safe.y } });
  const contractFailures = contract.checks.filter(item => item.status === 'fail');
  contractFailures.forEach(item => {
    const code: QualityIssueCode = item.id === 'price-required' ? 'PRICE_HIDDEN' : item.id.startsWith('footer-') ? 'FOOTER_OVERLAP' : item.id === 'inside-canvas' || item.id === 'product-inside-hero' ? 'OUT_OF_BOUNDS' : 'COLLISION';
    issues.push({ code, severity: 'error', elementIds: item.elements, messageAr: item.detail, metrics: { contractValue: item.value } });
  });
  issues.push(...countTextWarning(details, document));
  const metrics = benchmark?.metrics;
  if (metrics && metrics.contrast < 50) issues.push({ code: 'LOW_CONTRAST', severity: 'warning', elementIds: ['header', 'price'], messageAr: 'تباين النص المقدر منخفض؛ راجع لون الخلفية والنص قبل المشاركة.', metrics: { contrast: metrics.contrast } });
  pixelTruth?.checks.forEach(check => {
    if (check.id === 'render') return;
    if (check.status === 'block') issues.push({ code: 'PIXEL_CONTRAST', severity: 'error', elementIds: [check.id], messageAr: check.detail, metrics: { contrastRatio: check.contrastRatio ?? 0, coverage: check.foregroundCoverage } });
    if (check.status === 'warning') issues.push({ code: 'PIXEL_CONTRAST', severity: 'warning', elementIds: [check.id], messageAr: check.detail, metrics: { contrastRatio: check.contrastRatio ?? 0, coverage: check.foregroundCoverage } });
  });
  const score = metrics ? clamp(
    metrics.productVisibility * QUALITY_WEIGHTS.productVisibility / 100 +
    metrics.textReadability * QUALITY_WEIGHTS.textReadability / 100 +
    metrics.contrast * QUALITY_WEIGHTS.contrast / 100 +
    metrics.safeArea * QUALITY_WEIGHTS.safeArea / 100 +
    metrics.footerSafety * QUALITY_WEIGHTS.footerSafety / 100 +
    metrics.logoSafety * QUALITY_WEIGHTS.logoSafety / 100 +
    metrics.whitespaceBalance * QUALITY_WEIGHTS.whitespaceBalance / 100 +
    metrics.cropQuality * QUALITY_WEIGHTS.cropQuality / 100
  ) : contract.status === 'fail' ? 0 : 100;
  const errorCount = issues.filter(item => item.severity === 'error').length;
  return {
    version: 1,
    score,
    exportAllowed: errorCount === 0,
    issues,
    repairs: [...contract.repairs, ...(pixelTruth?.repairs || [])],
    pixelTruth,
    metrics: {
      collisionCount: issues.filter(item => item.code === 'COLLISION' || item.code === 'FOOTER_OVERLAP').length,
      outOfBoundsCount: issues.filter(item => item.code === 'OUT_OF_BOUNDS' || item.code === 'LOGO_OUTSIDE_SAFE_AREA').length,
      textOverflowCount: issues.filter(item => item.code === 'TEXT_OVERFLOW').length,
      contrastScore: metrics?.contrast ?? 100,
      productVisibilityScore: metrics?.productVisibility ?? 100,
      logoSafetyScore: metrics?.logoSafety ?? 100,
      footerSafetyScore: metrics?.footerSafety ?? 100,
      whitespaceScore: metrics?.whitespaceBalance ?? 100,
    },
  };
}

export function canExportDesign(report: DesignQualityReport) {
  return report.exportAllowed;
}
