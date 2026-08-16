import type { DesignSuggestion, TemplateSettings } from '@shared/types';
import { getCanvasDimensions } from '@shared/adWorkflow';

export type DesignPassportCheckStatus = 'pass' | 'warn' | 'fail';

export interface DesignPassportCheck {
  id: 'dimensions' | 'content' | 'luminance' | 'privacy';
  label: string;
  status: DesignPassportCheckStatus;
  value: number;
  detail: string;
}

export interface PixelInspection {
  width: number;
  height: number;
  meanLuminance: number;
  darkRatio: number;
  lightRatio: number;
  transparentRatio: number;
}

export interface LocalDecisionSummary {
  layout: DesignSuggestion['selectedLayout'];
  confidence: number;
  decisionSha256: string;
}

export interface DesignPassport {
  schemaVersion: 1;
  createdAt: string;
  template: TemplateSettings['size'];
  dimensions: { width: number; height: number };
  renderSha256: string;
  renderBytes: number;
  checks: DesignPassportCheck[];
  localDecision?: LocalDecisionSummary;
  privacy: {
    networkUsedByPassport: false;
    sourceImageUploaded: false;
    includedPersonalFields: false;
  };
}

const LOCAL_RENDER_PREFIXES = ['blob:', 'data:image/'] as const;

export function isLocalRenderedUrl(renderedUrl: string): boolean {
  return LOCAL_RENDER_PREFIXES.some(prefix => renderedUrl.startsWith(prefix));
}

export function inspectRenderedPixels(width: number, height: number, pixels: Uint8ClampedArray): PixelInspection {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('أبعاد نتيجة الرسم غير صالحة للفحص.');
  }

  const expectedLength = width * height * 4;
  if (pixels.length < expectedLength) {
    throw new Error('بيانات بكسلات نتيجة الرسم غير مكتملة.');
  }

  let luminanceSum = 0;
  let opaqueCount = 0;
  let dark = 0;
  let light = 0;
  let transparent = 0;

  for (let offset = 0; offset < expectedLength; offset += 4) {
    const alpha = pixels[offset + 3];
    if (alpha < 6) {
      transparent += 1;
      continue;
    }

    const luminance = (0.2126 * pixels[offset]) + (0.7152 * pixels[offset + 1]) + (0.0722 * pixels[offset + 2]);
    luminanceSum += luminance;
    opaqueCount += 1;
    if (luminance < 18) dark += 1;
    if (luminance > 242) light += 1;
  }

  const pixelCount = width * height;
  return {
    width,
    height,
    meanLuminance: opaqueCount ? luminanceSum / opaqueCount : 255,
    darkRatio: dark / pixelCount,
    lightRatio: light / pixelCount,
    transparentRatio: transparent / pixelCount,
  };
}

