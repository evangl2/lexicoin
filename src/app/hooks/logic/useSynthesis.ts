import { useState, useCallback, useRef } from 'react';
import { supabase } from '@core/api/supabaseClient';
import { messageBus } from '@core/protocol/MessageBus';
import { logger } from '@utils/logger';
import { senseToCard } from '@/pipelines/senseToCard';
import type { SynthesisRequest, SynthesisResponse } from '@app-types/api';
import type { CardEntity } from '@app-types/CardEntity';

export type SynthesisState = 'idle' | 'processing' | 'processing-long' | 'success' | 'error';

export interface UseSynthesisResult {
  synthesize: (params: Omit<SynthesisRequest, 'userId'>) => Promise<void>;
  state: SynthesisState;
  error: string | null;
  result: SynthesisResponse | null;
  card: CardEntity | null;
}

/**
 * useSynthesis - Hook for orchestrating the synthesis Edge Function
 * Manages states, timeouts, and data synchronization.
 */
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

    // 15s timer for 'processing-long' feedback
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

      const response = data as SynthesisResponse;
      
      // Transform to UI card
      const newCard = senseToCard(response.sense, 0);

      // Broadcast success to system
      // 1. New Sense -> Persisted by SenseRepository, Added to Canvas by useCardManager
      messageBus.send('SENSE_CREATED', response.sense, 'useSynthesis');

      // 2. New Visual -> Persisted by VisualRepository
      if (response.visual) {
        messageBus.send('ASSET_LOADED', response.visual, 'useSynthesis');
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

  return {
    synthesize,
    state,
    error,
    result,
    card,
  };
}

export default useSynthesis;
