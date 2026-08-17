import { describe, expect, it } from 'vitest';
import { isFriendTestMode } from '../client/src/lib/friendTestMode';

describe('وضع اختبار الأصدقاء', () => {
  it('لا يفتح التجاوز إلا بالقيمة الصريحة true', () => {
    expect(isFriendTestMode('true')).toBe(true);
    expect(isFriendTestMode('TRUE')).toBe(false);
    expect(isFriendTestMode('1')).toBe(false);
    expect(isFriendTestMode(undefined)).toBe(false);
  });
});
