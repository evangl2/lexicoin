/**
 * Utility functions for the Tiered Flavor Text Strategy.
 * Handles visual length calculation (CJK vs Latin) and Tier definitions.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TextTier {
    id: string;
    fontSize: number;    // px
    lineHeight: number;  // unitless (e.g., 1.4)
    tracking: string;    // em (e.g., '0.02em')
    weight: number;      // 400, 500, 600
    opacity: number;     // 0.8 - 1.0
    label: string;       // Debug label
}

// ============================================================================
// TIER DEFINITIONS (The "80%" Preset)
// ============================================================================
// Calibrated for a standard flavor box width (approx 280-300px).
// Dynamic scaling will adjust the threshold, but these are the base styles.

export const TEXT_TIERS: TextTier[] = [
    {
        id: 'headline',
        fontSize: 24,
        lineHeight: 1.1,
        tracking: '0.02em',
        weight: 600,
        opacity: 1.0,
        label: 'Headline (< 15)',
    },
    {
        id: 'statement',
        fontSize: 18,
        lineHeight: 1.25,
        tracking: '0.01em',
        weight: 500,
        opacity: 0.95,
        label: 'Statement (15-40)',
    },
    {
        id: 'body',
        fontSize: 15,
        lineHeight: 1.4,
        tracking: '0em',
        weight: 400,
        opacity: 0.9,
        label: 'Body (40-80)',
    },
    {
        id: 'dense',
        fontSize: 13,
        lineHeight: 1.55,
        tracking: '-0.01em',
        weight: 400,
        opacity: 0.85,
        label: 'Dense (80-120)',
    },
    {
        id: 'micro',
        fontSize: 11, // Absolute integer minimum to avoid blurriness
        lineHeight: 1.6,
        tracking: '0em',
        weight: 500, // Thicker to maintain legibility at small sizes
        opacity: 0.8,
        label: 'Micro (> 120)',
    },
];

// Pre-computed map for O(1) tier index lookups
export const TIER_INDEX_MAP: Record<string, number> = TEXT_TIERS.reduce((acc, tier, index) => {
    acc[tier.id] = index;
    return acc;
}, {} as Record<string, number>);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Pre-compiled set for O(1) lookups in high-frequency text tier calculations.
// Replaces expensive regex compilation and matching for narrow characters.
const NARROW_CHARS = new Set(['i', 'l', '1', ' ', '\t', '\n', '\r', '.', ',', ';', ':', "'", '"', '!', '|', '(', ')', '[', ']', '{', '}']);

/**
 * Calculates the "Visual Length" of a string.
 * Supports a wide range of scripts and emojis.
 */
export const getVisualLength = (text: string): number => {
    if (!text) return 0;

    let length = 0;
    // content of text is iterated by code point, handling surrogate pairs automatically
    for (const char of text) {
        const code = char.codePointAt(0);
        if (!code) continue;

        // 1. Zero Width Characters (Combining marks, control chars) 
        // approximate ranges for common combining diacritics
        if ((code >= 0x0300 && code <= 0x036F) || // Combining Diacritical Marks
            (code >= 0x1AB0 && code <= 0x1AFF) || // Combining Diacritical Marks Extended
            (code >= 0x200B && code <= 0x200F) || // Zero Width Space/Joiners
            (code >= 0xFE00 && code <= 0xFE0F)) { // Variation Selectors
            continue;
        }

        // 2. Wide Characters (CJK, Fullwidth, Emojis) ~ 1.8 units
        if (
            (code >= 0x2E80 && code <= 0x9FFF) || // CJK Radicals / Ideographs
            (code >= 0xF900 && code <= 0xFAFF) || // CJK Compatibility Ideographs
            (code >= 0xFE30 && code <= 0xFE4F) || // CJK Compatibility Forms
            (code >= 0xFF00 && code <= 0xFFEF) || // Fullwidth Forms
            (code >= 0x1F300 && code <= 0x1F9FF) || // Misc Symbols and Pictographs (Emojis)
            (code >= 0x1F600 && code <= 0x1F64F) || // Emoticons
            (code >= 0x1F680 && code <= 0x1F6FF)    // Transport and Map Symbols
        ) {
            length += 1.8;
            continue;
        }

        // 3. Narrow Characters (Latin narrow, punctuation) ~ 0.5 units
        if (NARROW_CHARS.has(char)) {
            length += 0.5;
            continue;
        }

        // 4. Complex Scripts (Arabic, Hebrew, Thai, Devanagari) ~ 1.0 units (Standard)
        // Most other scripts fall here. 
        // Thai/Lao might be slightly narrower visually due to stacking, but 1.0 is safe.
        // Arabic/Hebrew flow differently but unit width is roughly comparable to Latin wide chars.

        // 5. Standard Latin / Cyrillic / Greek / Digits ~ 1.0 units
        length += 1.0;
    }
    return length;
};

/**
 * Predicts the optimal Tier based on text length and container width.
 * 
 * @param text The content string
 * @param containerWidthWidth of the container in pixels. Default 300px (approx standard card).
 * @returns The TextTier object
 */
export const predictTier = (text: string, containerWidth: number = 300, customTiers?: TextTier[]): TextTier => {
    const vLength = getVisualLength(text);

    // "Density" = How many characters are we trying to fit per 100px of width?
    const widthRatio = containerWidth / 300;
    const effectiveLength = vLength / (Math.max(0.5, widthRatio));

    const activeTiers = customTiers || TEXT_TIERS;
    
    // Default prediction logic thresholds mapped proportionally to available tiers
    const step = 80 / Math.max(1, activeTiers.length - 1);
    
    for (let i = 0; i < activeTiers.length - 1; i++) {
        // Reduced thresholds for single-line titles vs multi-line paragraphs
        const threshold = i === 0 ? 8 : (i === 1 ? 16 : (i === 2 ? 30 : 60)); 
        const dynamicThreshold = customTiers ? 8 + (i * step) : threshold;
        
        if (effectiveLength < dynamicThreshold) return activeTiers[i]!;
    }
    
    return activeTiers[activeTiers.length - 1]!;
};

/**
 * Gets the next tier down (smaller). 
 * Used when overflow is detected.
 */
export const getNextSmallerTier = (currentTier: TextTier): TextTier => {
    const idx = TIER_INDEX_MAP[currentTier.id];
    if (idx === undefined || idx === TEXT_TIERS.length - 1) return currentTier; // Already smallest
    return TEXT_TIERS[idx + 1]!;
};

/**
 * Gets the next tier up (larger).
 * Used when massive underflow is detected.
 */
export const getNextLargerTier = (currentTier: TextTier): TextTier => {
    const idx = TIER_INDEX_MAP[currentTier.id];
    if (idx === undefined || idx <= 0) return currentTier; // Already largest
    return TEXT_TIERS[idx - 1]!;
};
