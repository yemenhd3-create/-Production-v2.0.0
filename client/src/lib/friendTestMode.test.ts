import { describe, expect, it } from 'vitest';
import { isFriendTestMode } from './friendTestMode';

describe('isFriendTestMode', () => {
  it('يفتح وضع الاختبار فقط للقيمة الصريحة true', () => {
    expect(isFriendTestMode('true')).toBe(true);
    expect(isFriendTestMode('TRUE')).toBe(false);
    expect(isFriendTestMode('1')).toBe(false);
    expect(isFriendTestMode(undefined)).toBe(false);
  });
});
