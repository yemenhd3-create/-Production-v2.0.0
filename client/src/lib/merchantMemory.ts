import { StorageKeys } from '@shared/types';
import { createMerchantAssistantSession, createMerchantProfile, normalizeMerchantAssistantSession, normalizeMerchantProfile, type MerchantAssistantSession, type MerchantProfile } from '@shared/merchantAssistant';
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

export function loadMerchantAssistantSession() {
  return normalizeMerchantAssistantSession(getFromStorage<MerchantAssistantSession>(StorageKeys.MERCHANT_ASSISTANT_SESSION));
}

export function saveMerchantAssistantSession(session: MerchantAssistantSession) {
  const safe = normalizeMerchantAssistantSession(session);
  saveToStorage(StorageKeys.MERCHANT_ASSISTANT_SESSION, { ...safe, updatedAt: Date.now() });
  return safe;
}

export function clearMerchantAssistantSession() {
  removeFromStorage(StorageKeys.MERCHANT_ASSISTANT_SESSION);
  return createMerchantAssistantSession();
}
