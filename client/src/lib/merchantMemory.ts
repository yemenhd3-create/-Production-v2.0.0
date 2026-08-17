import { StorageKeys } from '@shared/types';
import { createMerchantProfile, normalizeMerchantProfile, type MerchantProfile } from '@shared/merchantAssistant';
import { getFromStorage, removeFromStorage, saveToStorage } from './storage';

export function loadMerchantProfile() {
  return normalizeMerchantProfile(getFromStorage<MerchantProfile>(StorageKeys.MERCHANT_PROFILE));
}

export function saveMerchantProfile(profile: MerchantProfile) {
  const safe = normalizeMerchantProfile(profile);
  saveToStorage(StorageKeys.MERCHANT_PROFILE, { ...safe, updatedAt: Date.now() });
  return safe;
}

export function clearMerchantProfile() {
  removeFromStorage(StorageKeys.MERCHANT_PROFILE);
  return createMerchantProfile();
}
