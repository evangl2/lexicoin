import { useState, useRef, useEffect } from 'react';
import { MotionValue } from 'motion/react';

export type LODLevel = 'low' | 'medium' | 'high';

// Thresholds with hysteresis
const THRESHOLDS = {
    LOW_TO_MEDIUM: 0.42,
    MEDIUM_TO_LOW: 0.38,
    MEDIUM_TO_HIGH: 0.72,
    HIGH_TO_MEDIUM: 0.68,
};

/**
 * Hook to determine the Level of Detail (LOD) for Grimoire rendering.
 * Implements hysteresis to prevent flickering at threshold boundaries.
 */
export const useGrimoireLOD = (canvasScale: MotionValue<number>): LODLevel => {
    const getInitialLevel = (s: number): LODLevel => {
        if (s < THRESHOLDS.MEDIUM_TO_LOW) return 'low';
        if (s < THRESHOLDS.HIGH_TO_MEDIUM) return 'medium';
        return 'high';
    };

    const currentLevelRef = useRef<LODLevel>(getInitialLevel(canvasScale.get()));
    const [lod, setLOD] = useState<LODLevel>(currentLevelRef.current);

    useEffect(() => {
        const check = (v: number) => {
            let nextLevel = currentLevelRef.current;

            if (currentLevelRef.current === 'low' && v > THRESHOLDS.LOW_TO_MEDIUM) {
                nextLevel = 'medium';
            } else if (currentLevelRef.current === 'medium') {
                if (v < THRESHOLDS.MEDIUM_TO_LOW) {
                    nextLevel = 'low';
                } else if (v > THRESHOLDS.MEDIUM_TO_HIGH) {
                    nextLevel = 'high';
                }
            } else if (currentLevelRef.current === 'high' && v < THRESHOLDS.HIGH_TO_MEDIUM) {
                nextLevel = 'medium';
            }

            if (nextLevel !== currentLevelRef.current) {
                currentLevelRef.current = nextLevel;
                setLOD(nextLevel);
            }
        };

        check(canvasScale.get());
        return canvasScale.on('change', check);
    }, [canvasScale]);

    return lod;
};
