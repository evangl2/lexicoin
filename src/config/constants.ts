/** Maximum number of synthesis pipelines that can run concurrently across all devices. */
export const MAX_CONCURRENT_SYNTHESES = 3;

export const AI_MODELS = [
  { label: 'Flash Lite', id: 'gemini-3.1-flash-lite-preview' },
  { label: 'Flash 3', id: 'gemini-3-flash-preview' },
  { label: 'Pro 3.1', id: 'gemini-3.1-pro-preview' },
  { label: 'Flash 2.5', id: 'gemini-2.5-flash' },
  { label: '[OR] GLM-4.5 Air', id: 'z-ai/glm-4.5-air:free' },
  { label: '[OR] MiniMax M2.5', id: 'minimax/minimax-m2.5:free' },
  { label: '[OR] Qwen3 Coder', id: 'qwen/qwen3-coder:free' },
  { label: '[OR] Gemma 4 31B', id: 'google/gemma-4-31b-it:free' },
] as const;

export const DEFAULT_MODEL_ID = 'gemini-3.1-flash-lite-preview';
