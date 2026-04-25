import { useState, useEffect, useRef, useLayoutEffect } from 'react';

interface TextFitOptions {
    minFontSize?: number;
    maxFontSize?: number;
    step?: number;
    maxLines?: number;
    /**
     * Optional callback to resolve additional styles (like line-height, letter-spacing)
     * based on the current font size being tested.
     * This ensures the measurement accurately reflects the final render.
     */
    resolveStyle?: (fontSize: number) => Partial<CSSStyleDeclaration> | React.CSSProperties;
}

/**
 * Hook to automatically scale text to fit within its container.
 * Uses a binary search approach for efficiency.
 */
export const useTextFit = (
    text: string,
    options: TextFitOptions = {} // Renamed 'mode' to avoid conflict, relying on explicit options
) => {
    const {
        minFontSize = 10,
        maxFontSize = 100,
        step = 0.5,
        maxLines,
        resolveStyle
    } = options;

    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [fontSize, setFontSize] = useState<number>(maxFontSize);
    const [isFitting, setIsFitting] = useState(true);

    // ResizeObserver to re-run fitting when container changes
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(() => {
            // Debounce or just trigger re-fit
            fitText();
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [text, minFontSize, maxFontSize, maxLines, resolveStyle]);

    // The simplified binary fit algorithm
    const fitText = () => {
        const container = containerRef.current;
        const textEl = textRef.current;
        if (!container || !textEl) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // CRITICAL FIX: If container has no dimension (e.g. hidden or initializing inside AnimatePresence),
        // abort fitting. Returning "false" in checkFit would cause binary search to collapse to minFontSize.
        // Instead, we just do nothing and wait for ResizeObserver to fire when valid dimensions exist.
        if (containerHeight === 0 || containerWidth === 0) {
            return;
        }

        // Cache lineHeight once if maxLines is used, as it's unlikely to change proportionally 
        // in a way that breaks this fit logic during the binary search.
        let cachedLineHeight = 0;
        if (maxLines) {
            cachedLineHeight = parseFloat(window.getComputedStyle(textEl).lineHeight || '0');
            // If lineHeight is 'normal' or 0, fallback to a reasonable estimate based on font size
            // but for now we'll assume it's defined in the persona.
        }

        let min = minFontSize;
        let max = maxFontSize;

        // Helper to check if text fits
        const checkFit = (size: number) => {
            textEl.style.fontSize = `${size}px`;

            // Apply custom style resolution (e.g. dynamic line-height)
            if (resolveStyle) {
                const customStyles = resolveStyle(size);
                Object.assign(textEl.style, customStyles);
            }

            // Revert to container overflow check.
            // We use a small buffer (1px) to avoid rounding jitter.
            const hasVerticalOverflow = textEl.scrollHeight > (containerHeight + 1);
            const hasHorizontalOverflow = textEl.scrollWidth > (containerWidth + 1);

            if (hasVerticalOverflow || hasHorizontalOverflow) return false;

            // VISUAL SAFETY CHECK:
            // Even if it technically "fits" in the box, ascenders/descenders might be clipped
            // by overflow:hidden if the fit is too tight.
            const textHeight = textEl.offsetHeight;
            const safetyBuffer = 0;
            if (textHeight > (containerHeight - safetyBuffer)) return false;

            // If maxLines is set, check approximate line count.
            if (maxLines && cachedLineHeight > 0) {
                const currentScrollHeight = textEl.scrollHeight;
                const lines = currentScrollHeight / cachedLineHeight;

                // Use a small buffer (0.1) for float comparison
                if (lines > maxLines + 0.1) return false;
            }

            return true;
        };

        // Binary search
        while (max - min > step) {
            const mid = (max + min) / 2;
            if (checkFit(mid)) {
                min = mid;
            } else {
                max = mid;
            }
        }

        setFontSize(Math.max(min, minFontSize));
        setIsFitting(false);
    };

    useLayoutEffect(() => {
        fitText();

        // Multi-stage retry strategy to handle complex animation states.
        // Spring animations (framer-motion) can take variable time to settle.
        // Failing to catch the final state results in permanent small text.
        const timeouts: NodeJS.Timeout[] = [];
        const delays = [50, 150, 300, 500];

        delays.forEach(delay => {
            const timeout = setTimeout(() => {
                // Only retry if we suspect sub-optimal fit (optional optimization, 
                // but here we just force it to be safe)
                fitText();
            }, delay);
            timeouts.push(timeout);
        });

        return () => {
            timeouts.forEach(t => clearTimeout(t));
        };
    }, [text, minFontSize, maxFontSize]);

    return {
        containerRef,
        textRef,
        fontSize,
        isFitting
    };
};
