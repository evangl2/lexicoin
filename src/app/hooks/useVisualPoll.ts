import { useCallback, useRef } from 'react';
import { supabase } from '@core/infra/supabaseClient';
import { messageBus } from '@core/protocol/MessageBus';
import { visualRegistry } from '@core/registries/VisualRegistry';
import { logger } from '@utils/logger';

/**
 * Module-level set: senseUids where all 3 auto-polls failed.
 * Written by useSynthesis, read here to gate manual polls.
 */
export const autoPollExhausted = new Set<string>();

const MANUAL_COOLDOWN_MS = 25_000;
const MAX_MANUAL = 3;

/**
 * useVisualPoll — silent manual poll triggered by card interactions.
 *
 * Conditions to poll:
 *   1. Visual not yet in VisualRegistry
 *   2. Auto-poll chain has exhausted (all 3 failed)
 *   3. Fewer than 3 manual attempts made
 *   4. At least 25s since last manual attempt
 *
 * Usage: call onInteraction() from any card interaction handler
 * (click, drag start, hover, etc.). No UI feedback needed.
 */
export function useVisualPoll(senseUid: string, visualId = 'default') {
  const attempts = useRef(0);
  const lastAt = useRef(0);

  const onInteraction = useCallback(async () => {
    // Already loaded
    if (visualRegistry.getBestMatch(senseUid)?.payload) return;
    // Auto-poll not yet exhausted
    if (!autoPollExhausted.has(senseUid)) return;
    // Max attempts reached
    if (attempts.current >= MAX_MANUAL) return;
    // Cooldown
    if (Date.now() - lastAt.current < MANUAL_COOLDOWN_MS) return;

    attempts.current++;
    lastAt.current = Date.now();

    logger.debug(
      `Manual poll #${attempts.current} for ${senseUid}`,
      undefined,
      'useVisualPoll'
    );

    try {
      const { data } = await supabase
        .from('sense_visuals')
        .select('sense_id, id, payload, meta')
        .eq('sense_id', senseUid)
        .eq('id', visualId)
        .maybeSingle();

      // Failure sentinel: generation permanently failed, give up immediately
      if (data && data.meta?.status === 'failed') {
        logger.warn(`Manual poll: failure sentinel for ${senseUid} (${data.meta?.error}), giving up`, undefined, 'useVisualPoll');
        messageBus.send('ASSET_ERROR', {
          assetId: senseUid,
          error: data.meta.error ?? 'generation_failed',
        }, 'useVisualPoll');
        return;
      }

      if (data?.payload && data.payload !== 'VISUAL_GENERATION_FAILED') {
        messageBus.send('ASSET_LOADED', {
          uid: data.sense_id,
          id: data.id,
          payload: data.payload,
          meta: data.meta ?? { stability: 100 },
        }, 'useVisualPoll');
        logger.info(`Manual poll found visual for ${senseUid}`, undefined, 'useVisualPoll');
        return;
      }
    } catch (err) {
      logger.error('Manual visual poll failed', err, 'useVisualPoll');
    }

    // Last attempt also failed — give up, fall back to static visual
    if (attempts.current >= MAX_MANUAL) {
      messageBus.send('ASSET_ERROR', {
        assetId: senseUid,
        error: 'visual_generation_failed',
      }, 'useVisualPoll');
      logger.warn(`Visual permanently unavailable for ${senseUid}, using fallback`, undefined, 'useVisualPoll');
    }
  }, [senseUid, visualId]);

  return { onInteraction };
}
