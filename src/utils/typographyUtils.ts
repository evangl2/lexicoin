
export type ScriptType = 'latin' | 'cjk' | 'rtl' | 'unknown';

export interface TypographyStyleResult {
    fontWeight: number;
    letterSpacing: string;
    lineHeight: number;
    direction: 'ltr' | 'rtl';
    fontVariationSettings: string;
}

/**
 * Calculates responsive typography styles (line-height, weight, spacing)
 * based on the current font size and script type.
 * 
 * @param scriptType - The detected script type (cjk, rtl, latin, etc.)
 * @param fontSize - The current font size in pixels
 * @param baseFontSize - The maximum base font size (default 100)
 */
export const calculateTypographyStyle = (
    scriptType: string,
    fontSize: number,
    baseFontSize: number = 100
): TypographyStyleResult => {
    // defaults
    let fontWeightRange: [number, number] = [400, 700]; // [min, max]
    let letterSpacing = 'normal';
    let lineHeight = 1.5;
    let direction: 'ltr' | 'rtl' = 'ltr';

    // Adaptive Scaling Factors
    // 0 (at 9px) to 1 (at 16px+)
    const densityFactor = Math.min(1, Math.max(0, (fontSize - 9) / (16 - 9)));

    // Script-specific tweaks
    switch (scriptType) {
        case 'cjk':
            // Adaptive CJK Logic
            // Small text (9px) -> tighter leading (1.3)
            // Normal text (16px) -> relaxed leading (1.6)
            lineHeight = 1.3 + (densityFactor * 0.3);

            // Small text -> reduce tracking to squeeze more in
            // 9px -> 0em, 16px -> 0.05em
            letterSpacing = `${densityFactor * 0.05}em`;

            fontWeightRange = [300, 700];
            break;

        case 'rtl':
            direction = 'rtl';
            // Arabic needs height even at small sizes
            lineHeight = 1.4 + (densityFactor * 0.3); // 1.4 to 1.7
            fontWeightRange = [400, 800];
            letterSpacing = '0em';
            break;

        case 'latin':
        default:
            // Latin adaptive
            // 9px -> 1.25 leading, 16px -> 1.5 leading
            lineHeight = 1.25 + (densityFactor * 0.25);
            // 9px -> 0.01em tracking, 16px -> 0.02em
            letterSpacing = `${0.01 + (densityFactor * 0.01)}em`;
            break;
    }

    // Dynamic Weight Calculation based on Size
    // Smaller Size -> Heavier Weight (to maintain legibility)
    const sizeRatio = (fontSize - 9) / (baseFontSize - 9);
    const inverseRatio = 1 - Math.max(0, Math.min(1, sizeRatio));

    // Lerp weight
    const rawWeight = fontWeightRange[0] + (inverseRatio * (fontWeightRange[1] - fontWeightRange[0]));
    const weight = Math.round(rawWeight);

    return {
        fontWeight: weight,
        letterSpacing,
        lineHeight,
        direction,
        fontVariationSettings: `'wght' ${weight}`
    };
};
