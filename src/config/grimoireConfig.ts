/**
 * Grimoire Configuration & Constants
 * 
 * Defines scoring thresholds, stamina costs, and registry of grimoire types.
 * Based on GDD §3, §7, §10.
 */

import type { Grade, GrimoireType, PersonaType } from '../types/index';

// ============================================================================
// GRIMOIRE LIFECYCLE
// ============================================================================

/** How long a summoned grimoire stays active before expiring (ms). */
export const GRIMOIRE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/** Duration of the READY flash after successful grimoire summoning (ms). */
export const SUMMONER_READY_FLASH_MS = 1200;

/** UI lockout between echo extractions — prevents double-tap (ms). */
export const ECHO_EXTRACTION_COOLDOWN_MS = 1500;

/** How often the grimoire countdown timer re-renders (ms). */
export const GRIMOIRE_TIMER_UPDATE_INTERVAL_MS = 10_000;

/** Timer color breakpoints: cyan → orange at ORANGE_MS remaining, → red at RED_MS. */
export const GRIMOIRE_TIMER_WARN = {
    ORANGE_MS: 20 * 60_000,
    RED_MS:    10 * 60_000,
} as const;
export type GrimoireTimerWarn = typeof GRIMOIRE_TIMER_WARN;

/** Y offset below the summoner device where a new grimoire card spawns (world px). */
export const GRIMOIRE_SPAWN_Y_OFFSET = 200;

/** Diameter of the circular grimoire summoner device (px). */
export const SUMMONER_SIZE_PX = 300;

/** Pixel dimensions of the grimoire book card on the canvas. */
export const GRIMOIRE_CARD = { W: 120, H: 160 } as const;
export type GrimoireCard = typeof GRIMOIRE_CARD;

/** Grade reveal white flash animation parameters. */
export const GRADE_REVEAL_ANIM = { DURATION: 0.6, SCALE: 4 } as const;
export type GradeRevealAnim = typeof GRADE_REVEAL_ANIM;

/** Slot count constraints. Backend picks a number; frontend clamps to this range. */
export const GRIMOIRE_SLOT_COUNT = {
    MIN: 3,
    MAX: 6,
    DEFAULT: 4,
} as const;

/** How often useGrimoireExpiry polls for expired grimoires (ms). */
export const GRIMOIRE_EXPIRY_POLL_INTERVAL_MS = 30 * 1000;

/** Delay before removing an expired grimoire from state, allowing exit animation to play (ms). */
export const GRIMOIRE_EXPIRE_ANIMATION_DELAY_MS = 500;

// ============================================================================
// STAMINA CONFIGURATION
// ============================================================================

export const STAMINA_CONFIG = {
    MAX: 300,
    RECOVERY_PER_HOUR: 12.5,
    COSTS: {
        GENERATE_GRIMOIRE: 60,
        SYNTHESIZE_SENSE: 5,
        EVALUATE_GRIMOIRE: 0, // Included in generation cost
        ECHO: 0,              // Limited by charges, not stamina
    },
    ECHO_MAX_CHARGES: 3,
};

// ============================================================================
// SCORING & EVALUATION
// ============================================================================

/**
 * Numeric values assigned to each grade for calculation purposes.
 * Based on GDD §7.2
 */
export const GRADE_VALUES: Record<Grade, number> = {
    'S++': 8,
    'S+': 7,
    'S': 6,
    'A': 5,
    'B': 4,
    'C': 3,
    'D': 2,
    'F': 0, // F triggers a revision, not used in final average
};

/**
 * Penalty multiplier for each F grade received during the lifecycle.
 * Final Score = Original Score - (fCount * F_PENALTY_MULTIPLIER)
 */
export const F_PENALTY_MULTIPLIER = 0.3;

/**
 * Thresholds for the final calculated score to determine the final Grade.
 * Based on GDD §7.3
 */
export const FINAL_GRADE_THRESHOLDS = [
    { grade: 'S++' as Grade, min: 6.8 },
    { grade: 'S+' as Grade, min: 5.9 },
    { grade: 'S' as Grade, min: 5.2 },
    { grade: 'A' as Grade, min: 4.5 },
    { grade: 'B' as Grade, min: 3.5 },
    { grade: 'C' as Grade, min: 2.5 },
    { grade: 'D' as Grade, min: 0 },
];

/**
 * XP rewards and Mastery increments mapping.
 * Based on GDD §7.4, §7.6
 */
export const GRIMOIRE_REWARDS: Record<Grade, { xp: number; resonance: number; increments: number }> = {
    'S++': { xp: 150, resonance: 150, increments: 7 },
    'S+': { xp: 110, resonance: 110, increments: 3 },
    'S': { xp: 80, resonance: 80, increments: 1 },
    'A': { xp: 55, resonance: 55, increments: 1 },
    'B': { xp: 35, resonance: 35, increments: 1 },
    'C': { xp: 20, resonance: 20, increments: 1 },
    'D': { xp: 10, resonance: 10, increments: 1 },
    'F': { xp: 0, resonance: 0, increments: 0 },
};

// ============================================================================
// REGISTRY
// ============================================================================

export interface GrimoireTypeInfo {
    id: GrimoireType;
    label: string;
    description: string;
    targetLogic: string; // Internal hint for AI generation
}

export const GRIMOIRE_TYPES_REGISTRY: Record<GrimoireType, GrimoireTypeInfo> = {
    taxonomy: {
        id: 'taxonomy',
        label: 'Taxonomy',
        description: 'Categories and classifications of existence.',
        targetLogic: 'Focus on hierarchical relationships or categories (is-a).',
    },
    anatomy: {
        id: 'anatomy',
        label: 'Anatomy',
        description: 'Parts and structures of a single entity.',
        targetLogic: 'Focus on part-whole relationships (has-a).',
    },
    locus: {
        id: 'locus',
        label: 'Locus',
        description: 'Scenes and spatial relationships.',
        targetLogic: 'Focus on spatial or environmental co-occurrence.',
    },
    time: {
        id: 'time',
        label: 'Time',
        description: 'Events, states, and their causes or effects across the time dimension.',
        targetLogic: 'Bidirectional: seed can be Cause or Effect. Collect the opposite end.',
    },
    spectrum: {
        id: 'spectrum',
        label: 'Spectrum',
        description: 'Degrees and contrast of meaning.',
        targetLogic: 'Focus on antonyms or gradations of intensity.',
    },
    qualia: {
        id: 'qualia',
        label: 'Qualia',
        description: 'Sensory and subjective experiences.',
        targetLogic: 'Focus on sensory modalities or internal feelings.',
    },
    ritual: {
        id: 'ritual',
        label: 'Ritual',
        description: 'Processes and ritualized actions.',
        targetLogic: 'Focus on symbolic or procedural steps.',
    },
    metaphor: {
        id: 'metaphor',
        label: 'Metaphor',
        description: 'Metaphors and abstract mappings.',
        targetLogic: 'Focus on cross-domain mappings.',
    },
};
