/**
 * RealtimeService - Placeholder (Realtime disabled for sense_visuals)
 *
 * Visual updates are delivered via polling instead:
 *   - Auto-poll: useSynthesis polls once ~25s after synthesis
 *   - Manual poll: useVisualPoll hook (60s cooldown, max 3 attempts per card)
 *
 * Kept as a stub so moduleInit.ts doesn't need to change.
 */
class RealtimeService {
  init(): void {
    // No-op: Realtime disabled in favor of polling
  }

  stop(): void {
    // No-op
  }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
