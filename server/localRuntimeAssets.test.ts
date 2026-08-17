import { describe, expect, it } from 'vitest';
import { getLocalRuntimeAsset } from './_core/localRuntimeAssets';

describe('أصول محرك المعالجة المحلية', () => {
  it('يسمح بملفات النموذج الثلاثة الثابتة فقط', () => {
    expect(getLocalRuntimeAsset('u2netp.onnx')).toMatchObject({ contentType: 'application/octet-stream' });
    expect(getLocalRuntimeAsset('ort-wasm-simd-threaded.wasm')).toMatchObject({ contentType: 'application/wasm' });
    expect(getLocalRuntimeAsset('ort-wasm-simd-threaded.mjs')).toMatchObject({ contentType: 'text/javascript; charset=utf-8' });
  });

  it('يرفض أي اسم لا ينتمي إلى قائمة الأصول المسموحة', () => {
    expect(getLocalRuntimeAsset('../secret')).toBeNull();
    expect(getLocalRuntimeAsset('https://example.com/model.onnx')).toBeNull();
    expect(getLocalRuntimeAsset('product-image.png')).toBeNull();
  });
});
