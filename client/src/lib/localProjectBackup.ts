import type { MerchantAssistantSession, MerchantProfile } from '@shared/merchantAssistant';
import type { TemplateSettings } from '@shared/types';

export type LocalProjectBackup = {
  version: 1;
  createdAt: number;
  profile: MerchantProfile;
  session: MerchantAssistantSession;
  template: TemplateSettings;
};

export function createLocalProjectBackup(profile: MerchantProfile, session: MerchantAssistantSession, template: TemplateSettings): LocalProjectBackup {
  return { version: 1, createdAt: Date.now(), profile, session, template };
}

export function stringifyLocalProjectBackup(backup: LocalProjectBackup) {
  return JSON.stringify(backup, null, 2);
}

export function parseLocalProjectBackup(value: string): LocalProjectBackup | null {
  try {
    const parsed = JSON.parse(value) as Partial<LocalProjectBackup>;
    if (parsed.version !== 1 || !parsed.profile || !parsed.session || !parsed.template || typeof parsed.createdAt !== 'number') return null;
    if (!Array.isArray(parsed.session.messages) || !Array.isArray(parsed.session.tasks)) return null;
    return parsed as LocalProjectBackup;
  } catch {
    return null;
  }
}

export function backupFilename(createdAt: number) {
  return `clothing-studio-backup-${new Date(createdAt).toISOString().slice(0, 10)}.json`;
}
