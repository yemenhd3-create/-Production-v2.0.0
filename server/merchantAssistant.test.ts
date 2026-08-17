import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATE_SETTINGS } from '../shared/types';
import { applyMerchantCommands, createMerchantProfile, normalizeMerchantProfile, parseMerchantCommands } from '../shared/merchantAssistant';

describe('Merchant Assistant rules-first commands', () => {
  it('يفهم أمراً عربياً متعدد التغييرات ويطبّق الحقول المسموحة فقط', () => {
    const commands = parseMerchantCommands('استخدم القالب الليلي وكبّر صورة الملابس ولا تظهر العنوان');
    const result = applyMerchantCommands({ ...DEFAULT_TEMPLATE_SETTINGS }, createMerchantProfile(), commands);

    expect(result.template.visualTheme).toBe('midnight');
    expect(result.template.productScale).toBe(1.2);
    expect(result.template.showHeadline).toBe(false);
    expect(result.template.showPrice).toBe(DEFAULT_TEMPLATE_SETTINGS.showPrice);
    expect(result.template.showStoreLogo).toBe(DEFAULT_TEMPLATE_SETTINGS.showStoreLogo);
    expect(result.unsupported).toEqual([]);
  });

  it('يرفض طلب حجم السعر ولا يخترع إعداداً غير موجود', () => {
    const commands = parseMerchantCommands('كبّر السعر');
    const result = applyMerchantCommands({ ...DEFAULT_TEMPLATE_SETTINGS }, createMerchantProfile(), commands);

    expect(result.applied).toEqual([]);
    expect(result.unsupported).toEqual(['price-size']);
    expect(result.template).toEqual(DEFAULT_TEMPLATE_SETTINGS);
    expect(result.profile.unsupportedRequests['price-size']).toBe(1);
  });

  it('يحفظ ألواناً محدودة للمستقبل من دون تحويلها إلى CSS أو تعديل ثيم الإعلان', () => {
    const commands = parseMerchantCommands('ألواني المفضلة أسود وذهبي وأحمر');
    const result = applyMerchantCommands({ ...DEFAULT_TEMPLATE_SETTINGS, visualTheme: 'mint' }, createMerchantProfile(), commands);

    expect(result.profile.defaultColors).toEqual(['أسود', 'ذهبي', 'أحمر']);
    expect(result.detailsPatch.colors).toEqual(['أسود', 'ذهبي', 'أحمر']);
    expect(result.template.visualTheme).toBe('mint');
  });

  it('يبقي الذاكرة محصورة في الحقول المسموحة حتى لو وصل كائن مخزن تالف', () => {
    const profile = normalizeMerchantProfile({
      version: 1,
      onboardingComplete: true,
      storeName: '<متجري>',
      defaultColors: ['أسود', 'أسود', 'x'.repeat(100)],
      hiddenElements: ['headline', 'unexpected'],
      arbitraryCode: 'alert(1)',
      unsupportedRequests: { 'price-size': 99999 },
    });

    expect(profile.storeName).toBe('متجري');
    expect(profile.defaultColors).toEqual(['أسود', 'xxxxxxxxxxxxxxxxxxxxxxxx']);
    expect(profile.hiddenElements).toEqual(['headline']);
    expect(profile.unsupportedRequests['price-size']).toBe(1000);
    expect('arbitraryCode' in profile).toBe(false);
  });
});
