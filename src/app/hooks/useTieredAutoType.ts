import { useState, useLayoutEffect, useMemo } from 'react';
import {
    predictTier,
    TEXT_TIERS,
    TIER_INDEX_MAP,
    TextTier
} from '@/utils/textTierUtils';

// ============================================================================
// HOOK
// ============================================================================

/**
 * Advanced "Tiered Auto-Type" Hook
 *
 * Strategy:
 * 1. PREDICT: Calculate ideal tier based on text length & container width (Math).
 * 2. DETECT: Check for physical overflow (Downgrade) or excessive space (Upgrade).
 * 3. CORRECT: Adjust tier if needed.
 *
 * Features:
 * - Hysteresis: Prevents oscillation between tiers.
 * - Multi-level Jump: Can skip multiple tiers if overflow is massive.
 * - ResizeObserver: Auto-adjusts when container changes size.
 */
export const useTieredAutoType = (
    text: string,
    containerRef: React.RefObject<HTMLElement>,
    customTiers?: TextTier[]
) => {
    // State to force re-renders when container resizes
    const [containerWidth, setContainerWidth] = useState<number>(300); // Default guess

    // 1. Math Prediction (The "80%" Case)
    // We memoize this "Initial Guess" so it only changes when content changes.
    // This is our anchor point.
    const initialTier = useMemo(() => {
        return predictTier(text, containerWidth, customTiers);
    }, [text, containerWidth, customTiers]);

    const [currentTier, setCurrentTier] = useState<TextTier>(initialTier);

    // Sync state when prediction changes (e.g. text changed)
    useLayoutEffect(() => {
        setCurrentTier(initialTier);
    }, [initialTier]);

    // 2. Resize Observer (Passive)
    useLayoutEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                // Debounce could be added here if needed, but for now direct update is responsive
                // Only update if width changed significantly to avoid noise
                const width = entry.contentRect.width;
                if (Math.abs(width - containerWidth) > 5) {
                    setContainerWidth(width);
                }
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [containerRef, containerWidth]);

    // 3. The "Reality Check" (The "20%" Case)
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Wait for next frame to ensure rendering happened? 
        // Usually useLayoutEffect is synchronous after DOM mutation, so metrics are ready.

        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;

        // Safety: If container is hidden or 0 metrics, do nothing.
        if (clientHeight === 0 || clientWidth === 0) return;

        const hRatio = scrollHeight / clientHeight;
        const wRatio = scrollWidth / clientWidth;

        // Peak ratio represents the tightest dimension
        const ratio = Math.max(hRatio, wRatio);

        // --- DOWNGRADE LOGIC (Overflow) ---
        if (ratio > 1.05) { // 5% tolerance for sub-pixel rounding
            // console.log(`[TieredText] Overflow detected (Ratio: ${ratio.toFixed(2)}). Downgrading.`);

            // Multi-level jump based on severity
            let jump = 1;
            if (ratio > 1.3) jump = 2; // Increased sensitivity for titles
            if (ratio > 1.8) jump = 3; 

            const activeTiers = customTiers || TEXT_TIERS;
            const activeIndexMap = customTiers ? 
                customTiers.reduce((acc, tier, index) => { acc[tier.id] = index; return acc; }, {} as Record<string, number>) : 
                TIER_INDEX_MAP;

            const currentIndex = activeIndexMap[currentTier.id] ?? 0;
            const nextIndex = Math.min(activeTiers.length - 1, currentIndex + jump);

            if (nextIndex !== currentIndex) {
                setCurrentTier(activeTiers[nextIndex]!);
            }
        }

        // --- UPGRADE LOGIC (Underflow) ---
        // Only upgrade if we have MASSIVE room (Hysteresis).
        // For titles/single lines we are more conservative.
        else if (ratio < 0.40) {
            const activeTiers = customTiers || TEXT_TIERS;
            const activeIndexMap = customTiers ? 
                customTiers.reduce((acc, tier, index) => { acc[tier.id] = index; return acc; }, {} as Record<string, number>) : 
                TIER_INDEX_MAP;

            const currentIndex = activeIndexMap[currentTier.id] ?? 0;
            const nextIndex = Math.max(0, currentIndex - 1); // Only step up 1 tier at a time to be safe

            if (nextIndex !== currentIndex) {
                setCurrentTier(activeTiers[nextIndex]!);
            }
        }

    }, [text, currentTier, containerWidth]); // Re-run whenever text, tier, or size changes

    return currentTier;
};
