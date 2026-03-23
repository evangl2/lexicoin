import { useState, useCallback, useRef } from 'react';
import { supabase } from '@core/infra/supabaseClient';
import { messageBus } from '@core/protocol/MessageBus';
import { logger } from '@utils/logger';
import { senseToCard } from '@core/pipelines/senseToCard';
import type { SynthesisRequest, SynthesisResponse, APIResponse } from '@app-types/api';
import type { CardEntity } from '@app-types/CardEntity';
import { autoPollExhausted } from './useVisualPoll';

/**
 * Poll sense_visuals once. Returns true if visual was found and broadcast.
 */
async function pollVisualOnce(senseUid: string, visualId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('sense_visuals')
      .select('sense_id, id, payload, meta')
      .eq('sense_id', senseUid)
      .eq('id', visualId)
      .maybeSingle();
    if (data?.payload) {
      messageBus.send('ASSET_LOADED', {
        uid: data.sense_id,
        id: data.id,
        payload: data.payload,
        meta: data.meta ?? { stability: 100 },
      }, 'auto-poll');
      logger.info(`Auto-poll found visual for ${senseUid}`, undefined, 'useSynthesis');
      return true;
    }
    logger.debug(`Auto-poll: visual not ready for ${senseUid}`, undefined, 'useSynthesis');
    return false;
  } catch (err) {
    logger.error('Auto-poll error', err, 'useSynthesis');
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
  for (const delay of delays) {
    await sleep(delay);
    const found = await pollVisualOnce(senseUid, visualId);
    if (found) return;
  }
  // All 3 attempts failed — enable manual poll for this card
  autoPollExhausted.add(senseUid);
  logger.debug(`Auto-poll exhausted for ${senseUid}, manual poll enabled`, undefined, 'useSynthesis');
}

export type SynthesisState = 'idle' | 'processing' | 'processing-long' | 'success' | 'error';

export interface UseSynthesisResult {
  synthesize: (params: Omit<SynthesisRequest, 'userId'>) => Promise<void>;
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

  const synthesize = useCallback(async (params: Omit<SynthesisRequest, 'userId'>) => {
    setState('processing');
    setError(null);
    setResult(null);
    setCard(null);

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setState(prev => (prev === 'processing' ? 'processing-long' : prev));
    }, 15000);

    try {
      logger.info('Invoking synthesize-sense edge function...', params, 'useSynthesis');

      const { data, error: invokeError } = await supabase.functions.invoke('synthesize-sense', {
        body: params,
      });

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
        messageBus.send('ASSET_LOADED', response.visual, 'useSynthesis');
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

    } catch (err: any) {
      const errorMessage = err.message || 'Synthesis failed unexpectedly';
      logger.error('Synthesis error', err, 'useSynthesis');
      setError(errorMessage);
      setState('error');
    } finally {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { synthesize, state, error, result, card };
}

export default useSynthesis;
