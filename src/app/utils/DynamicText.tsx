import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useTextFit } from '@/app/hooks/useTextFit';
import { getScriptType } from '@/utils/scriptUtils';
import { calculateTypographyStyle } from '@/utils/typographyUtils';

export interface DynamicTextProps {
    text: string;
    className?: string;
    style?: React.CSSProperties;
    /**
     * Maximum visual lines before truncation (uses -webkit-line-clamp)
     */
    maxLines?: number;
    /**
     * Force a specific language mode strategy
     */
    mode?: 'auto' | 'latin' | 'cjk' | 'rtl';
    /**
     * Base font size set by the hook (default: 100)
     */
    baseFontSize?: number;

    /**
     * If true, applies a standard "gold" gradient compatible with the design system.
     * If a string is provided, uses that as the gradient background.
     */
    gradient?: boolean | string;

    /**
     * If true, applies a standard text shadow compatible with the design system.
     */
    shadow?: boolean;
}

/**
 * Advanced typography component that automatically scales text size, spacing,
 * and line-height based on content length and character set (CJK vs Latin).
 * Now supports Variable Fonts and ResizeObserver-based fitting.
 */
export const DynamicText: React.FC<DynamicTextProps> = ({
    text,
    className = '',
    style = {},
    maxLines,
    mode = 'auto',
    gradient = false,
    shadow = false,
    baseFontSize = 100,
}) => {
    // 1. Script Detection
    const scriptType = useMemo(() => {
        if (mode !== 'auto') return mode;
        return getScriptType(text);
    }, [text, mode]);

    // 2. Define typography resolver (for useTextFit to measure correctly)
    const resolveTypography = useMemo(() => {
        return (size: number) => {
            const style = calculateTypographyStyle(scriptType, size, baseFontSize);
            return {
                lineHeight: style.lineHeight,
                letterSpacing: style.letterSpacing
            };
        };
    }, [scriptType, baseFontSize]);

    // 3. Auto-Fit Hook
    // optimization: lower minFontSize to 9px to accommodate very long text
    const { containerRef, textRef, fontSize, isFitting } = useTextFit(text, {
        maxFontSize: baseFontSize,
        minFontSize: 9,
        step: 1,
        maxLines,
        resolveStyle: resolveTypography // Pass the resolver!
    });

    // 4. Final Render Typography
    // Recalculate based on the *actual* chosen fontSize
    const typographyStyle = useMemo(() => {
        return calculateTypographyStyle(scriptType, fontSize, baseFontSize);
    }, [scriptType, fontSize, baseFontSize]);

    // Compose styles
    const finalStyle: React.CSSProperties = {
        ...style,
        fontSize: `${fontSize}px`,
        lineHeight: typographyStyle.lineHeight,
        letterSpacing: typographyStyle.letterSpacing,
        direction: typographyStyle.direction,
        fontVariationSettings: typographyStyle.fontVariationSettings,
        opacity: isFitting ? 0 : (style.opacity ?? 1),
        // Script-specific break rules
        wordBreak: scriptType === 'cjk' ? 'break-all' : 'normal',
        textAlign: scriptType === 'rtl' ? 'right' : (style.textAlign ?? 'center'),
    };

    if (maxLines) {
        finalStyle.display = '-webkit-box';
        finalStyle.WebkitLineClamp = maxLines;
        finalStyle.WebkitBoxOrient = 'vertical';
        finalStyle.overflow = 'hidden';
    }

    // Gradient Handling
    let gradientClass = '';
    if (gradient) {
        gradientClass = 'bg-clip-text text-transparent bg-gradient-to-b';
        if (typeof gradient === 'string') {
            finalStyle.backgroundImage = gradient;
            finalStyle.backgroundClip = 'text';
            finalStyle.WebkitBackgroundClip = 'text';
            finalStyle.color = 'transparent';
        } else {
            finalStyle.backgroundImage = 'linear-gradient(to bottom, #FFD700, #B8860B)';
            finalStyle.backgroundClip = 'text';
            finalStyle.WebkitBackgroundClip = 'text';
            finalStyle.color = 'transparent';
        }
    }

    // Shadow Handling
    const shadowClass = shadow ? 'drop-shadow-sm' : '';

    return (
        <div ref={containerRef} className={`w-full h-full flex flex-col justify-center ${className} overflow-hidden`}>
            <motion.p
                ref={textRef as any}
                style={finalStyle}
                className={`
                m-0 p-0 w-full
                ${gradientClass}
                ${shadowClass}
                transition-opacity duration-200
            `}
            >
                {text}
            </motion.p>
        </div>
    );
};
