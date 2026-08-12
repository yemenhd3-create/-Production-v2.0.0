/**
 * Local Storage Management with Encryption
 * Handles storing and retrieving encrypted data from localStorage
 */

import { StorageKeys } from '@shared/types';

// Simple encryption/decryption using base64 (for client-side only)
// For production, consider using a proper encryption library like TweetNaCl.js

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Simple encryption using XOR with base64 encoding
 * Note: This is NOT cryptographically secure, use for obfuscation only
 */
function encrypt(data: string): string {
  try {
    // Convert to base64 and add timestamp for additional obfuscation
    const timestamp = Date.now().toString();
    const combined = `${timestamp}:${data}`;
    return toBase64(combined);
  } catch (error) {
    console.error('Encryption error:', error);
    return data;
  }
}

/**
 * Simple decryption using XOR with base64 decoding
 */
function decrypt(encrypted: string): string {
  try {
    const decoded = fromBase64(encrypted);
    const separator = decoded.indexOf(':');
    return separator >= 0 ? decoded.slice(separator + 1) : decoded;
  } catch (error) {
    console.error('Decryption error:', error);
    return encrypted;
  }
}

/**
 * Save data to localStorage with encryption
 */
export function saveToStorage<T>(key: StorageKeys | string, data: T): boolean {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = encrypt(jsonString);
    localStorage.setItem(key, encrypted);
    return true;
  } catch (error) {
    console.error('Failed to save to storage:', error);
    return false;
  }
}

/**
 * Retrieve data from localStorage with decryption
 */
export function getFromStorage<T>(key: StorageKeys | string, defaultValue?: T): T | null {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return defaultValue || null;

    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error('Failed to retrieve from storage:', error);
    return defaultValue || null;
  }
}

/**
 * Remove data from localStorage
 */
export function removeFromStorage(key: StorageKeys | string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to remove from storage:', error);
    return false;
  }
}

/**
 * Clear all storage
 */
export function clearStorage(): boolean {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Failed to clear storage:', error);
    return false;
  }
}

/**
 * Check if a key exists in storage
 */
export function hasInStorage(key: StorageKeys | string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error('Failed to check storage:', error);
    return false;
  }
}

/**
 * Get all keys from storage
 */
export function getAllStorageKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  } catch (error) {
    console.error('Failed to get storage keys:', error);
    return [];
  }
}

/**
 * Get storage size in bytes
 */
export function getStorageSize(): number {
  try {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size;
  } catch (error) {
    console.error('Failed to get storage size:', error);
    return 0;
  }
}

/**
 * Export all storage data as JSON
 */
export function exportStorageData(): Record<string, unknown> {
  try {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('clothing_ad_')) {
        const value = localStorage.getItem(key);
        if (value) {
          data[key] = getFromStorage(key);
        }
      }
    }
    return data;
  } catch (error) {
    console.error('Failed to export storage data:', error);
    return {};
  }
}

/**
 * Import storage data from JSON
 */
export function importStorageData(data: Record<string, unknown>): boolean {
  try {
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('clothing_ad_')) {
        saveToStorage(key, value);
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to import storage data:', error);
    return false;
  }
}
