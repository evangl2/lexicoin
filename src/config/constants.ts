/** Maximum number of synthesis pipelines that can run concurrently across all devices. */
export const MAX_CONCURRENT_SYNTHESES = 3;

export const AI_MODELS = [
  { label: 'Flash Lite', id: 'gemini-3.1-flash-lite-preview' },
  { label: 'Flash 3', id: 'gemini-3-flash-preview' },
  { label: 'Pro 3.1', id: 'gemini-3.1-pro-preview' },
  { label: 'Flash 2.5', id: 'gemini-2.5-flash' },
] as const;

export const DEFAULT_MODEL_ID = 'gemini-3.1-flash-lite-preview';
