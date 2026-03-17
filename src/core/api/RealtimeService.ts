import { supabase } from './supabaseClient';
import { messageBus } from '@core/protocol/MessageBus';
import { logger } from '@utils/logger';
import type { VisualEntry } from '@schemas/schemas/SenseEntity.schema';

/**
 * RealtimeService - Handles Supabase Realtime subscriptions
 * Bridges background database changes (like SVG generation) to the frontend MessageBus.
 */
class RealtimeService {
  private subscription: any = null;

  /**
   * Start listening to the sense_visuals table
   */
  init(): void {
    if (this.subscription) return;

    logger.info('Initializing Supabase Realtime for visuals...', undefined, 'RealtimeService');

    this.subscription = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'sense_visuals',
        },
        (payload) => {
          this.handleVisualChange(payload);
        }
      )
      .subscribe((status) => {
        logger.debug(`Realtime subscription status: ${status}`, undefined, 'RealtimeService');
      });
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  /**
   * Handle incoming database changes
   */
  private handleVisualChange(payload: any): void {
    const { eventType, new: newRecord } = payload;
    
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      logger.info(`Received realtime visual Update: ${newRecord.uid}/${newRecord.id}`, undefined, 'RealtimeService');
      
      // Map DB record to VisualEntry schema
      const visualEntry: VisualEntry = {
        uid: newRecord.uid,
        id: newRecord.id,
        payload: newRecord.payload,
        meta: newRecord.meta || { stability: 100 },
      };

      // Broadcast to MessageBus
      // VisualRepository and active Cards listen to this
      messageBus.send('ASSET_LOADED', visualEntry, 'RealtimeService');
    }
  }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
