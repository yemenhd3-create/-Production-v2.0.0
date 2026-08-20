import { describe, expect, it, vi } from 'vitest';
import type { TrpcContext } from './_core/context';

const inspectMock = vi.fn();

vi.mock('./developerSession', () => ({
  DEVELOPER_SESSION_COOKIE: 'test-developer-session',
  DEVELOPER_SESSION_MAX_AGE_MS: 1,
  isDeveloperSession: () => true,
  issueDeveloperSession: () => 'test-session',
}));
vi.mock('./privateKeyInspector', () => ({ inspectPrivateKeyBatch: inspectMock }));

const { appRouter } = await import('./routers');

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { cookie: () => undefined, clearCookie: () => undefined } as TrpcContext['res'],
  };
}

describe('private key chat tRPC route', () => {
  it('forwards a transient batch only to the inspector and never echoes raw values in its result', async () => {
    const rawKeys = `AIza${'a'.repeat(32)}`;
    inspectMock.mockResolvedValueOnce([{
      index: 1,
      provider: 'gemini',
      providerLabel: 'Google Gemini API',
      state: 'valid',
      message: 'المفتاح صالح للاستدعاء في هذا الحساب. لم يُحفظ المفتاح.',
      suggestedUses: ['تقوية القائد المتصل للنصوص والتخطيط'],
    }]);

    const caller = appRouter.createCaller(createContext());
    const result = await caller.developer.privateKeyChat.inspectBatch({ rawKeys });

    expect(inspectMock).toHaveBeenCalledWith(rawKeys);
    expect(JSON.stringify(result)).not.toContain(rawKeys);
  });
});
