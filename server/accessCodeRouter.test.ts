import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redeemAccessCode: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock('./accessCodes', () => ({
  createAccessCode: vi.fn(),
  listAccessCodes: vi.fn(),
  redeemAccessCode: mocks.redeemAccessCode,
  revokeAccessCode: vi.fn(),
}));

vi.mock('./_core/sdk', () => ({
  sdk: { createSessionToken: mocks.createSessionToken },
}));

import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

describe('مسار استبدال رمز الدخول', () => {
  beforeEach(() => {
    mocks.redeemAccessCode.mockReset();
    mocks.createSessionToken.mockReset();
  });

  it('يصدر جلسة التطبيق الآمنة بعد قبول الرمز من دون طلب حساب OAuth', async () => {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    mocks.redeemAccessCode.mockResolvedValue({ openId: 'access_demo', name: 'وصول برمز: اختبار', expiresAt: null });
    mocks.createSessionToken.mockResolvedValue('signed-access-session');
    const ctx = {
      user: null,
      req: { protocol: 'https', headers: {} },
      res: { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }) },
    } as unknown as TrpcContext;

    const result = await appRouter.createCaller(ctx).accessCodes.redeem({ code: 'CAG-ABCDE-12345' });

    expect(result).toEqual({ success: true });
    expect(mocks.redeemAccessCode).toHaveBeenCalledWith('CAG-ABCDE-12345');
    expect(mocks.createSessionToken).toHaveBeenCalledWith('access_demo', { name: 'وصول برمز: اختبار', expiresInMs: undefined });
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({ name: 'app_session_id', value: 'signed-access-session' });
    expect(cookies[0]?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'none' });
  });
});
