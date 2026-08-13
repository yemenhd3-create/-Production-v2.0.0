import { describe, expect, it } from 'vitest';
import { assessLocalInferenceCompatibility, formatBytes } from '../client/src/lib/deviceCompatibility';

describe('assessLocalInferenceCompatibility', () => {
  it('يعرض حالة جاهزة عندما تتوافر تقنيات الاستدلال المحلية الأساسية', () => {
    expect(assessLocalInferenceCompatibility({ hasWebAssembly: true, hasWebGPU: true, isSecureContext: true })).toMatchObject({
      readiness: 'ready',
      title: 'هاتفك مناسب لتجربة الإزالة المحلية',
    });
  });

  it('يعرض حالة محدودة عندما يتوفر WebAssembly دون WebGPU', () => {
    expect(assessLocalInferenceCompatibility({ hasWebAssembly: true, hasWebGPU: false, isSecureContext: true }).readiness).toBe('limited');
  });

  it('يرفض الاستدلال المحلي عند غياب الاتصال الآمن أو WebAssembly', () => {
    expect(assessLocalInferenceCompatibility({ hasWebAssembly: false, hasWebGPU: true, isSecureContext: true }).readiness).toBe('not-ready');
    expect(assessLocalInferenceCompatibility({ hasWebAssembly: true, hasWebGPU: true, isSecureContext: false }).readiness).toBe('not-ready');
  });
});

describe('formatBytes', () => {
  it('يعرض حجوم التخزين بشكل مناسب للهاتف', () => {
    expect(formatBytes(40 * 1024 * 1024)).toBe('40.0 MB');
    expect(formatBytes()).toBe('غير متاح');
  });
});
