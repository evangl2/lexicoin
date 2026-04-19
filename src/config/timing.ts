/** Delay before synthesis transitions from 'processing' to 'processing-long' state (ms) */
export const SYNTHESIS_LONG_STATE_DELAY_MS = 15000;
export type SynthesisLongStateDelayMs = typeof SYNTHESIS_LONG_STATE_DELAY_MS;

/** Step timestamps for the grimoire reward cinematic sequence */
export const REWARD_CINEMATIC = {
    INTRO_MS: 1000,
    TALLY_MS: 3000,
    ECHO_MS:  5500,
} as const;
export type RewardCinematic = typeof REWARD_CINEMATIC;

/** Delays between visual generation auto-poll attempts: 25s → 25s → 50s */
export const SYNTHESIS_POLL_DELAYS_MS = [25_000, 25_000, 50_000] as const;

/** Hard ceiling on a single synthesis attempt; frees the circle if the edge function hangs */
export const SYNTHESIS_HARD_TIMEOUT_MS = 90_000;
