import { useState, useCallback, useRef } from 'react';
import { supabase } from '@core/infra/supabaseClient';
import { messageBus } from '@core/protocol/MessageBus';
import { logger } from '@utils/logger';
import { senseToCard } from '@core/pipelines/senseToCard';
import type { SynthesisRequest, SynthesisResponse, APIResponse } from '@app-types/api';
import type { CardEntity } from '@app-types/CardEntity';
import { autoPollExhausted } from './useVisualPoll';
import { useGameStore } from '@store/index';
import { MAX_CONCURRENT_SYNTHESES } from '@/config/constants';

/**
 * Poll sense_visuals once. Returns true if visual was found and broadcast.
 */
async function pollVisualOnce(senseUid: string, visualId: string, attempt: number): Promise<boolean> {
  logger.info(`[AutoPoll] Attempt ${attempt}: querying sense_visuals for ${senseUid} id=${visualId}`, undefined, 'useSynthesis');
  try {
    const { data, error: queryError } = await supabase
      .from('sense_visuals')
      .select('sense_id, id, payload, meta')
      .eq('sense_id', senseUid)
      .eq('id', visualId)
      .maybeSingle();

    if (queryError) {
      logger.error(`[AutoPoll] Attempt ${attempt}: Supabase query error`, queryError, 'useSynthesis');
      return false;
    }

    // Check for failure sentinel before checking payload.
    // generate-visual writes this record when it permanently fails (Gemini error,
    // validation failure, DB insert failure) so we stop polling immediately
    // instead of waiting out the full 100s auto-poll chain.
    if (data && data.meta?.status === 'failed') {
      logger.warn(
        `[AutoPoll] Attempt ${attempt}: failure sentinel detected (${data.meta?.error}), sending ASSET_ERROR`,
        undefined,
        'useSynthesis',
      );
      await messageBus.send('ASSET_ERROR', {
        assetId: senseUid,
        error: data.meta.error ?? 'generation_failed',
      }, 'auto-poll');
      return true; // stop the poll chain
    }

    if (data?.payload && data.payload !== 'VISUAL_GENERATION_FAILED') {
      logger.info(`[AutoPoll] Attempt ${attempt}: visual found (${data.payload.length} chars), sending ASSET_LOADED`, undefined, 'useSynthesis');
      await messageBus.send('ASSET_LOADED', {
        uid: data.sense_id,
        id: data.id,
        payload: data.payload,
        meta: data.meta ?? { stability: 100 },
      }, 'auto-poll');
      logger.info(`[AutoPoll] Attempt ${attempt}: ASSET_LOADED sent for ${senseUid}`, undefined, 'useSynthesis');
      return true;
    }

    logger.info(`[AutoPoll] Attempt ${attempt}: no visual yet for ${senseUid} (data=${JSON.stringify(data)})`, undefined, 'useSynthesis');
    return false;
  } catch (err) {
    logger.error(`[AutoPoll] Attempt ${attempt}: unexpected error`, err, 'useSynthesis');
    return false;
  }
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * Auto-poll chain: 25s → 25s → 50s.
 * Stops early if visual found. Marks autoPollExhausted when all 3 fail.
 */
async function runAutoPollChain(senseUid: string, visualId: string): Promise<void> {
  const delays = [25_000, 25_000, 50_000];
  logger.info(`[AutoPoll] Chain started for ${senseUid} id=${visualId}, delays=${delays.join('/')}ms`, undefined, 'useSynthesis');
  for (let i = 0; i < delays.length; i++) {
    await sleep(delays[i]!);
    const found = await pollVisualOnce(senseUid, visualId, i + 1);
    if (found) {
      logger.info(`[AutoPoll] Chain done at attempt ${i + 1} for ${senseUid}`, undefined, 'useSynthesis');
      return;
    }
  }
  autoPollExhausted.add(senseUid);
  logger.warn(`[AutoPoll] All attempts exhausted for ${senseUid}, manual poll enabled`, undefined, 'useSynthesis');
}

export type SynthesisState = 'idle' | 'processing' | 'processing-long' | 'success' | 'error';

export interface UseSynthesisResult {
  synthesize: (params: Omit<SynthesisRequest, 'userId'>) => Promise<void>;
  /** Forcibly reset all synthesis state — use when the circle gets stuck. */
  reset: () => void;
  state: SynthesisState;
  error: string | null;
  result: SynthesisResponse | null;
  card: CardEntity | null;
}

export function useSynthesis(): UseSynthesisResult {
  const [state, setState] = useState<SynthesisState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SynthesisResponse | null>(null);
  const [card, setCard] = useState<CardEntity | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);
  // Prevents double-invocation from double-clicks, React StrictMode, etc.
  const inFlightRef = useRef(false);

  const reset = useCallback(() => {
    clearTimeout(timeoutRef.current);
    if (inFlightRef.current) {
      inFlightRef.current = false;
      useGameStore.getState().decrementSynthesisCount();
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setState('idle');
    setError(null);
  }, []);

  const synthesize = useCallback(async (params: Omit<SynthesisRequest, 'userId'>) => {
    if (inFlightRef.current) {
      logger.warn('Synthesis already in progress — ignoring duplicate call', undefined, 'useSynthesis');
      return;
    }

    // Global capacity check — uses getState() to always read the latest count
    // without adding activeSynthesisCount to the dependency array.
    const store = useGameStore.getState();
    if (store.activeSynthesisCount >= MAX_CONCURRENT_SYNTHESES) {
      store.addNotification(
        { en: `Synthesis queue full (max ${MAX_CONCURRENT_SYNTHESES})`, zh: `合成队列已满（最多 ${MAX_CONCURRENT_SYNTHESES} 个）` },
        'WARNING',
        3000,
      );
      logger.warn(`[useSynthesis] Queue full (${store.activeSynthesisCount}/${MAX_CONCURRENT_SYNTHESES}), rejecting new synthesis`, undefined, 'useSynthesis');
      return;
    }

    inFlightRef.current = true;
    useGameStore.getState().incrementSynthesisCount();

    setState('processing');
    setError(null);
    setResult(null);
    setCard(null);

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setState(prev => (prev === 'processing' ? 'processing-long' : prev));
    }, 15000);

    // Unique ID for this synthesis attempt — lets the backend detect network-level
    // duplicate delivery and replay the stored result instead of re-running Gemini.
    const requestId = crypto.randomUUID();

    // Hard 90s timeout via Promise.race — does not rely on SDK signal support.
    // If the edge function hangs (OpenRouter retries, network stall, wall-clock limit),
    // this rejects the race and falls through to the catch block, freeing the circle.
    let hardTimeoutId: ReturnType<typeof setTimeout>;
    const raceTimeout = new Promise<never>((_, reject) => {
      hardTimeoutId = setTimeout(() => {
        reject(Object.assign(new Error('Synthesis timed out (90s)'), { name: 'AbortError' }));
      }, 90_000);
    });

    try {
      logger.info('Invoking synthesize-sense edge function...', { ...params, request_id: requestId }, 'useSynthesis');

      const { data, error: invokeError } = await Promise.race([
        supabase.functions.invoke('synthesize-sense', {
          body: { ...params, request_id: requestId },
        }),
        raceTimeout,
      ]);

      if (invokeError) throw invokeError;

      const apiResponse = data as APIResponse<SynthesisResponse>;

      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.error?.message || 'Synthesis failed on server');
      }

      const response = apiResponse.data;
      const newCard = senseToCard(response.sense, 0);

      messageBus.send('SENSE_CREATED', response.sense, 'useSynthesis');

      if (response.visual) {
        // Visual already ready (cache hit with existing visual)
        // Normalize field names: edge function returns DB columns (sense_id),
        // but ASSET_LOADED consumers expect { uid, id, payload, meta }
        messageBus.send('ASSET_LOADED', {
          uid: response.visual.sense_id ?? response.visual.uid,
          id: response.visual.id,
          payload: response.visual.payload,
          meta: response.visual.meta ?? { stability: 100 },
        }, 'useSynthesis');
      } else {
        // Visual is being generated async — start auto-poll chain
        const senseUid = response.sense?.uid;
        const visualId = (params as any).visual_id ?? 'default';
        if (senseUid) {
          runAutoPollChain(senseUid, visualId);
        }
      }

      setResult(response);
      setCard(newCard);
      setState('success');

      logger.info('Synthesis successful', { uid: response.sense.uid, cached: response.cached }, 'useSynthesis');

      // Background completion notification — extract the English concept word safely
      const conceptEn = (() => {
        try {
          const enShells = (response.sense as any)?.shells?.['en'];
          if (!Array.isArray(enShells) || !enShells[0]) return null;
          const sh = enShells[0];
          return (sh?.text?.value ?? sh?.text ?? null) as string | null;
        } catch { return null; }
      })();
      useGameStore.getState().addNotification(
        conceptEn
          ? { en: `"${conceptEn}" discovered!`, zh: `「${conceptEn}」已发现！` }
          : { en: 'Synthesis complete!', zh: '合成完成！' },
        'SUCCESS',
        5000,
      );

    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || err?.message?.includes('timed out');
      const errorMessage = isAbort
        ? 'Synthesis timed out (90s)'
        : (err.message || 'Synthesis failed unexpectedly');
      logger.error('Synthesis error', err, 'useSynthesis');
      setError(errorMessage);
      setState('error');
      useGameStore.getState().addNotification(
        isAbort
          ? { en: 'Synthesis timed out', zh: '合成超时，请重试' }
          : { en: 'Synthesis failed', zh: '合成失败' },
        'ERROR',
        4000,
      );
    } finally {
      clearTimeout(hardTimeoutId!);
      clearTimeout(timeoutRef.current);
      abortRef.current = null;
      inFlightRef.current = false;
      useGameStore.getState().decrementSynthesisCount();
    }
  }, []);

  return { synthesize, reset, state, error, result, card };
}

export default useSynthesis;
