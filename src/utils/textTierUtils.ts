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
        lineHeight: 1.2,
        tracking: '0.02em',
        weight: 600,
        opacity: 1.0,
        label: 'Headline (< 15)',
    },
    {
        id: 'statement',
        fontSize: 18,
        lineHeight: 1.35,
        tracking: '0.01em',
        weight: 500,
        opacity: 0.95,
        label: 'Statement (15-40)',
    },
    {
        id: 'body',
        fontSize: 15,
        lineHeight: 1.5,
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Pre-compiled regex for narrow characters to prevent reallocation in the hot loop
const NARROW_CHAR_REGEX = /[il1\s\.,;:'"!|()\[\]{}]/;

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
        if (NARROW_CHAR_REGEX.test(char)) {
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
export const predictTier = (text: string, containerWidth: number = 300): TextTier => {
    const vLength = getVisualLength(text);

    // "Density" = How many characters are we trying to fit per 100px of width?
    // Scale the capacity based on the actual width relative to our calibration width (300px).
    const widthRatio = containerWidth / 300;

    // Adjusted thresholds based on width
    // e.g., if width is 600px (double), thresholds act as if text is half as long.
    // Effectively: Capacity increases with width.
    const effectiveLength = vLength / (Math.max(0.5, widthRatio));

    if (effectiveLength < 15) return TEXT_TIERS[0]!; // Headline
    if (effectiveLength < 45) return TEXT_TIERS[1]!; // Statement
    if (effectiveLength < 90) return TEXT_TIERS[2]!; // Body
    if (effectiveLength < 140) return TEXT_TIERS[3]!; // Dense
    return TEXT_TIERS[4]!; // Micro
};

/**
 * Gets the next tier down (smaller). 
 * Used when overflow is detected.
 */
export const getNextSmallerTier = (currentTier: TextTier): TextTier => {
    const idx = TEXT_TIERS.findIndex(t => t.id === currentTier.id);
    if (idx === -1 || idx === TEXT_TIERS.length - 1) return currentTier; // Already smallest
    return TEXT_TIERS[idx + 1]!;
};

/**
 * Gets the next tier up (larger).
 * Used when massive underflow is detected.
 */
export const getNextLargerTier = (currentTier: TextTier): TextTier => {
    const idx = TEXT_TIERS.findIndex(t => t.id === currentTier.id);
    if (idx <= 0) return currentTier; // Already largest
    return TEXT_TIERS[idx - 1]!;
};
