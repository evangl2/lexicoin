import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { useTieredAutoType } from '@/app/hooks/useTieredAutoType';
import { TextTier } from '@/utils/textTierUtils';

interface TieredTextProps {
    text: string;
    className?: string;
    style?: React.CSSProperties;
    /**
     * Optional gradient color for the text.
     */
    gradient?: string;
    /**
     * Optional text shadow.
     */
    shadow?: string;
    /**
     * Optional custom text tiers for responsive sizing.
     */
    tiers?: TextTier[];
}

export const TieredText: React.FC<TieredTextProps> = React.memo(function TieredText({
    text,
    className = '',
    style = {},
    gradient,
    shadow,
    tiers
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tier: TextTier = useTieredAutoType(text, containerRef, tiers);

    // Merge styles
    const tierStyle: React.CSSProperties = {
        fontSize: `${tier.fontSize}px`,
        lineHeight: tier.lineHeight,
        letterSpacing: tier.tracking,
        fontWeight: tier.weight,
        opacity: tier.opacity,
        ...style // Allow overrides
    };

    // Gradient Handling
    if (gradient) {
        tierStyle.backgroundImage = gradient;
        tierStyle.WebkitBackgroundClip = 'text';
        tierStyle.WebkitTextFillColor = 'transparent';
        tierStyle.backgroundClip = 'text';
        tierStyle.color = 'transparent';
    }

    if (shadow) {
        tierStyle.textShadow = shadow;
    }

    return (
        <div
            ref={containerRef}
            className={`w-full h-full flex items-center justify-center overflow-hidden ${className}`}
        >
            <motion.p
                // Re-mount on text change to restart animations if needed
                key={text}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                style={tierStyle}
                className="text-center w-full break-words whitespace-pre-wrap p-0.5"
            >
                {text}
            </motion.p>
        </div>
    );
});
