import { useCallback, useEffect, useMemo } from 'react';
import { useMotionValue, animate, MotionValue } from "motion/react";

export const useCanvasCamera = () => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const scale = useMotionValue(1);

    // Initial Center
    useEffect(() => {
        x.set(window.innerWidth / 2);
        y.set(window.innerHeight / 2);
    }, []);

    const centerCamera = useCallback(() => {
        // Stop any ongoing animations
        x.stop();
        y.stop();
        scale.stop();

        // Animate to center
        animate(x, window.innerWidth / 2, { type: "spring", stiffness: 200, damping: 20 });
        animate(y, window.innerHeight / 2, { type: "spring", stiffness: 200, damping: 20 });
        animate(scale, 1, { type: "spring", stiffness: 200, damping: 20 });
    }, [x, y, scale]);

    const flyTo = useCallback((targetX: number, targetY: number, targetScale: number) => {
        animate(x, targetX, { type: "spring", stiffness: 100, damping: 20 });
        animate(y, targetY, { type: "spring", stiffness: 100, damping: 20 });
        animate(scale, targetScale, { type: "spring", stiffness: 100, damping: 20 });
    }, [x, y, scale]);

    return useMemo(() => ({
        x,
        y,
        scale,
        centerCamera,
        flyTo
    }), [x, y, scale, centerCamera, flyTo]);
};
