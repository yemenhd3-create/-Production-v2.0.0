// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getFromStorage, saveToStorage } from '../client/src/lib/storage';

describe('Arabic local storage encoding', () => {
  beforeEach(() => localStorage.clear());

  it('persists Arabic advertisement details without invalid base64 characters', () => {
    const details = { productName: 'فستان بناتي', colors: ['أبيض', 'وردي'], storeName: 'متجر مروان' };

    expect(saveToStorage('clothing_ad_test_arabic', details)).toBe(true);
    expect(getFromStorage<typeof details>('clothing_ad_test_arabic')).toEqual(details);
  });
});
