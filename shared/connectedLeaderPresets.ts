export const CONNECTED_LEADER_PROVIDER_PRESETS = [
  {
    id: 'llm7',
    label: 'LLM7 للقائد المتصل',
    name: 'LLM7 للقائد المتصل',
    baseUrl: 'https://api.llm7.io/v1',
    model: 'connected-leader:llm7:default',
    description: 'بديل نصي اختياري بعد Gemini. لا يرسل صوراً أو شعارات أو تذييلات تلقائياً.',
  },
  {
    id: 'free-ai',
    label: 'Free.ai للقائد المتصل',
    name: 'Free.ai للقائد المتصل',
    baseUrl: 'https://api.free.ai/v1',
    model: 'connected-leader:free-ai:qwen7b',
    description: 'بديل نصي اختياري ضمن الحصة المتاحة. لا يرسل صوراً أو شعارات أو تذييلات تلقائياً.',
  },
] as const;

export type ConnectedLeaderAdapter = typeof CONNECTED_LEADER_PROVIDER_PRESETS[number]['id'];

export function parseConnectedLeaderPreset(model: string) {
  return CONNECTED_LEADER_PROVIDER_PRESETS.find(preset => preset.model === model);
}
