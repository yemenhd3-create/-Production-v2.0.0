import { describe, expect, it } from 'vitest';
import { CONNECTED_LEADER_PROVIDER_PRESETS, parseConnectedLeaderPreset } from '../shared/connectedLeaderPresets';

describe('connected leader presets', () => {
  it('exposes only fixed documented text-only alternatives', () => {
    expect(CONNECTED_LEADER_PROVIDER_PRESETS.map(preset => preset.id)).toEqual(['llm7', 'free-ai']);
    expect(parseConnectedLeaderPreset('connected-leader:llm7:default')?.baseUrl).toBe('https://api.llm7.io/v1');
    expect(parseConnectedLeaderPreset('connected-leader:free-ai:qwen7b')?.baseUrl).toBe('https://api.free.ai/v1');
    expect(parseConnectedLeaderPreset('https://untrusted.example/run')).toBeUndefined();
  });
});
