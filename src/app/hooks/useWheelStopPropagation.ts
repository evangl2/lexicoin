import { useEffect, useRef } from 'react';

/**
 * Custom hook to stop wheel event propagation at the native level.
 * 
 * This prevents wheel/scroll events from bubbling up to parent elements,
 * which is useful when you want to prevent canvas zoom or other parent
 * scroll behaviors while scrolling within a specific element.
 * 
 * @returns A ref to attach to the element that should stop wheel propagation
 * 
 * @example
 * ```tsx
 * const scrollableRef = useWheelStopPropagation();
 * return <div ref={scrollableRef}>Scrollable content</div>;
 * ```
 */
export const useWheelStopPropagation = () => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const handler = (e: WheelEvent) => e.stopPropagation();
        el.addEventListener('wheel', handler, { passive: false });

        return () => el.removeEventListener('wheel', handler);
    }, []);

    return ref;
};
