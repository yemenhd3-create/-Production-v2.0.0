// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearMerchantAssistantSession, loadMerchantAssistantSession, saveMerchantAssistantSession } from '../client/src/lib/merchantMemory';
import { createMerchantAssistantSession, createMerchantAssistantTask, parseMerchantCommands } from '../shared/merchantAssistant';

describe('ذاكرة مهام مساعد التاجر', () => {
  beforeEach(() => localStorage.clear());

  it('يحفظ آخر مهمة قيد التأكيد ويستعيدها من التخزين المحلي بعد إعادة فتح المساعد', () => {
    const session = createMerchantAssistantTask(
      createMerchantAssistantSession(),
      'حسّن النص التسويقي للواتساب',
      parseMerchantCommands('حسّن النص التسويقي للواتساب')
    );

    saveMerchantAssistantSession(session);
    const restored = loadMerchantAssistantSession();

    expect(restored.tasks.at(-1)).toMatchObject({
      request: 'حسّن النص التسويقي للواتساب',
      status: 'awaiting-confirmation',
    });
    expect(restored.messages.at(-1)?.content).toMatch(/النص التسويقي محلياً/);
  });

  it('يمسح المحادثة والمهام فقط عند اختيار المستخدم لهذا الإجراء', () => {
    saveMerchantAssistantSession(createMerchantAssistantTask(createMerchantAssistantSession(), 'كبّر الملابس', parseMerchantCommands('كبّر الملابس')));
    const reset = clearMerchantAssistantSession();

    expect(reset.tasks).toEqual([]);
    expect(loadMerchantAssistantSession().tasks).toEqual([]);
  });
});
