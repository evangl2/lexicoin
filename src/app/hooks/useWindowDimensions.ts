import { motionValue } from 'motion/react';
import { useEffect } from 'react';

// Create singleton MotionValues for window dimensions
// Initialized safely for SSR environments
export const windowWidth = motionValue(typeof window !== 'undefined' ? window.innerWidth : 0);
export const windowHeight = motionValue(typeof window !== 'undefined' ? window.innerHeight : 0);

// Track listener attachment to avoid duplicates
let listenerCount = 0;

const updateDimensions = () => {
    if (typeof window !== 'undefined') {
        windowWidth.set(window.innerWidth);
        windowHeight.set(window.innerHeight);
    }
};

/**
 * A performance-optimized hook that provides window dimensions as MotionValues.
 *
 * Benefits:
 * 1. Zero re-renders on resize (components subscribe via useTransform)
 * 2. Single event listener shared across all consumers
 * 3. SSR safe
 */
export function useWindowDimensions() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Ensure dimensions are up to date on mount
        updateDimensions();

        if (listenerCount === 0) {
            window.addEventListener('resize', updateDimensions, { passive: true });
        }
        listenerCount++;

        return () => {
            listenerCount--;
            if (listenerCount === 0) {
                window.removeEventListener('resize', updateDimensions);
            }
        };
    }, []);

    return { windowWidth, windowHeight };
}
