/**
 * Detects the primary script type of a given string.
 */
export const getScriptType = (text: string): 'latin' | 'cjk' | 'rtl' | 'unknown' => {
    if (!text) return 'unknown';

    // Arabic, Hebrew, etc. (RTL)
    // Hebrew: \u0590-\u05FF, Arabic: \u0600-\u06FF, etc.
    const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFB4F\uFE70-\uFEFF]/;
    if (rtlRegex.test(text)) return 'rtl';

    // CJK (Chinese, Japanese, Korean)
    // Common CJK ranges
    const cjkRegex = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF\u3400-\u4DBF]/;
    if (cjkRegex.test(text)) return 'cjk';

    // Default to Latin
    return 'latin';
};
