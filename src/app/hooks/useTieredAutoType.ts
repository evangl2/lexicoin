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
    containerRef: React.RefObject<HTMLElement>
) => {
    // State to force re-renders when container resizes
    const [containerWidth, setContainerWidth] = useState<number>(300); // Default guess

    // 1. Math Prediction (The "80%" Case)
    // We memoize this "Initial Guess" so it only changes when content changes.
    // This is our anchor point.
    const initialTier = useMemo(() => {
        return predictTier(text, containerWidth);
    }, [text, containerWidth]);

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

        // Safety: If container is hidden or 0 height, do nothing.
        if (clientHeight === 0) return;

        const ratio = scrollHeight / clientHeight;

        // --- DOWNGRADE LOGIC (Overflow) ---
        if (ratio > 1.05) { // 5% tolerance for sub-pixel rounding
            // Multi-level jump based on severity
            let jump = 1;
            if (ratio > 1.5) jump = 2; // Massive overflow
            if (ratio > 2.0) jump = 3; // Catastrophic overflow

            const currentIndex = TIER_INDEX_MAP[currentTier.id] ?? 0;
            const nextIndex = Math.min(TEXT_TIERS.length - 1, currentIndex + jump);

            if (nextIndex !== currentIndex) {
                setCurrentTier(TEXT_TIERS[nextIndex]!);
            }
        }

        // --- UPGRADE LOGIC (Underflow) ---
        // Only upgrade if we have MASSIVE room (Hysteresis).
        // e.g., using less than 40% of the box.
        else if (ratio < 0.45) {
            const currentIndex = TIER_INDEX_MAP[currentTier.id] ?? 0;
            const nextIndex = Math.max(0, currentIndex - 1); // Only step up 1 tier at a time to be safe

            if (nextIndex !== currentIndex) {
                setCurrentTier(TEXT_TIERS[nextIndex]!);
            }
        }

    }, [text, currentTier, containerWidth]); // Re-run whenever text, tier, or size changes

    return currentTier;
};
