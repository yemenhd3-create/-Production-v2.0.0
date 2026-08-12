import { describe, expect, it } from 'vitest';
import { decryptProviderKey, encryptProviderKey, toProviderSummary } from './developerProviders';

describe('developer provider protection', () => {
  it('encrypts and decrypts an API key only on the server', () => {
    const encrypted = encryptProviderKey('test-secret-key');
    expect(encrypted).not.toContain('test-secret-key');
    expect(decryptProviderKey(encrypted)).toBe('test-secret-key');
  });

  it('returns public provider metadata without an API key field', () => {
    const summary = toProviderSummary({
      id: 'provider-1',
      name: 'Test provider',
      baseUrl: 'https://api.example.com/v1',
      model: 'test-model',
      encryptedApiKey: encryptProviderKey('test-secret-key'),
      isEnabled: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(summary).toMatchObject({ id: 'provider-1', hasApiKey: true, enabled: true });
    expect('apiKey' in summary).toBe(false);
    expect(JSON.stringify(summary)).not.toContain('test-secret-key');
  });
});