export function createPassportChecks(inspection: PixelInspection, expected: { width: number; height: number }): DesignPassportCheck[] {
  const exactDimensions = inspection.width === expected.width && inspection.height === expected.height;
  const mostUniformRatio = Math.max(inspection.darkRatio, inspection.lightRatio, inspection.transparentRatio);
  const mostlyUniform = mostUniformRatio > 0.995;
  const extremeLuminance = inspection.meanLuminance < 18 || inspection.meanLuminance > 242;

  return [
    {
      id: 'dimensions',
      label: 'أبعاد القالب',
      status: exactDimensions ? 'pass' : 'fail',
      value: exactDimensions ? 100 : 0,
      detail: `${inspection.width}×${inspection.height} مقابل ${expected.width}×${expected.height}`,
    },
    {
      id: 'content',
      label: 'وجود محتوى بصري',
      status: mostlyUniform ? 'warn' : 'pass',
      value: Math.max(0, Math.round((1 - mostUniformRatio) * 100)),
      detail: mostlyUniform
        ? 'الناتج متجانس جداً؛ راجع المعاينة قبل الحفظ أو المشاركة.'
        : 'يوجد توزيع بصري قابل للفحص في نتيجة الإعلان.',
    },
    {
      id: 'luminance',
      label: 'سطوع الصورة',
      status: extremeLuminance ? 'warn' : 'pass',
      value: Math.round((inspection.meanLuminance / 255) * 100),
      detail: extremeLuminance
        ? 'السطوع العام قريب من أحد الطرفين؛ راجع وضوح النصوص في المعاينة.'
        : 'السطوع العام ضمن نطاق محافظ للمعاينة.',
    },
    {
      id: 'privacy',
      label: 'خصوصية الفحص',
      status: 'pass',
      value: 100,
      detail: 'يُفحص ملف الإعلان محلياً فقط؛ لا تُرفع الصورة أو بيانات الاتصال.',
    },
  ];
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('لا يدعم هذا المتصفح البصمة المحلية الآمنة.');
  const digest = await subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function localDecisionPayload(suggestion: DesignSuggestion) {
  return {
    version: suggestion.version,
    layout: suggestion.selectedLayout,
    confidence: Number(suggestion.confidence.toFixed(3)),
    status: suggestion.status,
    generatedAt: suggestion.generatedAt,
  };
}

async function readLocalRender(renderedUrl: string): Promise<Blob> {
  if (!isLocalRenderedUrl(renderedUrl)) {
    throw new Error('يفحص جواز التصميم نتائج الإعلان المحلية فقط.');
  }

  const response = await fetch(renderedUrl);
  if (!response.ok) throw new Error('تعذر قراءة ملف الإعلان النهائي.');
  const blob = await response.blob();
  if (!blob.size || !blob.type.startsWith('image/')) {
    throw new Error('نتيجة الإعلان ليست ملف صورة صالحاً للفحص.');
  }
  return blob;
}

async function inspectImageBlob(blob: Blob): Promise<PixelInspection> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('لا يدعم هذا المتصفح فحص صورة الإعلان محلياً.');
  }

  const bitmap = await createImageBitmap(blob);
  try {
    const sampleWidth = Math.min(160, bitmap.width);
    const sampleHeight = Math.max(1, Math.round((bitmap.height * sampleWidth) / bitmap.width));
    const canvas = document.createElement('canvas');
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('تعذر فحص نتيجة الرسم.');
    context.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);
    return inspectRenderedPixels(bitmap.width, bitmap.height, context.getImageData(0, 0, sampleWidth, sampleHeight).data);
  } finally {
    bitmap.close?.();
  }
}

export async function createDesignPassport(
  renderedUrl: string,
  template: TemplateSettings,
  suggestion?: DesignSuggestion | null,
): Promise<DesignPassport> {
  const blob = await readLocalRender(renderedUrl);
  const inspection = await inspectImageBlob(blob);
  const expected = getCanvasDimensions(template.size);
  const localDecision = suggestion
    ? {
        layout: suggestion.selectedLayout,
        confidence: Number(suggestion.confidence.toFixed(3)),
        decisionSha256: await sha256Hex(new Blob([JSON.stringify(localDecisionPayload(suggestion))], { type: 'application/json' })),
      }
    : undefined;

  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    template: template.size,
    dimensions: { width: inspection.width, height: inspection.height },
    renderSha256: await sha256Hex(blob),
    renderBytes: blob.size,
    checks: createPassportChecks(inspection, expected),
    localDecision,
    privacy: { networkUsedByPassport: false, sourceImageUploaded: false, includedPersonalFields: false },
  };
}

export function passportToJson(passport: DesignPassport): string {
  return JSON.stringify(passport, null, 2);
}

export function passportFilename(productName: string): string {
  const base = productName.trim().replace(/[^\w\u0600-\u06FF-]+/g, '-').replace(/^-+|-+$/g, '') || 'إعلان-ملابس';
  return `${base}-جواز-التصميم.json`;
}
