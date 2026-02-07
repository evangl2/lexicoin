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
            // If the container's scrollHeight is greater than its clientHeight,
            // it means the text content inside is pushing the boundaries.
            // We use a small buffer (1px) to avoid rounding jitter.
            const hasVerticalOverflow = container.scrollHeight > (container.clientHeight + 1);
            const hasHorizontalOverflow = container.scrollWidth > (container.clientWidth + 1);

            if (hasVerticalOverflow || hasHorizontalOverflow) return false;

            // VISUAL SAFETY CHECK:
            // Even if it technically "fits" in the box, ascenders/descenders might be clipped
            // by overflow:hidden if the fit is too tight.
            // We enforce a small safety buffer (e.g., 4px total, 2px top/bottom).
            const textRect = textEl.getBoundingClientRect();
            // Note: clientHeight doesn't include borders, which is what we want.
            const safetyBuffer = 3;
            if (textRect.height > (container.clientHeight - safetyBuffer)) return false;

            // If maxLines is set, check approximate line count.
            if (maxLines) {
                // Use computed line height for best accuracy
                const lineHeight = parseFloat(window.getComputedStyle(textEl).lineHeight || '1');
                const textHeight = textEl.scrollHeight;
                const lines = textHeight / lineHeight;

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
    }, [text, minFontSize, maxFontSize]);

    return {
        containerRef,
        textRef,
        fontSize,
        isFitting
    };
};
