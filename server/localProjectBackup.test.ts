import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATE_SETTINGS } from '@shared/types';
import { createMerchantAssistantSession, createMerchantProfile } from '@shared/merchantAssistant';
import { createLocalProjectBackup, parseLocalProjectBackup, stringifyLocalProjectBackup } from '../client/src/lib/localProjectBackup';

describe('local project backup', () => {
  it('round-trips template, profile, and leader memory locally', () => {
    const backup = createLocalProjectBackup(createMerchantProfile(), createMerchantAssistantSession(), DEFAULT_TEMPLATE_SETTINGS);
    expect(parseLocalProjectBackup(stringifyLocalProjectBackup(backup))).toEqual(backup);
  });

  it('rejects malformed backup files', () => {
    expect(parseLocalProjectBackup('{"version":1}')).toBeNull();
    expect(parseLocalProjectBackup('not-json')).toBeNull();
  });
});
