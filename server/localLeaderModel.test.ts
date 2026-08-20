import { describe, expect, it } from 'vitest';
import { getLocalModelCapability, LOCAL_LEADER_MODEL_ID, LOCAL_LEADER_VRAM_MB } from '../client/src/lib/localLeaderModel';

describe('وضع نموذج القائد المحلي', () => {
  it('يستخدم نموذجاً صغيراً محدداً ويفشل بأمان عندما لا يدعم المتصفح WebGPU', () => {
    expect(LOCAL_LEADER_MODEL_ID).toBe('Llama-3.2-1B-Instruct-q4f16_1-MLC');
    expect(LOCAL_LEADER_VRAM_MB).toBe(879);
    expect(getLocalModelCapability({} as Navigator)).toMatchObject({ supported: false });
  });

  it('يعرض الاستعداد للتنزيل فقط عند وجود واجهة WebGPU', () => {
    expect(getLocalModelCapability({ gpu: { requestAdapter: async () => null } } as Navigator)).toMatchObject({ supported: true });
  });
});
