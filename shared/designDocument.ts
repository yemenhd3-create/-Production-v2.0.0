import type { NormalizedBox } from './designGeometry';
import type { TemplateSize } from './types';

export type DesignElementId = 'header' | 'logo' | 'product' | 'badge' | 'info' | 'price' | 'features' | 'footer';
export type DesignConstraintId = 'inside-canvas' | 'product-inside-hero' | 'logo-avoids-product' | 'footer-avoids-price' | 'footer-avoids-features' | 'price-required';
export type DesignCheckStatus = 'pass' | 'warn' | 'fail';
export type DesignRepairId = 'reset-logo-transform' | 'reset-footer-transform' | 'reset-garment-transform' | 'restore-readable-background';

export interface DesignElementDocument {
  id: DesignElementId;
  visible: boolean;
  required: boolean;
  box: NormalizedBox;
}

export interface DesignEvidenceSummary {
  layout?: TemplateSize;
  confidence?: number;
  decisionSha256?: string;
}

/**
 * مستند تصميم محلي قابل لإعادة الفحص. لا يحمل الصورة أو اسم المتجر أو الهاتف أو نص المنتج.
 */
export interface DesignDocument {
  schemaVersion: 1;
  template: TemplateSize;
  elements: DesignElementDocument[];
  constraints: DesignConstraintId[];
  evidence?: DesignEvidenceSummary;
  privacy: { includedImage: false; includedPersonalFields: false; networkUsed: false };
}

export interface DesignConstraintCheck {
  id: DesignConstraintId;
  status: DesignCheckStatus;
  label: string;
  detail: string;
  value: number;
  elements: DesignElementId[];
}

export interface DesignRepairPlan {
  id: DesignRepairId;
  title: string;
  detail: string;
  affectedElements: DesignElementId[];
}

export interface DesignContractReport {
  document: DesignDocument;
  status: DesignCheckStatus;
  checks: DesignConstraintCheck[];
  repairs: DesignRepairPlan[];
}
