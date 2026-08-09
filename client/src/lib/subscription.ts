/**
 * Subscription Token Management
 * Handles token generation, validation, and usage tracking
 */

import { SubscriptionToken } from '@shared/types';
import { getFromStorage, saveToStorage } from './storage';
import { StorageKeys } from '@shared/types';

/**
 * Generate a new subscription token
 */
export function generateToken(
  maxUsage?: number,
  expiryDays?: number
): SubscriptionToken {
  const now = Date.now();
  const token: SubscriptionToken = {
    id: generateId(),
    token: generateRandomToken(),
    createdAt: now,
    expiresAt: expiryDays ? now + expiryDays * 24 * 60 * 60 * 1000 : undefined,
    isActive: true,
    usageCount: 0,
    maxUsage: maxUsage,
  };

  return token;
}

/**
 * Generate random token string
 */
function generateRandomToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add token to storage
 */
export function addToken(token: SubscriptionToken): boolean {
  try {
    const tokens = getFromStorage<SubscriptionToken[]>(StorageKeys.SUBSCRIPTION_TOKENS, []) || [];
    tokens.push(token);
    return saveToStorage(StorageKeys.SUBSCRIPTION_TOKENS, tokens);
  } catch (error) {
    console.error('Failed to add token:', error);
    return false;
  }
}

/**
 * Get all tokens
 */
export function getAllTokens(): SubscriptionToken[] {
  try {
    return getFromStorage<SubscriptionToken[]>(StorageKeys.SUBSCRIPTION_TOKENS, []) || [];
  } catch (error) {
    console.error('Failed to get tokens:', error);
    return [];
  }
}

/**
 * Get active tokens
 */
export function getActiveTokens(): SubscriptionToken[] {
  const tokens = getAllTokens();
  const now = Date.now();

  return tokens.filter((token) => {
    // Check if expired
    if (token.expiresAt && token.expiresAt < now) {
      return false;
    }

    // Check if max usage reached
    if (token.maxUsage && token.usageCount >= token.maxUsage) {
      return false;
    }

    // Check if active
    return token.isActive;
  });
}

/**
 * Validate token
 */
export function validateToken(tokenString: string): SubscriptionToken | null {
  const tokens = getActiveTokens();
  const token = tokens.find((t) => t.token === tokenString);

  if (!token) {
    return null;
  }

  // Check expiry
  if (token.expiresAt && token.expiresAt < Date.now()) {
    return null;
  }

  // Check usage limit
  if (token.maxUsage && token.usageCount >= token.maxUsage) {
    return null;
  }

  return token;
}

/**
 * Use token (increment usage count)
 */
export function useToken(tokenString: string): boolean {
  try {
    const tokens = getAllTokens();
    const token = tokens.find((t) => t.token === tokenString);

    if (!token) {
      return false;
    }

    token.usageCount += 1;

    // Deactivate if max usage reached
    if (token.maxUsage && token.usageCount >= token.maxUsage) {
      token.isActive = false;
    }

    return saveToStorage(StorageKeys.SUBSCRIPTION_TOKENS, tokens);
  } catch (error) {
    console.error('Failed to use token:', error);
    return false;
  }
}

/**
 * Revoke token
 */
export function revokeToken(tokenString: string): boolean {
  try {
    const tokens = getAllTokens();
    const token = tokens.find((t) => t.token === tokenString);

    if (!token) {
      return false;
    }

    token.isActive = false;
    return saveToStorage(StorageKeys.SUBSCRIPTION_TOKENS, tokens);
  } catch (error) {
    console.error('Failed to revoke token:', error);
    return false;
  }
}

/**
 * Delete token
 */
export function deleteToken(tokenString: string): boolean {
  try {
    const tokens = getAllTokens();
    const filtered = tokens.filter((t) => t.token !== tokenString);
    return saveToStorage(StorageKeys.SUBSCRIPTION_TOKENS, filtered);
  } catch (error) {
    console.error('Failed to delete token:', error);
    return false;
  }
}

/**
 * Get token statistics
 */
export function getTokenStats() {
  const tokens = getAllTokens();
  const activeTokens = getActiveTokens();

  const stats = {
    total: tokens.length,
    active: activeTokens.length,
    expired: tokens.filter((t) => t.expiresAt && t.expiresAt < Date.now()).length,
    maxUsageReached: tokens.filter((t) => t.maxUsage && t.usageCount >= t.maxUsage).length,
    totalUsage: tokens.reduce((sum, t) => sum + t.usageCount, 0),
    averageUsage: tokens.length > 0 ? Math.round(tokens.reduce((sum, t) => sum + t.usageCount, 0) / tokens.length) : 0,
  };

  return stats;
}

/**
 * Reset token usage
 */
export function resetTokenUsage(tokenString: string): boolean {
  try {
    const tokens = getAllTokens();
    const token = tokens.find((t) => t.token === tokenString);

    if (!token) {
      return false;
    }

    token.usageCount = 0;
    token.isActive = true;

    return saveToStorage(StorageKeys.SUBSCRIPTION_TOKENS, tokens);
  } catch (error) {
    console.error('Failed to reset token usage:', error);
    return false;
  }
}

/**
 * Export tokens as JSON
 */
export function exportTokens(): string {
  try {
    const tokens = getAllTokens();
    return JSON.stringify(tokens, null, 2);
  } catch (error) {
    console.error('Failed to export tokens:', error);
    return '';
  }
}

/**
 * Import tokens from JSON
 */
export function importTokens(jsonString: string): boolean {
  try {
    const tokens = JSON.parse(jsonString) as SubscriptionToken[];

    if (!Array.isArray(tokens)) {
      throw new Error('Invalid token format');
    }

    return saveToStorage(StorageKeys.SUBSCRIPTION_TOKENS, tokens);
  } catch (error) {
    console.error('Failed to import tokens:', error);
    return false;
  }
}

/**
 * Check if user has valid subscription
 */
export function hasValidSubscription(): boolean {
  const activeTokens = getActiveTokens();
  return activeTokens.length > 0;
}

/**
 * Get subscription status
 */
export function getSubscriptionStatus() {
  const tokens = getAllTokens();
  const activeTokens = getActiveTokens();

  if (activeTokens.length === 0) {
    return {
      isActive: false,
      message: 'لا توجد اشتراكات نشطة',
      tokens: tokens.length,
    };
  }

  const primaryToken = activeTokens[0];
  const daysRemaining = primaryToken.expiresAt
    ? Math.ceil((primaryToken.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  return {
    isActive: true,
    message: `لديك ${activeTokens.length} اشتراك نشط`,
    tokens: activeTokens.length,
    daysRemaining,
    usageRemaining: primaryToken.maxUsage ? primaryToken.maxUsage - primaryToken.usageCount : null,
  };
}
