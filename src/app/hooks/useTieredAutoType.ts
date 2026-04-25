import { useState, useLayoutEffect, useMemo, useRef } from 'react';
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
    // Ref to track container width without triggering re-renders
    const containerWidthRef = useRef<number>(300);
    const [checkNonce, setCheckNonce] = useState(0);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 1. Math Prediction (The "80%" Case)
    // Initialize with a prediction based on current (ref) width.
    const [currentTier, setCurrentTier] = useState<TextTier>(() => 
        predictTier(text, containerWidthRef.current, customTiers)
    );
    const currentTierRef = useRef(currentTier);
    currentTierRef.current = currentTier;

    // Sync state when text or tiers change
    useLayoutEffect(() => {
        const predicted = predictTier(text, containerWidthRef.current, customTiers);
        setCurrentTier(predicted);
    }, [text, customTiers]);

    // 2. Resize Observer (Passive)
    useLayoutEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[entries.length - 1]!.contentRect.width;
            
            // Debounce: during canvas zoom the card resizes every frame.
            if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                // Only act if width change is significant (> 5px)
                if (Math.abs(width - containerWidthRef.current) > 5) {
                    containerWidthRef.current = width;
                    
                    // Run prediction first
                    const predicted = predictTier(text, width, customTiers);
                    if (predicted.id !== currentTierRef.current.id) {
                        // Changing currentTier will naturally trigger the "Reality Check" effect below
                        setCurrentTier(predicted);
                    } else {
                        // Predicted tier is same, but we still need to check for overflow
                        // at this new width. Force the Reality Check effect to run.
                        setCheckNonce(c => c + 1);
                    }
                }
            }, 100);
        });

        observer.observe(containerRef.current);
        return () => {
            observer.disconnect();
            if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
        };
    }, [containerRef, text, customTiers]);

    // 3. The "Reality Check" (The "20%" Case)
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

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
            // Multi-level jump based on severity
            let jump = 1;
            if (ratio > 1.3) jump = 2; 
            if (ratio > 1.8) jump = 3; 

            const activeTiers = customTiers || TEXT_TIERS;
            const activeIndexMap = customTiers ? 
                customTiers.reduce((acc, tier, index) => { acc[tier.id] = index; return acc; }, {} as Record<string, number>) : 
                TIER_INDEX_MAP;

            const currentIndex = activeIndexMap[currentTierRef.current.id] ?? 0;
            const nextIndex = Math.min(activeTiers.length - 1, currentIndex + jump);

            if (nextIndex !== currentIndex) {
                setCurrentTier(activeTiers[nextIndex]!);
            }
        }

        // --- UPGRADE LOGIC (Underflow) ---
        else if (ratio < 0.40) {
            const activeTiers = customTiers || TEXT_TIERS;
            const activeIndexMap = customTiers ? 
                customTiers.reduce((acc, tier, index) => { acc[tier.id] = index; return acc; }, {} as Record<string, number>) : 
                TIER_INDEX_MAP;

            const currentIndex = activeIndexMap[currentTierRef.current.id] ?? 0;
            const nextIndex = Math.max(0, currentIndex - 1); 

            if (nextIndex !== currentIndex) {
                setCurrentTier(activeTiers[nextIndex]!);
            }
        }

    }, [text, currentTier, checkNonce, customTiers]); 
 // currentTier removed — read via ref to prevent oscillation

    return currentTier;
};
